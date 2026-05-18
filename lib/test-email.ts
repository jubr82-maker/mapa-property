// lib/test-email.ts — détection des emails de test E2E (BUG T7).
//
// Objectif : ne JAMAIS polluer la prod avec les leads/estimations
// générés par les preuves Playwright (e2e.*, scan.*, *@example.*).
// En DEV on autorise (les scripts proof-*.mjs en dépendent) ; en PROD
// on dépose silencieusement (réponse { ok:true } sans INSERT) pour ne
// pas dégrader l'UX d'un éventuel vrai utilisateur.

const TEST_EMAIL_RE = /(@example\.[a-z]+$)|(^(e2e|scan)[.@])/i;

export function isTestEmail(email: unknown): boolean {
  return typeof email === "string" && TEST_EMAIL_RE.test(email.trim());
}

export const IS_PROD = process.env.NODE_ENV === "production";

/** true => l'endpoint doit répondre OK sans persister (prod + email test). */
export function shouldDropTestLead(email: unknown): boolean {
  return IS_PROD && isTestEmail(email);
}
