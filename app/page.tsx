import { PromptForm } from "@/app/components/prompt-form";
import {
  PromptList,
  type PromptItem
} from "@/app/components/prompt-list";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadData(): Promise<{
  prompts: PromptItem[];
  friendEmails: string[];
  error: string | null;
}> {
  try {
    const [notes, friends] = await Promise.all([
      getPrisma().note.findMany({
        orderBy: { createdAt: "desc" },
        take: 100
      }),
      getPrisma().friend.findMany({
        orderBy: { createdAt: "asc" },
        select: { email: true }
      })
    ]);

    return {
      prompts: notes.map((note) => ({
        ...note,
        createdAt: note.createdAt.toISOString()
      })),
      friendEmails: friends.map((friend) => friend.email),
      error: null
    };
  } catch (error) {
    console.error("Failed to load ProBook data:", error);
    return {
      prompts: [],
      friendEmails: [],
      error:
        "Не удалось подключиться к NeonDB. Проверьте DATABASE_URL и примените миграции."
    };
  }
}

export default async function Home() {
  const { prompts, friendEmails, error } = await loadData();

  return (
    <main className="page-shell">
      <section className="page-intro">
        <p className="eyebrow">Next.js · Prisma · Neon</p>
        <h1>ProBook</h1>
        <p className="lead">
          Сохраняйте полезные книжные промты и делитесь ими с друзьями.
        </p>
      </section>

      <section className="content-grid">
        <PromptForm />

        <div className="content-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Библиотека</p>
              <h2>Все промты</h2>
            </div>
            <span className={error ? "status status--error" : "status"}>
              {error ? "Нет подключения" : `${prompts.length} шт.`}
            </span>
          </div>

          {error ? (
            <p className="message message--error">{error}</p>
          ) : (
            <PromptList
              prompts={prompts}
              friendEmails={friendEmails}
            />
          )}
        </div>
      </section>
    </main>
  );
}
