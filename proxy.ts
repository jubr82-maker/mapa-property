import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { isAdminEmail } from "@/lib/admin/admin-emails";

const intlMiddleware = createMiddleware(routing);

const ADMIN_PUBLIC_PATHS = new Set([
  "/admin/login",
  "/admin/auth/callback",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin section — auth Supabase, hors next-intl
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const response = NextResponse.next({ request });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Allowlist email — même source que lib/admin/require-admin.ts. Un
    // utilisateur Supabase Auth authentifié mais hors allowlist (ex. compte
    // d'un autre projet sur la même base) est traité comme non-admin ici.
    const isAllowedAdmin = Boolean(user && isAdminEmail(user.email));
    if (user && !isAllowedAdmin) {
      console.warn("admin access denied");
    }

    const isPublicAdminPath = ADMIN_PUBLIC_PATHS.has(pathname);

    // Anti-cache : aucune réponse admin (200, 307, redirect) ne doit
    // être cachée par le CDN Vercel — sinon une 307 émise pour un user
    // non-auth peut être resservie à un user auth (et inversement).
    const noStore = (res: NextResponse) => {
      res.headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
      return res;
    };

    if (!isAllowedAdmin && !isPublicAdminPath) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return noStore(NextResponse.redirect(loginUrl));
    }

    if (isAllowedAdmin && pathname === "/admin/login") {
      return noStore(NextResponse.redirect(new URL("/admin", request.url)));
    }

    return noStore(response);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
