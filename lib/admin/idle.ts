// Deconnexion pour inactivite de l'admin (oct. 2026). Decision pure, sans
// effet de bord : utilisee par proxy.ts et testee par
// scripts/security/test-security.ts (sequence reelle du journal du
// 5 octobre : ancienne activite, puis nouvelle session par Passkey).
//
// Bug corrige : le cookie d'activite ne contenait qu'une date. Il survivait
// a la fin d'une session (sa suppression visait le chemin "/" alors qu'il
// est pose sur "/admin") et rien ne le remettait a zero a la connexion :
// la session suivante, a peine ouverte, etait jugee inactive avec la date
// de la precedente et supprimee.
//
// Desormais :
//   - le cookie est lie a la session : "<session_id>:<horodatage ms>" ;
//   - l'activite d'une AUTRE session n'est jamais prise en compte ;
//   - la reference est la plus recente de deux dates : derniere activite de
//     CETTE session, et heure d'ouverture de la session lue dans le jeton
//     valide par Supabase (plus ancien horodatage d'authentification du
//     jeton). Une session qui vient de s'ouvrir n'est donc jamais inactive ;
//     une session ancienne sans trace d'activite (cookie expire ou efface)
//     l'est bien apres ADMIN_IDLE_TIMEOUT_MINUTES (4 heures) ;
//   - aucune deconnexion pendant un parcours de connexion en cours.
// Ces informations ne servent qu'a DECONNECTER, jamais a accorder un acces
// ni un niveau (aal2 reste lu par getAuthenticatorAssuranceLevel).

export type IdleInput = {
  /** Heure courante (ms). */
  now: number;
  /** Valeur brute du cookie d'activite, ou undefined. */
  cookieValue: string | undefined;
  /** session_id du jeton valide, ou null s'il est illisible. */
  sessionId: string | null;
  /** Heure d'ouverture de la session (ms), ou null si inconnue. */
  sessionStartMs: number | null;
  /** Delai d'inactivite (ms). */
  timeoutMs: number;
  /** Parcours de connexion en cours (action de connexion, Passkey). */
  loginInProgress: boolean;
};

export type IdleDecision =
  | { action: "logout"; reason: string }
  | { action: "keep"; cookieValue: string };

/** "<session_id>:<ms>" ; l'ancien format (date seule) n'a pas de session. */
export function parseActivityCookie(value: string | undefined): { sessionId: string | null; at: number } {
  if (!value) return { sessionId: null, at: 0 };
  const i = value.lastIndexOf(":");
  const sessionId = i > 0 ? value.slice(0, i) : null;
  const at = Number(i > 0 ? value.slice(i + 1) : value);
  return { sessionId, at: Number.isFinite(at) && at > 0 ? at : 0 };
}

export function formatActivityCookie(sessionId: string | null, at: number): string {
  return sessionId ? `${sessionId}:${at}` : String(at);
}

/**
 * Heure d'ouverture de la session (ms) d'apres les revendications du jeton
 * valide : plus ancien horodatage d'authentification (secondes UNIX).
 */
export function sessionStartFromClaims(claims: { amr?: unknown } | null | undefined): number | null {
  const entries = Array.isArray(claims?.amr) ? claims.amr : [];
  const stamps = entries
    .map((e) => (e && typeof e === "object" ? Number((e as { timestamp?: unknown }).timestamp) : NaN))
    .filter((n) => Number.isFinite(n) && n > 0);
  return stamps.length ? Math.min(...stamps) * 1000 : null;
}

export function evaluateAdminIdle(input: IdleInput): IdleDecision {
  const { now, sessionId, sessionStartMs, timeoutMs, loginInProgress } = input;
  const fresh = formatActivityCookie(sessionId, now);
  if (loginInProgress) return { action: "keep", cookieValue: fresh };

  const cookie = parseActivityCookie(input.cookieValue);
  // Activite d'une autre session (ou ancien format sans session alors que
  // la session courante est identifiee) : ignoree.
  const ownActivity =
    sessionId && cookie.sessionId !== sessionId ? 0 : cookie.at;
  const reference = Math.max(ownActivity, sessionStartMs ?? 0);
  if (reference === 0) return { action: "keep", cookieValue: fresh };
  if (now - reference > timeoutMs) {
    return { action: "logout", reason: ownActivity ? "idle" : "idle_no_activity" };
  }
  return { action: "keep", cookieValue: fresh };
}
