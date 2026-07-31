import Link from "next/link";
import { redirect } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-user";
import {
  DEFAULT_PASSWORD,
  hashPassword,
  verifyPassword
} from "@/lib/password";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{ password?: string }>;
};

async function changePassword(formData: FormData) {
  "use server";

  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (newPassword.length < 6) {
    redirect("/dashboard?password=short");
  }

  if (newPassword !== confirmation) {
    redirect("/dashboard?password=mismatch");
  }

  const prisma = getPrisma();
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true }
  });

  if (!account) {
    redirect("/login");
  }

  const currentPasswordIsValid = account.passwordHash
    ? await verifyPassword(currentPassword, account.passwordHash)
    : currentPassword === DEFAULT_PASSWORD;

  if (!currentPasswordIsValid) {
    redirect("/dashboard?password=invalid");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) }
  });

  redirect("/dashboard?password=changed");
}

const passwordMessages: Record<string, { text: string; success: boolean }> = {
  changed: { text: "Пароль успешно изменён.", success: true },
  invalid: { text: "Текущий пароль указан неверно.", success: false },
  mismatch: { text: "Новый пароль и подтверждение не совпадают.", success: false },
  short: { text: "Новый пароль должен содержать не менее 6 символов.", success: false }
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireUser();
  const params = await searchParams;
  const passwordMessage = params.password
    ? passwordMessages[params.password]
    : undefined;
  const prisma = getPrisma();
  const [allPrompts, privatePrompts, publicPrompts] = await Promise.all([
    prisma.txt.count({ where: { userId: user.id } }),
    prisma.txt.count({
      where: { userId: user.id, visibility: "PRIVATE" }
    }),
    prisma.txt.count({
      where: { userId: user.id, visibility: "PUBLIC" }
    })
  ]);

  return (
    <main className="page-shell">
      <section className="page-intro page-intro--compact">
        <p className="eyebrow">Личный кабинет</p>
        <h1>Здравствуйте{user.name ? `, ${user.name}` : ""}</h1>
        <p className="lead">Ваш стабильный userId: {user.id}</p>
      </section>

      <section className="dashboard-grid">
        <article className="content-card dashboard-stat">
          <span>{allPrompts}</span>
          <p>Всего промтов</p>
        </article>
        <article className="content-card dashboard-stat">
          <span>{privatePrompts}</span>
          <p>Приватных</p>
        </article>
        <article className="content-card dashboard-stat">
          <span>{publicPrompts}</span>
          <p>Публичных</p>
        </article>
      </section>

      <div className="dashboard-actions">
        <Link className="button" href="/my-prompts">
          Открыть мои промты
        </Link>
        <Link className="button button--secondary" href="/">
          Добавить промт
        </Link>
      </div>

      <section className="content-card password-card">
        <div>
          <p className="eyebrow">Безопасность</p>
          <h2>Изменить пароль</h2>
          <p className="message">Аккаунт: {user.email}</p>
        </div>
        <form className="password-form" action={changePassword}>
          <label className="field">
            Текущий пароль
            <input
              autoComplete="current-password"
              name="currentPassword"
              required
              type="password"
            />
          </label>
          <label className="field">
            Новый пароль
            <input
              autoComplete="new-password"
              minLength={6}
              name="newPassword"
              required
              type="password"
            />
          </label>
          <label className="field">
            Повторите новый пароль
            <input
              autoComplete="new-password"
              minLength={6}
              name="confirmation"
              required
              type="password"
            />
          </label>
          {passwordMessage ? (
            <p
              className={`form-message ${
                passwordMessage.success
                  ? "form-message--success"
                  : "form-message--error"
              }`}
              role={passwordMessage.success ? "status" : "alert"}
            >
              {passwordMessage.text}
            </p>
          ) : null}
          <button className="button" type="submit">
            Сохранить новый пароль
          </button>
        </form>
      </section>
    </main>
  );
}
