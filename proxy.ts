import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";
import { isAdminEmail } from "@/lib/admin/admin-emails";
import { getArchivedPropertyKeys } from "@/lib/archived-properties";
import { getPublishedPropertyPathsByKey, isPublishedOffmarketId, lookupPublishedProperty } from "@/lib/published-property-keys";
import { legacyPropertyDestination, resolveLegacyPath } from "@/lib/legacy-redirects";
import { blogLowercaseRedirect } from "@/lib/blog/slug";
import {
  ADMIN_ACTIVITY_COOKIE,
  ADMIN_ACTIVITY_COOKIE_MAX_AGE_SECONDS,
  ADMIN_IDLE_TIMEOUT_MINUTES,
  ADMIN_PUBLIC_PATHS,
  PASSKEY_ATTEMPT_COOKIE,
  PASSKEY_ATTEMPT_MAX_AGE_SECONDS,
} from "@/lib/admin/security-config";
import { evaluateAdminIdle, sessionStartFromClaims } from "@/lib/admin/idle";
import { adminPageRedirect, evaluateAdminAccess } from "@/lib/admin/admin-access";
import { logAdminAuthEvent } from "@/lib/admin/auth-log";

const intlMiddleware = createMiddleware(routing);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * 404 rendue a la demande (oct. 2026, quotas Vercel) : la page attrape-tout
 * [...rest] repond 404 avec la page "introuvable" de la langue, sans entree
 * de cache ISR. L'adresse affichee reste celle demandee.
 */
function notFoundRewrite(request: NextRequest, locale: string) {
  return NextResponse.rewrite(new URL(`/${locale}/adresse-introuvable`, request.url));
}


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

    // Deconnexion apres ADMIN_IDLE_TIMEOUT_MINUTES sans requete admin, sur
    // la session EN COURS uniquement (lib/admin/idle.ts) : l'activite d'une
    // session precedente n'est jamais prise en compte, et rien ne se
    // declenche pendant un parcours de connexion.
    const isServerAction = request.method === "POST" && request.headers.has("next-action");
    if (isAllowedAdmin) {
      // session_id et heure d'ouverture lus dans le jeton valide (signature
      // verifiee par getClaims, ou par Supabase en repli).
      const { data: claimsData } = await supabase.auth.getClaims();
      const claims = claimsData?.claims ?? null;
      const attempt = Number((request.cookies.get(PASSKEY_ATTEMPT_COOKIE)?.value ?? "").split(".")[1] ?? 0);
      const loginInProgress =
        (isServerAction && ADMIN_PUBLIC_PATHS.has(pathname)) ||
        (attempt > 0 && Date.now() - attempt < PASSKEY_ATTEMPT_MAX_AGE_SECONDS * 1000);
      const idle = evaluateAdminIdle({
        now: Date.now(),
        cookieValue: request.cookies.get(ADMIN_ACTIVITY_COOKIE)?.value,
        sessionId: typeof claims?.session_id === "string" ? claims.session_id : null,
        sessionStartMs: sessionStartFromClaims(claims),
        timeoutMs: ADMIN_IDLE_TIMEOUT_MINUTES * 60_000,
        loginInProgress,
      });
      if (idle.action === "logout") {
        // Portee locale : seule la session de ce navigateur est fermee.
        await supabase.auth.signOut({ scope: "local" });
        await logAdminAuthEvent({
          event: "idle_logout",
          success: true,
          email: user?.email,
          reason: idle.reason,
          ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
          userAgent: request.headers.get("user-agent"),
        });
        const res = redirectTo("/admin/login", { reason: "idle" });
        // Meme chemin que le cookie pose, sinon il survit a la suppression.
        res.cookies.delete({ name: ADMIN_ACTIVITY_COOKIE, path: "/admin" });
        return res;
      }
      response.cookies.set(ADMIN_ACTIVITY_COOKIE, idle.cookieValue, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/admin",
        maxAge: ADMIN_ACTIVITY_COOKIE_MAX_AGE_SECONDS,
      });
    }

    // Decision partagee et testee (lib/admin/admin-access.ts).
    const access = evaluateAdminAccess(user, aal2 ? "aal2" : "aal1");
    const target = adminPageRedirect(pathname, access, { serverAction: isServerAction });
    if (target) return redirectTo(target.path, target.params);

    return noStore(response);
  }

  // Adresse d'article avec majuscules ou accents, ou ancienne adresse sans
  // langue (oct. 2026) : 301 permanente, en une seule etape, vers
  // l'adresse en minuscules (/blog/Immobilier-Steinfort et
  // /fr/blog/Immobilier-Steinfort -> /fr/blog/immobilier-steinfort).
  const blogLower = blogLowercaseRedirect(pathname);
  if (blogLower) {
    const url = request.nextUrl.clone();
    url.pathname = blogLower;
    return NextResponse.redirect(url, 301);
  }

  // Anciennes adresses (site v28 et anciens sites Apimo) : 301 vers
  // l'equivalent exact, en une seule etape (lib/legacy-redirects.ts) ;
  // une ancienne fiche mene a l'adresse actuelle de la fiche dans la meme
  // langue, ou a la liste des biens. Les pages sans equivalent connu
  // suivent le flux normal (page 404 utile).
  const legacy = resolveLegacyPath(pathname);
  if (legacy) {
    const dest =
      legacy.kind === "path"
        ? legacy.to
        : legacyPropertyDestination(legacy, await getPublishedPropertyPathsByKey());
    const url = new URL(dest, request.url);
    // Page : parametres de l'adresse gardes, sauf si la destination a les
    // siens (?transaction=sale). Fiche : aucun parametre de l'ancien site.
    if (!dest.includes("?")) url.search = legacy.kind === "path" ? request.nextUrl.search : "";
    return NextResponse.redirect(url, 301);
  }

  // Adresse sans langue (hors accueil) : 308 vers la version francaise,
  // langue par defaut et langue du site v28. L'accueil "/" garde la
  // redirection temporaire de next-intl, qui choisit la langue du
  // visiteur (cf. rapport : une redirection selon la langue doit rester
  // temporaire).
  if (pathname !== "/" && !/^\/(fr|en|de)(\/|$)/.test(pathname)) {
    const url = new URL(`/fr${pathname}`, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 308);
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
    // Quotas Vercel (oct. 2026) : une ancienne adresse de fiche (slug,
    // numero Apimo, autre langue) part en 301 d'ici, une adresse inconnue
    // recoit une 404 rendue a la demande ; ni l'une ni l'autre ne cree
    // d'entree de cache ISR. Liste illisible : la page decide, comme avant.
    // UUID inconnu des biens publies : la page s'il designe un bien
    // off-market (redirection vers sa page), sinon 404 a la demande.
    const seg = decodeURIComponent(ficheMatch[2]);
    const found = await lookupPublishedProperty(ficheMatch[1] as "fr" | "en" | "de", seg);
    if (found.kind === "alias") {
      const to = new URL(`/${ficheMatch[1]}${found.paths[ficheMatch[1] as "fr" | "en" | "de"]}`, request.url);
      to.search = request.nextUrl.search;
      return NextResponse.redirect(to, 301);
    }
    if (found.kind === "unknown" && (!UUID_RE.test(seg) || (await isPublishedOffmarketId(seg)) === false)) {
      return notFoundRewrite(request, ficheMatch[1]);
    }
  }
  const offMatch = pathname.match(/^\/(fr|en|de)\/off-market\/([^/]+)\/?$/);
  if (offMatch && offMatch[2] !== "arcova") {
    const published = UUID_RE.test(offMatch[2]) ? await isPublishedOffmarketId(offMatch[2]) : false;
    if (published === false) return notFoundRewrite(request, offMatch[1]);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
    // Anciennes fiches dont l'adresse contient un point (exclues ci-dessus).
    "/:locale(fr|en|de)/:seg(propriete|proprietes|property|properties|immobilie|immobilien|objekt|eigenschaft|bien)/:rest*",
  ],
};
