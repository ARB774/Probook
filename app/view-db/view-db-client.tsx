"use client";

import { useState, type FormEvent } from "react";
import {
  createDatabaseRow,
  deleteDatabaseRow,
  getTablePage,
  listDatabaseTables,
  updateDatabaseRow
} from "@/app/view-db/actions";
import type {
  ColumnMetadata,
  DatabaseRow,
  DatabaseTable,
  DatabaseTarget,
  TablePage
} from "@/app/view-db/types";

type EditorState =
  | { mode: "create" }
  | { mode: "edit"; row: DatabaseRow }
  | null;

type Props = {
  configured: Record<DatabaseTarget, boolean>;
};

function isLongField(column: ColumnMetadata) {
  return ["text", "json", "jsonb", "bytea"].includes(column.dataType);
}

function databaseLabel(target: DatabaseTarget) {
  return target === "local" ? "Локальная БД" : "Рабочая БД";
}

function cellValue(value: string | null) {
  if (value === null) {
    return <span className="db-null">NULL</span>;
  }

  return value;
}

export function ViewDbClient({ configured }: Props) {
  const firstTarget: DatabaseTarget = configured.local ? "local" : "production";
  const [target, setTarget] = useState<DatabaseTarget>(firstTarget);
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [tablePage, setTablePage] = useState<TablePage | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>(null);

  function resetMessages() {
    setMessage(null);
    setError(null);
  }

  async function connect() {
    resetMessages();
    setPending(true);
    setTablePage(null);

    const result = await listDatabaseTables(target);
    if (result.ok) {
      setTables(result.tables);
      setMessage(
        `Подключено: ${databaseLabel(target)}. Таблиц: ${result.tables.length}.`
      );
    } else {
      setTables([]);
      setError(result.error);
    }

    setPending(false);
  }

  async function openTable(
    table: string,
    page = 1,
    pageSize = tablePage?.pageSize ?? 20
  ) {
    resetMessages();
    setPending(true);
    const result = await getTablePage(target, table, page, pageSize);

    if (result.ok) {
      setTablePage(result.data);
    } else {
      setError(result.error);
    }

    setPending(false);
  }

  async function submitEditor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || !tablePage) {
      return;
    }

    resetMessages();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const input = Object.fromEntries(
      [...formData.entries()].map(([name, value]) => [name, String(value)])
    );
    const result =
      editor.mode === "create"
        ? await createDatabaseRow(target, tablePage.table, input)
        : await updateDatabaseRow(
            target,
            tablePage.table,
            editor.row.key,
            input
          );

    if (result.ok) {
      setEditor(null);
      await openTable(tablePage.table, tablePage.page, tablePage.pageSize);
      setMessage(result.message);
    } else {
      setError(result.error);
    }

    setPending(false);
  }

  async function removeRow(row: DatabaseRow) {
    if (!tablePage) {
      return;
    }

    const confirmed = window.confirm(
      `Удалить строку из таблицы ${tablePage.table}? Это действие нельзя отменить.`
    );

    if (!confirmed) {
      return;
    }

    resetMessages();
    setPending(true);
    const result = await deleteDatabaseRow(
      target,
      tablePage.table,
      row.key
    );

    if (result.ok) {
      await openTable(tablePage.table, tablePage.page, tablePage.pageSize);
      setMessage(result.message);
    } else {
      setError(result.error);
    }

    setPending(false);
  }

  const editorColumns = tablePage?.columns.filter(
    (column) =>
      !column.identity &&
      !column.generated &&
      (editor?.mode !== "edit" || !column.primary)
  );

  return (
    <div className="view-db-stack">
      <section className="content-card view-db-connect">
        <div>
          <p className="eyebrow">Подключение</p>
          <h2>Выберите базу</h2>
        </div>

        <label className="field view-db-select">
          База данных
          <select
            value={target}
            onChange={(event) => {
              setTarget(event.target.value as DatabaseTarget);
              setTables([]);
              setTablePage(null);
              resetMessages();
            }}
          >
            <option value="local" disabled={!configured.local}>
              Локальная БД{configured.local ? "" : " — не настроена"}
            </option>
            <option value="production" disabled={!configured.production}>
              Рабочая БД{configured.production ? "" : " — не настроена"}
            </option>
          </select>
        </label>

        <button
          className="button"
          type="button"
          disabled={pending || !configured[target]}
          onClick={connect}
        >
          {pending ? "Подключение…" : "Показать таблицы"}
        </button>
      </section>

      {message ? <p className="send-message">{message}</p> : null}
      {error ? (
        <p className="send-message send-message--error">{error}</p>
      ) : null}

      {tables.length > 0 ? (
        <section className="content-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">{databaseLabel(target)}</p>
              <h2>Таблицы</h2>
            </div>
            <span className="status">{tables.length} шт.</span>
          </div>

          <ul className="db-table-list">
            {tables.map((table) => (
              <li key={table.name}>
                <code>{table.name}</code>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={pending}
                  onClick={() => openTable(table.name, 1)}
                >
                  Открыть
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {tablePage ? (
        <section className="content-card db-browser">
          <div className="card-header">
            <div>
              <p className="eyebrow">Открытая таблица</p>
              <h2>{tablePage.table}</h2>
            </div>
            <div className="db-toolbar">
              <span className="status">{tablePage.totalRows} строк</span>
              <button
                className="button"
                type="button"
                disabled={pending}
                onClick={() => setEditor({ mode: "create" })}
              >
                Создать
              </button>
            </div>
          </div>

          {!tablePage.canMutate ? (
            <p className="message message--error">
              У таблицы нет первичного ключа: изменение и удаление отключены.
            </p>
          ) : null}

          <div className="db-grid-scroll">
            <table className="db-grid">
              <thead>
                <tr>
                  {tablePage.columns.map((column) => (
                    <th key={column.name}>
                      {column.name}
                      {column.primary ? <span title="Primary key"> 🔑</span> : null}
                    </th>
                  ))}
                  <th>CRUD</th>
                </tr>
              </thead>
              <tbody>
                {tablePage.rows.length === 0 ? (
                  <tr>
                    <td colSpan={tablePage.columns.length + 1}>
                      В таблице пока нет строк.
                    </td>
                  </tr>
                ) : (
                  tablePage.rows.map((row, rowIndex) => (
                    <tr key={`${JSON.stringify(row.key)}-${rowIndex}`}>
                      {tablePage.columns.map((column) => (
                        <td key={column.name} title={row.values[column.name] ?? "NULL"}>
                          {cellValue(row.values[column.name])}
                        </td>
                      ))}
                      <td>
                        <div className="db-row-actions">
                          <button
                            className="button button--secondary"
                            type="button"
                            disabled={pending || !tablePage.canMutate}
                            onClick={() => setEditor({ mode: "edit", row })}
                          >
                            Изменить
                          </button>
                          <button
                            className="button db-button-danger"
                            type="button"
                            disabled={pending || !tablePage.canMutate}
                            onClick={() => removeRow(row)}
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="db-pagination">
            <button
              className="button button--secondary"
              type="button"
              disabled={pending || tablePage.page <= 1}
              onClick={() => openTable(tablePage.table, tablePage.page - 1)}
            >
              Назад
            </button>
            <span>
              Страница {tablePage.page} из {tablePage.totalPages}
            </span>
            <label>
              По
              <select
                value={tablePage.pageSize}
                disabled={pending}
                onChange={(event) =>
                  openTable(tablePage.table, 1, Number(event.target.value))
                }
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
              </select>
            </label>
            <button
              className="button button--secondary"
              type="button"
              disabled={pending || tablePage.page >= tablePage.totalPages}
              onClick={() => openTable(tablePage.table, tablePage.page + 1)}
            >
              Вперёд
            </button>
          </div>
        </section>
      ) : null}

      {editor && tablePage ? (
        <div className="modal-backdrop" role="presentation">
          <section className="modal db-editor" role="dialog" aria-modal="true">
            <button
              className="modal-close"
              type="button"
              aria-label="Закрыть"
              onClick={() => setEditor(null)}
            >
              ×
            </button>
            <p className="eyebrow">{tablePage.table}</p>
            <h2>{editor.mode === "create" ? "Новая строка" : "Изменение строки"}</h2>
            <p className="message">
              Пустое nullable-поле будет записано как NULL. Поля с default можно
              оставить пустыми при создании.
            </p>

            <form className="db-editor-form" onSubmit={submitEditor}>
              {editorColumns?.map((column) => {
                const initialValue =
                  editor.mode === "edit"
                    ? editor.row.values[column.name] ?? ""
                    : "";

                return (
                  <label className="field" key={column.name}>
                    <span>
                      {column.name} <small>{column.dataType}</small>
                    </span>
                    {isLongField(column) ? (
                      <textarea
                        name={column.name}
                        defaultValue={initialValue}
                        required={!column.nullable && !column.defaultValue}
                      />
                    ) : (
                      <input
                        name={column.name}
                        defaultValue={initialValue}
                        required={!column.nullable && !column.defaultValue}
                      />
                    )}
                    <small className="db-field-help">
                      {column.primary ? "primary key · " : ""}
                      {column.nullable ? "NULL допустим" : "обязательное поле"}
                      {column.defaultValue ? ` · default: ${column.defaultValue}` : ""}
                    </small>
                  </label>
                );
              })}

              <div className="modal-actions">
                <button className="button" type="submit" disabled={pending}>
                  {pending ? "Сохранение…" : "Сохранить"}
                </button>
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={pending}
                  onClick={() => setEditor(null)}
                >
                  Отмена
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}
