import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { isAdminEmail } from "@/lib/admin/admin-emails";
import { getArchivedPropertyKeys } from "@/lib/archived-properties";
import {
  ADMIN_ACTIVITY_COOKIE,
  ADMIN_IDLE_TIMEOUT_MINUTES,
  ADMIN_MFA_PATH,
  ADMIN_PUBLIC_PATHS,
} from "@/lib/admin/security-config";
import { logAdminAuthEvent } from "@/lib/admin/auth-log";

const intlMiddleware = createMiddleware(routing);


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
    const isMfaPath = pathname === ADMIN_MFA_PATH;

    // Anti-cache : aucune réponse admin (200, 307, redirect) ne doit
    // être cachée par le CDN Vercel — sinon une 307 émise pour un user
    // non-auth peut être resservie à un user auth (et inversement).
    // Oct. 2026 : interdiction d'indexation sur toute reponse admin.
    const noStore = (res: NextResponse) => {
      res.headers.set("cache-control", "private, no-store, max-age=0, must-revalidate");
      res.headers.set("x-robots-tag", "noindex, nofollow, noarchive");
      return res;
    };
    // Redirection qui conserve les cookies poses par Supabase (session
    // rafraichie ou effacee) sur la reponse courante.
    const redirectTo = (path: string, params?: Record<string, string>) => {
      const url = new URL(path, request.url);
      for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);
      const res = NextResponse.redirect(url);
      response.cookies.getAll().forEach((c) => res.cookies.set(c));
      return noStore(res);
    };

    // Double authentification obligatoire : niveau de la session validee.
    let aal2 = false;
    if (isAllowedAdmin) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      aal2 = aal?.currentLevel === "aal2";
    }

    // Deconnexion apres ADMIN_IDLE_TIMEOUT_MINUTES sans requete admin.
    if (isAllowedAdmin) {
      const last = Number(request.cookies.get(ADMIN_ACTIVITY_COOKIE)?.value ?? 0);
      const idleMs = ADMIN_IDLE_TIMEOUT_MINUTES * 60_000;
      if (last && Date.now() - last > idleMs) {
        await supabase.auth.signOut();
        await logAdminAuthEvent({
          event: "idle_logout",
          success: true,
          email: user?.email,
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: request.headers.get("user-agent"),
        });
        const res = redirectTo("/admin/login", { reason: "idle" });
        res.cookies.delete(ADMIN_ACTIVITY_COOKIE);
        return res;
      }
      response.cookies.set(ADMIN_ACTIVITY_COOKIE, String(Date.now()), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/admin",
        maxAge: ADMIN_IDLE_TIMEOUT_MINUTES * 60 * 2,
      });
    }

    if (!isAllowedAdmin && !isPublicAdminPath) {
      return redirectTo("/admin/login", { from: pathname });
    }

    // Admin connecte par mot de passe seulement (aal1) : uniquement la page
    // d'inscription / verification du second facteur, et les pages publiques
    // de reinitialisation du mot de passe.
    if (isAllowedAdmin && !aal2 && !isMfaPath && !isPublicAdminPath) {
      return redirectTo(ADMIN_MFA_PATH, { from: pathname });
    }
    if (isAllowedAdmin && !aal2 && pathname === "/admin/login") {
      return redirectTo(ADMIN_MFA_PATH);
    }

    if (isAllowedAdmin && aal2 && (pathname === "/admin/login" || isMfaPath)) {
      return redirectTo("/admin");
    }

    return noStore(response);
  }

  // Fiche d'un bien ARCHIVE (oct. 2026) : 410 + page "plus disponible"
  // (app/api/property-gone), au lieu d'une erreur brute.
  const ficheMatch = pathname.match(/^\/(fr|en|de)\/biens\/([^/]+)\/?$/);
  if (ficheMatch) {
    const archived = await getArchivedPropertyKeys();
    if (archived.has(decodeURIComponent(ficheMatch[2]))) {
      const gone = new URL(`/api/property-gone?locale=${ficheMatch[1]}`, request.url);
      return NextResponse.rewrite(gone);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
