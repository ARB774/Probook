import { ViewDbClient } from "@/app/view-db/view-db-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ViewDbPage() {
  if (process.env.NODE_ENV === "production") {
    return (
      <main className="page-shell view-db-shell">
        <section className="content-card">
          <p className="eyebrow">Служебный инструмент</p>
          <h1 className="view-db-title">View DB отключён</h1>
          <p className="message">
            По соображениям безопасности просмотр и CRUD базы доступны только
            при локальном запуске проекта.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell view-db-shell">
      <section className="page-intro page-intro--compact">
        <p className="eyebrow">Локальный инструмент разработчика</p>
        <h1 className="view-db-title">View DB</h1>
        <p className="lead">
          Выберите PostgreSQL-базу, откройте таблицу и работайте со строками.
          Строки подключения остаются только на сервере.
        </p>
      </section>

      <ViewDbClient
        configured={{
          local: Boolean(process.env.LOCAL_DATABASE_URL),
          production: Boolean(process.env.DATABASE_URL)
        }}
      />
    </main>
  );
}
