// Rattachement d'une localite a une page de ville (oct. 2026). Module pur,
// sans texte : partage par le site (lib/internal-links.ts) et l'admin des
// biens (choix "Page de ville", calcul en direct dans le navigateur).
// Comparaison sans accents, majuscules, espaces ni traits d'union : "Saint
// Tropez", "saint-tropez" et "SAINT TROPEZ" designent la meme localite.

/** Forme comparable d'un nom de lieu. */
export function normPlace(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export type CityMatchEntry = { slug: string; keys: string[]; lu?: boolean };

/** Cles d'une page : identifiant, noms dans les 3 langues, alias. */
export function cityMatchKeys(c: { slug: string; name: { fr: string; en: string; de: string }; aliases?: string[] }): string[] {
  return [...new Set([c.slug, c.name.fr, c.name.en, c.name.de, ...(c.aliases ?? [])].map(normPlace).filter(Boolean))];
}

/** Page de la localite saisie, ou null. */
export function matchCitySlug(entries: CityMatchEntry[], place: string | null | undefined): string | null {
  if (!place) return null;
  const key = normPlace(place);
  if (!key) return null;
  return entries.find((e) => e.keys.includes(key))?.slug ?? null;
}

/**
 * Choix "Page de ville" de l'admin (listing_data.facts.city_page) : absent =
 * automatique (selon la ville saisie), "none" = aucune page, sinon
 * l'identifiant d'une page. Automatique : nom, identifiant ou alias d'une
 * page, sinon `fallback` (bien au Luxembourg : page de la commune ou du
 * quartier de la localite officielle, lib/geo/lu-place-match.ts).
 */
export function resolveCitySlug(
  entries: CityMatchEntry[],
  place: string | null | undefined,
  choice: string | null | undefined,
  fallback?: (place: string | null | undefined) => string | null,
): string | null {
  if (choice === "none") return null;
  if (choice && entries.some((e) => e.slug === choice)) return choice;
  return matchCitySlug(entries, place) ?? fallback?.(place) ?? null;
}
