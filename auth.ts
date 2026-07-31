import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getPrisma } from "@/lib/prisma";
import {
  DEFAULT_PASSWORD,
  hashPassword,
  normalizeEmail,
  verifyPassword
} from "@/lib/password";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" }
      },
      async authorize(credentials) {
        const email = normalizeEmail(String(credentials.email ?? ""));
        const password = String(credentials.password ?? "");

        if (!email || !email.includes("@") || !password) {
          return null;
        }

        const prisma = getPrisma();
        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
          if (password !== DEFAULT_PASSWORD) {
            return null;
          }

          user = await prisma.user.create({
            data: {
              email,
              passwordHash: await hashPassword(DEFAULT_PASSWORD)
            }
          });
        } else if (!user.passwordHash) {
          if (password !== DEFAULT_PASSWORD) {
            return null;
          }

          user = await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: await hashPassword(DEFAULT_PASSWORD) }
          });
        } else if (!(await verifyPassword(password, user.passwordHash))) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image
        };
      }
    })
  ],
  callbacks: {
    authorized({ auth: session, request }) {
      const pathname = request.nextUrl.pathname;
      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/my-prompts");

      if (isProtected) {
        return Boolean(session?.user?.id);
      }

      if (pathname === "/login" && session?.user?.id) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      return true;
    },
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    }
  }
});
