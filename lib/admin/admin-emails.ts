// lib/admin/admin-emails.ts : source unique des adresses autorisées à
// accéder à l'espace /admin (au-delà de la simple authentification
// Supabase). Valeurs en dur, PAS de variable d'environnement : liste
// courte et connue, le risque de verrouillage (Julien perd l'accès à son
// propre admin suite à une env var mal configurée) est jugé pire que le
// coût d'un redéploiement pour ajouter une adresse.
//
// Comparaison insensible à la casse et aux espaces (isAdminEmail).

export const ADMIN_EMAIL_JULIEN = "admin@mapagroup.org";
export const ADMIN_EMAIL_JBREBION = "j.brebion@mapagroup.org";

export const ADMIN_EMAILS: readonly string[] = [
  ADMIN_EMAIL_JULIEN,
  ADMIN_EMAIL_JBREBION,
];

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const NORMALIZED_ADMIN_EMAILS = new Set(ADMIN_EMAILS.map(normalizeEmail));

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return NORMALIZED_ADMIN_EMAILS.has(normalizeEmail(email));
}
