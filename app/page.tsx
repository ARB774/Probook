import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type NoteView = {
  id: string;
  title: string;
  createdAt: Date;
};

async function loadNotes(): Promise<{
  notes: NoteView[];
  error: string | null;
}> {
  try {
    const notes = await getPrisma().note.findMany({
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return { notes, error: null };
  } catch (error) {
    console.error("Failed to load notes:", error);
    return {
      notes: [],
      error: "Не удалось подключиться к NeonDB. Проверьте переменную DATABASE_URL."
    };
  }
}

export default async function Home() {
  const { notes, error } = await loadNotes();

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">Next.js · Prisma · Neon</p>
        <h1>ProBook</h1>
        <p className="lead">
          Минимальная основа сервиса обмена книжными промтами.
        </p>

        <div className="database-card">
          <div className="database-card__header">
            <div>
              <p className="label">Данные из PostgreSQL</p>
              <h2>Заметки</h2>
            </div>
            <span className={error ? "status status--error" : "status"}>
              {error ? "Нет подключения" : "NeonDB подключена"}
            </span>
          </div>

          {error ? (
            <p className="message message--error">{error}</p>
          ) : notes.length === 0 ? (
            <p className="message">
              Таблица пуста. Выполните команду <code>pnpm db:seed</code>.
            </p>
          ) : (
            <ul className="notes">
              {notes.map((note) => (
                <li key={note.id}>
                  <span>{note.title}</span>
                  <time dateTime={note.createdAt.toISOString()}>
                    {new Intl.DateTimeFormat("ru-RU", {
                      dateStyle: "medium",
                      timeStyle: "short"
                    }).format(note.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
