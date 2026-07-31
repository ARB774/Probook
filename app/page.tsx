import Link from "next/link";
import { PromptForm } from "@/app/components/prompt-form";
import {
  PromptList,
  type PromptItem
} from "@/app/components/prompt-list";
import { getPrisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function loadData(userId?: string): Promise<{
  prompts: PromptItem[];
  friendCount: number;
  error: string | null;
}> {
  try {
    const [prompts, friendCount] = await Promise.all([
      getPrisma().txt.findMany({
        where: userId
          ? {
              OR: [{ visibility: "PUBLIC" }, { userId }]
            }
          : { visibility: "PUBLIC" },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          title: true,
          content: true,
          visibility: true,
          createdAt: true
        }
      }),
      userId ? getPrisma().friend.count() : Promise.resolve(0)
    ]);

    return {
      prompts: prompts.map((prompt) => ({
        ...prompt,
        createdAt: prompt.createdAt.toISOString()
      })),
      friendCount,
      error: null
    };
  } catch (error) {
    console.error("Failed to load ProBook data:", error);
    return {
      prompts: [],
      friendCount: 0,
      error:
        "Не удалось подключиться к NeonDB. Проверьте DATABASE_URL и примените миграции."
    };
  }
}

export default async function Home() {
  const session = await auth();
  const { prompts, friendCount, error } = await loadData(session?.user?.id);

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
        {session?.user ? (
          <PromptForm />
        ) : (
          <div className="form-card auth-invite">
            <div>
              <p className="eyebrow">Личная библиотека</p>
              <h2>Сохраняйте свои промты</h2>
            </div>
            <p className="message">
              Войдите по email, чтобы создавать приватные и публичные материалы.
              Для первого входа используйте пароль <code>friend</code>.
            </p>
            <Link className="button" href="/login">
              Войти по email
            </Link>
          </div>
        )}

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
              friendCount={friendCount}
              canSend={Boolean(session?.user)}
            />
          )}
        </div>
      </section>
    </main>
  );
}
