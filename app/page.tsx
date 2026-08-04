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

type PromptSort = "popular" | "recent";

type HomePageProps = {
  searchParams: Promise<{ sort?: string }>;
};

async function loadData(userId: string | undefined, sort: PromptSort): Promise<{
  prompts: PromptItem[];
  friendCount: number;
  error: string | null;
}> {
  try {
    const [prompts, friendCount] = await Promise.all([
      getPrisma().txt.findMany({
        where: { visibility: "PUBLIC" },
        orderBy:
          sort === "popular"
            ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
            : { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          title: true,
          content: true,
          visibility: true,
          createdAt: true,
          _count: { select: { likes: true } },
          likes: {
            where: { userId: userId ?? "" },
            select: { id: true },
            take: 1
          }
        }
      }),
      userId ? getPrisma().friend.count() : Promise.resolve(0)
    ]);

    return {
      prompts: prompts.map((prompt) => ({
        id: prompt.id,
        title: prompt.title,
        content: prompt.content,
        visibility: prompt.visibility,
        createdAt: prompt.createdAt.toISOString(),
        likesCount: prompt._count.likes,
        likedByMe: prompt.likes.length > 0
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

export default async function Home({ searchParams }: HomePageProps) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const sort: PromptSort = params.sort === "popular" ? "popular" : "recent";
  const { prompts, friendCount, error } = await loadData(
    session?.user?.id,
    sort
  );

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
              <h2>Публичные книги</h2>
            </div>
            <div className="library-tools">
              <nav aria-label="Сортировка публичных книг" className="sort-control">
                <Link
                  aria-current={sort === "recent" ? "page" : undefined}
                  className={sort === "recent" ? "sort-link sort-link--active" : "sort-link"}
                  href="/?sort=recent"
                >
                  По дате
                </Link>
                <Link
                  aria-current={sort === "popular" ? "page" : undefined}
                  className={sort === "popular" ? "sort-link sort-link--active" : "sort-link"}
                  href="/?sort=popular"
                >
                  По популярности
                </Link>
              </nav>
              <span className={error ? "status status--error" : "status"}>
                {error ? "Нет подключения" : `${prompts.length} шт.`}
              </span>
            </div>
          </div>

          {error ? (
            <p className="message message--error">{error}</p>
          ) : (
            <PromptList
              prompts={prompts}
              friendCount={friendCount}
              canSend={Boolean(session?.user)}
              canLike={Boolean(session?.user)}
            />
          )}
        </div>
      </section>
    </main>
  );
}
