export type DatabaseTarget = "local" | "production";

export type DatabaseTable = {
  name: string;
};

export type ColumnMetadata = {
  name: string;
  dataType: string;
  nullable: boolean;
  defaultValue: string | null;
  identity: boolean;
  generated: boolean;
  primary: boolean;
};

export type DatabaseRow = {
  values: Record<string, string | null>;
  key: Record<string, string | null>;
};

export type TablePage = {
  table: string;
  columns: ColumnMetadata[];
  rows: DatabaseRow[];
  page: number;
  pageSize: number;
  totalRows: number;
  totalPages: number;
  canMutate: boolean;
};

export type TablesResult =
  | { ok: true; tables: DatabaseTable[] }
  | { ok: false; error: string };

export type TablePageResult =
  | { ok: true; data: TablePage }
  | { ok: false; error: string };

export type MutationResult =
  | { ok: true; message: string }
  | { ok: false; error: string };
