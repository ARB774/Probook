// Next.js 16 renamed middleware.ts to proxy.ts.
// Auth.js performs an optimistic session check before protected pages render.
export { auth as proxy } from "@/auth";

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/my-prompts/:path*",
    "/friends/:path*"
  ]
};
