import { FriendForm } from "@/app/components/friend-form";
import { requireUser } from "@/lib/auth-user";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type FriendView = {
  id: string;
  name: string;
  email: string;
};

async function loadFriends(): Promise<{
  friends: FriendView[];
  error: string | null;
}> {
  try {
    const friends = await getPrisma().friend.findMany({
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    return { friends, error: null };
  } catch (error) {
    console.error("Failed to load friends:", error);
    return {
      friends: [],
      error:
        "Не удалось загрузить друзей. Проверьте подключение к NeonDB и миграции."
    };
  }
}

export default async function FriendsPage() {
  await requireUser();
  const { friends, error } = await loadFriends();

  return (
    <main className="page-shell">
      <section className="page-intro page-intro--compact">
        <p className="eyebrow">Адресная книга</p>
        <h1>Друзья</h1>
        <p className="lead">
          Эти контакты используются кнопкой «Отправить друзьям» в карточке
          промта.
        </p>
      </section>

      <section className="content-grid">
        <FriendForm />

        <div className="content-card">
          <div className="card-header">
            <div>
              <p className="eyebrow">Контакты</p>
              <h2>Список друзей</h2>
            </div>
            <span className={error ? "status status--error" : "status"}>
              {error ? "Ошибка" : `${friends.length} чел.`}
            </span>
          </div>

          {error ? (
            <p className="message message--error">{error}</p>
          ) : friends.length === 0 ? (
            <p className="empty-state">
              Список пуст. Добавьте первого друга через форму.
            </p>
          ) : (
            <ul className="friend-list">
              {friends.map((friend) => (
                <li key={friend.id}>
                  <strong>{friend.name}</strong>
                  <a href={`mailto:${friend.email}`}>{friend.email}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
