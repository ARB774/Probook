import type { Metadata } from "next";
import Link from "next/link";
import { AuthNavigation } from "@/app/components/auth-navigation";
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
          <AuthNavigation />
        </header>
        {children}
      </body>
    </html>
  );
}
