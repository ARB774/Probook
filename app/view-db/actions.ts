"use server";

import { Pool, type PoolClient } from "pg";
import type {
  ColumnMetadata,
  DatabaseRow,
  DatabaseTarget,
  MutationResult,
  TablePageResult,
  TablesResult
} from "@/app/view-db/types";

const PAGE_SIZE_MIN = 5;
const PAGE_SIZE_MAX = 100;
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertViewerEnabled() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("view-db доступен только при локальном запуске.");
  }
}

function getConnectionString(target: DatabaseTarget) {
  if (target === "local") {
    return process.env.LOCAL_DATABASE_URL;
  }

  if (target === "production") {
    return process.env.DATABASE_URL;
  }

  return undefined;
}

function targetLabel(target: DatabaseTarget) {
  return target === "local" ? "локальной" : "рабочей";
}

function quoteIdentifier(identifier: string) {
  if (!IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error("Недопустимое имя таблицы или столбца.");
  }

  return `"${identifier.replaceAll('"', '""')}"`;
}

async function withDatabase<T>(
  target: DatabaseTarget,
  operation: (client: PoolClient) => Promise<T>
) {
  assertViewerEnabled();
  const connectionString = getConnectionString(target);

  if (!connectionString) {
    throw new Error(
      `Строка подключения для ${targetLabel(target)} БД не настроена.`
    );
  }

  const pool = new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 5_000
  });

  const client = await pool.connect();

  try {
    return await operation(client);
  } finally {
    client.release();
    await pool.end();
  }
}

function safeError(error: unknown) {
  console.error("view-db operation failed:", error);
  return error instanceof Error
    ? error.message.replace(/postgresql:\/\/[^\s]+/gi, "[connection hidden]")
    : "Неизвестная ошибка базы данных.";
}

async function assertTableExists(client: PoolClient, table: string) {
  quoteIdentifier(table);
  const result = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_type = 'BASE TABLE'
         AND table_name = $1
         AND table_name <> '_prisma_migrations'
     ) AS "exists"`,
    [table]
  );

  if (!result.rows[0]?.exists) {
    throw new Error("Таблица не найдена или недоступна для просмотра.");
  }
}

async function loadColumns(client: PoolClient, table: string) {
  await assertTableExists(client, table);

  const [columnsResult, primaryResult] = await Promise.all([
    client.query<{
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: "YES" | "NO";
      column_default: string | null;
      is_identity: "YES" | "NO";
      is_generated: string;
    }>(
      `SELECT
         column_name,
         data_type,
         udt_name,
         is_nullable,
         column_default,
         is_identity,
         is_generated
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`,
      [table]
    ),
    client.query<{ column_name: string }>(
      `SELECT kcu.column_name
       FROM information_schema.table_constraints tc
       JOIN information_schema.key_column_usage kcu
         ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
       WHERE tc.table_schema = 'public'
         AND tc.table_name = $1
         AND tc.constraint_type = 'PRIMARY KEY'
       ORDER BY kcu.ordinal_position`,
      [table]
    )
  ]);

  const primaryColumns = new Set(
    primaryResult.rows.map((column) => column.column_name)
  );

  return columnsResult.rows.map<ColumnMetadata>((column) => ({
    name: column.column_name,
    dataType:
      column.data_type === "USER-DEFINED" ? column.udt_name : column.data_type,
    nullable: column.is_nullable === "YES",
    defaultValue: column.column_default,
    identity: column.is_identity === "YES",
    generated: column.is_generated !== "NEVER",
    primary: primaryColumns.has(column.column_name)
  }));
}

function serializeValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return value.toString("base64");
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function serializeRow(
  row: Record<string, unknown>,
  primaryColumns: ColumnMetadata[]
): DatabaseRow {
  const values = Object.fromEntries(
    Object.entries(row).map(([name, value]) => [name, serializeValue(value)])
  );
  const key = Object.fromEntries(
    primaryColumns.map((column) => [
      column.name,
      serializeValue(row[column.name])
    ])
  );

  return { values, key };
}

function normalizeInput(value: string, column: ColumnMetadata) {
  if (value === "" && column.nullable) {
    return null;
  }

  return value;
}

function editableColumnMap(columns: ColumnMetadata[], includePrimary: boolean) {
  return new Map(
    columns
      .filter(
        (column) =>
          !column.identity &&
          !column.generated &&
          (includePrimary || !column.primary)
      )
      .map((column) => [column.name, column])
  );
}

export async function listDatabaseTables(
  target: DatabaseTarget
): Promise<TablesResult> {
  try {
    const tables = await withDatabase(target, async (client) => {
      const result = await client.query<{ table_name: string }>(
        `SELECT table_name
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_type = 'BASE TABLE'
           AND table_name <> '_prisma_migrations'
         ORDER BY table_name`
      );

      return result.rows.map((row) => ({ name: row.table_name }));
    });

    return { ok: true, tables };
  } catch (error) {
    return { ok: false, error: safeError(error) };
  }
}

export async function getTablePage(
  target: DatabaseTarget,
  table: string,
  requestedPage = 1,
  requestedPageSize = 20
): Promise<TablePageResult> {
  try {
    const data = await withDatabase(target, async (client) => {
      const columns = await loadColumns(client, table);
      const quotedTable = quoteIdentifier(table);
      const pageSize = Math.min(
        PAGE_SIZE_MAX,
        Math.max(PAGE_SIZE_MIN, Math.trunc(requestedPageSize))
      );
      const countResult = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS "count" FROM ${quotedTable}`
      );
      const totalRows = Number(countResult.rows[0]?.count ?? 0);
      const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
      const page = Math.min(
        totalPages,
        Math.max(1, Math.trunc(requestedPage))
      );
      const primaryColumns = columns.filter((column) => column.primary);
      const orderColumns =
        primaryColumns.length > 0 ? primaryColumns : columns.slice(0, 1);
      const orderClause = orderColumns.length
        ? ` ORDER BY ${orderColumns
            .map((column) => quoteIdentifier(column.name))
            .join(", ")}`
        : "";
      const offset = (page - 1) * pageSize;
      const rowsResult = await client.query<Record<string, unknown>>(
        `SELECT * FROM ${quotedTable}${orderClause} LIMIT $1 OFFSET $2`,
        [pageSize, offset]
      );

      return {
        table,
        columns,
        rows: rowsResult.rows.map((row) =>
          serializeRow(row, primaryColumns)
        ),
        page,
        pageSize,
        totalRows,
        totalPages,
        canMutate: primaryColumns.length > 0
      };
    });

    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: safeError(error) };
  }
}

export async function createDatabaseRow(
  target: DatabaseTarget,
  table: string,
  input: Record<string, string>
): Promise<MutationResult> {
  try {
    await withDatabase(target, async (client) => {
      const columns = await loadColumns(client, table);
      const allowed = editableColumnMap(columns, true);
      const entries = Object.entries(input).filter(([name, value]) => {
        const column = allowed.get(name);
        return Boolean(column) && !(value === "" && column?.defaultValue);
      });
      const quotedTable = quoteIdentifier(table);

      if (entries.length === 0) {
        await client.query(`INSERT INTO ${quotedTable} DEFAULT VALUES`);
        return;
      }

      const names = entries.map(([name]) => quoteIdentifier(name));
      const values = entries.map(([name, value]) =>
        normalizeInput(value, allowed.get(name)!)
      );
      const placeholders = entries.map((_, index) => `$${index + 1}`);

      await client.query(
        `INSERT INTO ${quotedTable} (${names.join(", ")})
         VALUES (${placeholders.join(", ")})`,
        values
      );
    });

    return { ok: true, message: "Строка создана." };
  } catch (error) {
    return { ok: false, error: safeError(error) };
  }
}

export async function updateDatabaseRow(
  target: DatabaseTarget,
  table: string,
  key: Record<string, string | null>,
  input: Record<string, string>
): Promise<MutationResult> {
  try {
    await withDatabase(target, async (client) => {
      const columns = await loadColumns(client, table);
      const primaryColumns = columns.filter((column) => column.primary);

      if (primaryColumns.length === 0) {
        throw new Error("Редактирование требует первичного ключа.");
      }

      const allowed = editableColumnMap(columns, false);
      const entries = Object.entries(input).filter(([name]) => allowed.has(name));

      if (entries.length === 0) {
        throw new Error("Нет доступных полей для изменения.");
      }

      const values = entries.map(([name, value]) =>
        normalizeInput(value, allowed.get(name)!)
      );
      const setClause = entries
        .map(
          ([name], index) => `${quoteIdentifier(name)} = $${index + 1}`
        )
        .join(", ");
      const whereClause = primaryColumns
        .map((column, index) => {
          values.push(key[column.name] ?? null);
          return `${quoteIdentifier(column.name)} IS NOT DISTINCT FROM $${
            entries.length + index + 1
          }`;
        })
        .join(" AND ");
      const result = await client.query(
        `UPDATE ${quoteIdentifier(table)}
         SET ${setClause}
         WHERE ${whereClause}`,
        values
      );

      if (result.rowCount !== 1) {
        throw new Error("Строка не найдена или была изменена другим процессом.");
      }
    });

    return { ok: true, message: "Строка обновлена." };
  } catch (error) {
    return { ok: false, error: safeError(error) };
  }
}

export async function deleteDatabaseRow(
  target: DatabaseTarget,
  table: string,
  key: Record<string, string | null>
): Promise<MutationResult> {
  try {
    await withDatabase(target, async (client) => {
      const columns = await loadColumns(client, table);
      const primaryColumns = columns.filter((column) => column.primary);

      if (primaryColumns.length === 0) {
        throw new Error("Удаление требует первичного ключа.");
      }

      const values = primaryColumns.map((column) => key[column.name] ?? null);
      const whereClause = primaryColumns
        .map(
          (column, index) =>
            `${quoteIdentifier(column.name)} IS NOT DISTINCT FROM $${index + 1}`
        )
        .join(" AND ");
      const result = await client.query(
        `DELETE FROM ${quoteIdentifier(table)} WHERE ${whereClause}`,
        values
      );

      if (result.rowCount !== 1) {
        throw new Error("Строка не найдена или уже удалена.");
      }
    });

    return { ok: true, message: "Строка удалена." };
  } catch (error) {
    return { ok: false, error: safeError(error) };
  }
}
