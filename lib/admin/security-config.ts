// Parametres de securite de l'admin (oct. 2026), source unique. Aucun
// import serveur : utilisable par le proxy, les pages et les composants.

/** Longueur minimale des mots de passe admin (changement et reinitialisation). */
export const ADMIN_PASSWORD_MIN_LENGTH = 14;

/**
 * Deconnexion automatique apres 30 minutes sans activite dans l'admin.
 * Justification : l'admin donne acces aux donnees personnelles des
 * prospects et aux biens ; 30 minutes est la duree d'inactivite maximale
 * retenue par l'OWASP ASVS (niveau 2) pour une application sensible
 * (SUPPOSE, reference a reverifier), et laisse le temps de rediger une
 * fiche sans etre interrompu.
 */
export const ADMIN_IDLE_TIMEOUT_MINUTES = 30;

/**
 * Cookie d'activite : "<session_id>:<horodatage ms>" de la derniere requete
 * admin de la session en cours (lib/admin/idle.ts).
 */
export const ADMIN_ACTIVITY_COOKIE = "mapa_admin_activity";
/**
 * Duree de vie du cookie d'activite (12 h). Son expiration ne prolonge
 * jamais une session : sans trace d'activite, la reference devient
 * l'heure d'ouverture de la session.
 */
export const ADMIN_ACTIVITY_COOKIE_MAX_AGE_SECONDS = 12 * 60 * 60;

/** Page d'inscription ou de verification du second facteur. */
export const ADMIN_MFA_PATH = "/admin/mfa";

/** Longueur maximale du nom d'une Passkey (Supabase accepte 120). */
export const PASSKEY_NAME_MAX_LENGTH = 60;

/** Identifiant de Passkey Supabase (UUID). */
export const PASSKEY_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Pages admin accessibles sans session admin complete. */
export const ADMIN_PUBLIC_PATHS: ReadonlySet<string> = new Set([
  "/admin/login",
  "/admin/auth/callback",
  "/admin/forgot-password",
  "/admin/reset-password",
]);

/**
 * Destination interne sure apres connexion : uniquement un chemin /admin
 * relatif (empeche toute redirection ouverte vers un site externe).
 */
export function safeAdminRedirect(target: string | null | undefined, fallback = "/admin"): string {
  if (!target || !target.startsWith("/admin") || target.startsWith("//")) return fallback;
  if (target.includes("\\") || /[\r\n]/.test(target)) return fallback;
  return target;
}

/**
 * Connexion par Passkey (oct. 2026) : cookie httpOnly d'une tentative
 * ouverte par la verification Turnstile, condition pour journaliser les
 * etapes rapportees par le navigateur.
 */
export const PASSKEY_ATTEMPT_COOKIE = "mapa_passkey_attempt";
export const PASSKEY_ATTEMPT_MAX_AGE_SECONDS = 300;

/** Delais maximaux du parcours (ms) avant message d'erreur. */
export const PASSKEY_SERVER_STEP_TIMEOUT_MS = 20_000;
export const PASSKEY_CEREMONY_TIMEOUT_MS = 90_000;
export const PASSKEY_REPORT_TIMEOUT_MS = 5_000;

/** Etapes que le navigateur peut rapporter au journal. */
export const PASSKEY_CLIENT_STEPS = [
  "ceremony:start",
  "ceremony:ok",
  "ceremony_error",
  "ceremony_timeout",
  "turnstile_error",
  "turnstile_timeout",
  "complete_error",
  "complete_timeout",
] as const;
export type PasskeyClientStep = (typeof PASSKEY_CLIENT_STEPS)[number];
