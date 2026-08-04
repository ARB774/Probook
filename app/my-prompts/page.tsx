import { PromptList, type PromptItem } from "@/app/components/prompt-list";
import { requireUser } from "@/lib/auth-user";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MyPromptsPage() {
  const user = await requireUser();
  const prisma = getPrisma();
  const prompts = await prisma.txt.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      content: true,
      visibility: true,
      createdAt: true,
      _count: { select: { likes: true } },
      likes: {
        where: { userId: user.id },
        select: { id: true },
        take: 1
      }
    }
  });
  const items: PromptItem[] = prompts.map((prompt) => ({
    id: prompt.id,
    title: prompt.title,
    content: prompt.content,
    visibility: prompt.visibility,
    createdAt: prompt.createdAt.toISOString(),
    likesCount: prompt._count.likes,
    likedByMe: prompt.likes.length > 0
  }));

  return (
    <main className="page-shell">
      <section className="page-intro page-intro--compact">
        <p className="eyebrow">Личная библиотека</p>
        <h1>Мои промты</h1>
        <p className="lead">
          Здесь видны все ваши публичные и приватные материалы.
        </p>
      </section>

      <section className="content-card">
        <div className="card-header">
          <div>
            <p className="eyebrow">Владелец: {user.email}</p>
            <h2>Список промтов</h2>
          </div>
          <span className="status">{items.length} шт.</span>
        </div>
        <PromptList prompts={items} canLike />
      </section>
    </main>
  );
}
