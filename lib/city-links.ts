// Maillage des pages de ville (nov. 2026, audit SEO du 12/11/2026). Module
// serveur, sans texte : quartiers de Luxembourg-Ville qui ont une page, page
// de la commune d'une ville, voisines indexables. Referentiel : registre
// officiel (lib/geo/lu-localities.ts) et rattachement des localites
// (lib/geo/lu-place-match.ts), memes regles que les fiches de biens.
import { cities, getNearbyCities, type City } from "@/lib/cities";
import { cityMatchKeys, type CityMatchEntry } from "@/lib/city-match";
import { LU_LOCALITIES, LU_QUARTIERS } from "@/lib/geo/lu-localities";
import { LUXEMBOURG_CITY_SLUG, luPlacePageSlug, placeKey } from "@/lib/geo/lu-place-match";
import { isCityIndexable, publishedCountByCity } from "@/lib/city-indexing";

const LU_ENTRIES: CityMatchEntry[] = cities.filter((c) => c.country === "LU").map((c) => ({ slug: c.slug, keys: cityMatchKeys(c), lu: true }));

/** Pages des quartiers de Luxembourg-Ville (d'apres le registre officiel), dans l'ordre de la liste. */
export function quartierCities(): City[] {
  const slugs = new Set(
    LU_QUARTIERS.map((q) => luPlacePageSlug({ name: q.name, commune: q.commune, quartier: true }, LU_ENTRIES)).filter((s): s is string => Boolean(s) && s !== LUXEMBOURG_CITY_SLUG),
  );
  return cities.filter((c) => slugs.has(c.slug));
}

export function isQuartierCity(city: City): boolean {
  return quartierCities().some((c) => c.slug === city.slug);
}

/**
 * Page de la commune d'une ville du Luxembourg : Luxembourg-Ville pour un
 * quartier ; la page de la commune pour une localite d'une autre commune ;
 * rien si la page est deja celle de la commune (ou sans page).
 */
export function communeCityOf(city: City): City | undefined {
  if (city.country !== "LU" || city.slug === LUXEMBOURG_CITY_SLUG) return undefined;
  if (isQuartierCity(city)) return cities.find((c) => c.slug === LUXEMBOURG_CITY_SLUG);
  const loc = LU_LOCALITIES.find((l) => placeKey(l.name) === placeKey(city.name.fr));
  if (!loc || loc.commune === loc.name) return undefined;
  const slug = luPlacePageSlug({ name: loc.commune, commune: loc.commune }, LU_ENTRIES);
  return slug && slug !== city.slug ? cities.find((c) => c.slug === slug) : undefined;
}

/** Test d'indexabilite pour des biens publies donnes (lib/city-indexing.ts). */
export function indexabilityFor(properties: { city?: string | null; city_page?: string | null; country?: string | null }[]): (c: City) => boolean {
  const counts = publishedCountByCity(properties);
  return (c: City) => isCityIndexable(c, counts.get(c.slug) ?? 0);
}

/** Voisines par distance, jamais une ville non indexable. */
export function nearbyIndexableCities(slug: string, properties: { city?: string | null; city_page?: string | null; country?: string | null }[], count = 4): City[] {
  return getNearbyCities(slug, count, indexabilityFor(properties));
}
