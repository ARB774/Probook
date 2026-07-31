import Link from "next/link";
import { auth, signOut } from "@/auth";

export async function AuthNavigation() {
  const session = await auth();

  return (
    <nav aria-label="Основная навигация">
      <Link href="/">Промты</Link>
      <Link href="/friends">Друзья</Link>
      {session?.user ? (
        <>
          <Link href="/dashboard">Кабинет</Link>
          <Link href="/my-prompts">Мои промты</Link>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button className="nav-button" type="submit">
              Выйти
            </button>
          </form>
        </>
      ) : (
        <Link href="/login">Войти</Link>
      )}
      {process.env.NODE_ENV !== "production" ? (
        <Link href="/view-db">View DB</Link>
      ) : null}
    </nav>
  );
}
