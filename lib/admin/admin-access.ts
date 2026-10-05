// Decision d'acces admin, sans effet de bord (audit de securite, oct. 2026).
// Source unique pour proxy.ts et lib/admin/require-admin.ts, testee par
// scripts/security/test-security.ts (visiteur anonyme, compte hors liste,
// session sans second facteur, admin aal2).
import { isAdminEmail } from "@/lib/admin/admin-emails";
import { ADMIN_MFA_PATH, ADMIN_PUBLIC_PATHS } from "@/lib/admin/security-config";

export type AdminAccess = "anonymous" | "not_admin" | "mfa_required" | "admin";

/** Niveau d'acces d'un utilisateur valide par getUser() et de sa session. */
export function evaluateAdminAccess(
  user: { email?: string | null } | null | undefined,
  currentLevel: string | null | undefined,
): AdminAccess {
  if (!user) return "anonymous";
  if (!isAdminEmail(user.email)) return "not_admin";
  return currentLevel === "aal2" ? "admin" : "mfa_required";
}

/**
 * Redirection imposee par proxy.ts pour une page /admin, ou null si la page
 * peut etre servie.
 *
 * `serverAction` (oct. 2026) : appel d'action serveur (POST avec en-tete
 * Next-Action) sur une page publique (connexion...). Il n'est JAMAIS
 * redirige : la connexion par Passkey ouvre la session dans le navigateur
 * PUIS appelle une action depuis /admin/login ; la regle "session ouverte
 * sur /admin/login -> /admin/mfa ou /admin" detournait cet appel, qui
 * n'atteignait jamais le serveur (rien au journal) et laissait l'ecran
 * bloque. Les actions se protegent elles-memes (gardes testees), et un
 * visiteur anonyme pouvait deja appeler une action depuis ces pages.
 */
export function adminPageRedirect(
  pathname: string,
  access: AdminAccess,
  opts?: { serverAction?: boolean },
): { path: string; params?: Record<string, string> } | null {
  const allowed = access === "admin" || access === "mfa_required";
  const isPublic = ADMIN_PUBLIC_PATHS.has(pathname);
  const isMfa = pathname === ADMIN_MFA_PATH;
  if (opts?.serverAction && isPublic) return null;
  if (!allowed && !isPublic) return { path: "/admin/login", params: { from: pathname } };
  if (access === "mfa_required" && !isMfa && !isPublic) return { path: ADMIN_MFA_PATH, params: { from: pathname } };
  if (access === "mfa_required" && pathname === "/admin/login") return { path: ADMIN_MFA_PATH };
  if (access === "admin" && (pathname === "/admin/login" || isMfa)) return { path: "/admin" };
  return null;
}
