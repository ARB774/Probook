import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "ProBook",
  description: "Обмен книжными промтами"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        <header className="site-header">
          <Link className="brand" href="/">
            ProBook
          </Link>
          <nav aria-label="Основная навигация">
            <Link href="/">Промты</Link>
            <Link href="/friends">Друзья</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
