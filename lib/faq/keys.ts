// Questions frequentes (oct. 2026) : pages auxquelles une question peut
// etre rattachee. Valeurs fermees, identiques a la contrainte de la table
// (supabase/sql/23_faq.sql). Aucun import serveur : utilisable partout.

export const FAQ_FIXED_KEYS = [
  "agence",
  "accueil",
  "vendre",
  "acheter",
  "louer",
  "estimer",
  "mandat-recherche",
  "off-market",
  "faq-generale",
  "broker-international",
] as const;

export type FaqFixedKey = (typeof FAQ_FIXED_KEYS)[number];
export type FaqLang = "fr" | "en" | "de";
export const FAQ_LANGS: FaqLang[] = ["fr", "en", "de"];

/** Adresse en minuscules, sans accents, chiffres et tirets seulement. */
export function slugKey(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const cityFaqKey = (citySlug: string) => `ville:${slugKey(citySlug)}`;
export const blogFaqKey = (postSlug: string) => `blog:${slugKey(postSlug)}`;

const DYNAMIC = /^(ville|blog):[a-z0-9]+(-[a-z0-9]+)*$/;

export function isFaqPageKey(v: unknown): v is string {
  return typeof v === "string" && ((FAQ_FIXED_KEYS as readonly string[]).includes(v) || DYNAMIC.test(v));
}

/** Chemins publics (sans langue) ou s'affiche une page_key. */
export function faqPagePaths(key: string): string[] {
  const fixed: Record<FaqFixedKey, string[]> = {
    agence: ["/agence-immobiliere-luxembourg"],
    accueil: [""],
    vendre: ["/services/vendre"],
    acheter: ["/services/acheter"],
    louer: ["/services/louer"],
    estimer: ["/services/estimer"],
    "mandat-recherche": ["/mandats/recherche"],
    "off-market": ["/off-market"],
    "faq-generale": ["/faq"],
    "broker-international": ["/services/broker-international"],
  };
  if ((FAQ_FIXED_KEYS as readonly string[]).includes(key)) return fixed[key as FaqFixedKey];
  const [kind, slug] = key.split(":");
  if (kind === "ville" && slug) return [`/villes/${slug}`];
  if (kind === "blog" && slug) return [`/blog/${slug}`];
  return [];
}
