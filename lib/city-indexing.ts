// Indexation des pages de villes (oct. 2026, decision de Julien du
// 2026-10-22). Module pur, utilise par la page de ville (balise robots,
// hreflang) et par le sitemap ; teste par scripts/seo/test-city-indexing.mts.
//
// Une page de ville est NON INDEXABLE si et seulement si :
//   - la ville est hors du Luxembourg,
//   - ET aucun bien publie n'y est rattache,
//   - ET elle n'a pas de contenu propre : texte redige dans les trois
//     langues ET fourchette de prix locale (comme toutes les villes du
//     Luxembourg ; aucune ville etrangere n'en a aujourd'hui).
// Toutes les villes du Luxembourg restent indexables. La page reste
// accessible (balise "noindex, follow"), les menus et listes ne changent
// pas. Calcule a chaque generation : des qu'un bien est publie dans la
// ville, la page redevient indexable.
import { cities, type City } from "@/lib/cities";
import { cityForProperty } from "@/lib/internal-links";

/** Contenu propre : texte redige pour la ville (3 langues) et donnees de marche locales. */
export function cityHasOwnContent(city: City): boolean {
  const written = (["fr", "en", "de"] as const).every((l) => (city.intro[l] ?? "").trim().length > 0);
  return written && Boolean(city.priceRange);
}

export function isCityIndexable(city: City, publishedProperties: number): boolean {
  return city.country === "LU" || publishedProperties > 0 || cityHasOwnContent(city);
}

/** Nombre de biens publies par page de ville (meme rattachement que la page : cityForProperty). */
export function publishedCountByCity(properties: { city?: string | null; city_page?: string | null }[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of properties) {
    const c = cityForProperty(p);
    if (c) out.set(c.slug, (out.get(c.slug) ?? 0) + 1);
  }
  return out;
}

/** Pages de villes du sitemap : les seules indexables, pour les biens publies donnes. */
export function indexableCities(properties: { city?: string | null; city_page?: string | null }[]): City[] {
  const counts = publishedCountByCity(properties);
  return cities.filter((c) => isCityIndexable(c, counts.get(c.slug) ?? 0));
}
