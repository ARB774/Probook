import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { DEFAULT_PASSWORD } from "@/lib/password";

export const dynamic = "force-dynamic";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

async function login(formData: FormData) {
  "use server";

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard"
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=credentials");
    }

    throw error;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [session, params] = await Promise.all([auth(), searchParams]);

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="page-shell auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Личный кабинет ProBook</p>
        <h1 className="auth-title">Вход</h1>
        <p className="lead">
          Укажите email и пароль, чтобы сохранять и отправлять промты друзьям.
        </p>

        {process.env.AUTH_SECRET ? (
          <form className="auth-form" action={login}>
            <label className="field">
              Email
              <input
                autoComplete="email"
                inputMode="email"
                name="email"
                placeholder="friend@example.com"
                required
                type="email"
              />
            </label>
            <label className="field">
              Пароль
              <input
                autoComplete="current-password"
                minLength={6}
                name="password"
                required
                type="password"
              />
            </label>
            <p className="auth-hint">
              При первом входе используйте общий пароль <code>{DEFAULT_PASSWORD}</code>.
              После входа его можно изменить в личном кабинете.
            </p>
            {params.error ? (
              <p className="form-message form-message--error" role="alert">
                Неверный email или пароль.
              </p>
            ) : null}
            <button className="button auth-submit-button" type="submit">
              Войти
            </button>
          </form>
        ) : (
          <div className="auth-config-warning" role="status">
            Для входа добавьте в окружение <code>AUTH_SECRET</code> и
            перезапустите приложение.
          </div>
        )}
      </section>
    </main>
  );
}
