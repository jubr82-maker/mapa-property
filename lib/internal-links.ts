// Maillage interne (oct. 2026) : villes et simulateurs, jusque-la presque
// sans lien entrant (pages villes accessibles seulement depuis d'autres
// villes et le sitemap). Listes courtes, pour ne pas surcharger.
import { cities, type City } from "@/lib/cities";
import { cityMatchKeys, matchCitySlug, resolveCitySlug, type CityMatchEntry } from "@/lib/city-match";
import { LU_PLACES } from "@/lib/geo/lu-localities";
import { isLuCountry, luCitySlug } from "@/lib/geo/lu-place-match";

/** Villes mises en avant (pied de page, accueil). */
export const FEATURED_CITY_SLUGS = [
  "luxembourg-ville",
  "kirchberg",
  "belair",
  "limpertsberg",
  "strassen",
  "bertrange",
  "mamer",
  "esch-sur-alzette",
] as const;

export const SIMULATOR_LINKS = [
  { href: "/services/simulateurs/financement", key: "sim_financing" },
  { href: "/services/capacite-emprunt", key: "sim_borrowing" },
  { href: "/services/rendement-locatif", key: "sim_yield" },
] as const;

export function featuredCities(): City[] {
  return FEATURED_CITY_SLUGS.map((s) => cities.find((c) => c.slug === s)).filter((c): c is City => Boolean(c));
}

// Rattachement d'une localite a sa page (oct. 2026) : lib/city-match.ts.
const CITY_ENTRIES: CityMatchEntry[] = cities.map((c) => ({ slug: c.slug, keys: cityMatchKeys(c), lu: c.country === "LU" }));
const LU_ENTRIES = CITY_ENTRIES.filter((e) => e.lu);

/** Page ville correspondant a la ville d'un bien (slug, nom ou alias), si elle existe. */
export function cityForPlace(place: string | null | undefined): City | undefined {
  const slug = matchCitySlug(CITY_ENTRIES, place);
  return slug ? cities.find((c) => c.slug === slug) : undefined;
}

/**
 * Page ville d'un bien : choix "Page de ville" de l'admin s'il existe
 * (listing_data.facts.city_page), sinon la ville saisie et ses alias, sinon
 * (bien au Luxembourg) la page de la commune ou du quartier de sa localite
 * officielle (registre CACLR, lib/geo/lu-localities.ts).
 */
export function cityForProperty(p: { city?: string | null; city_page?: string | null; country?: string | null }): City | undefined {
  const lu = isLuCountry(p.country);
  const slug = resolveCitySlug(CITY_ENTRIES, p.city, p.city_page, lu ? (place) => luCitySlug(LU_PLACES, LU_ENTRIES, place) : undefined);
  return slug ? cities.find((c) => c.slug === slug) : undefined;
}

/** Pages de ville pour le choix de l'admin : identifiant, nom francais, cles de comparaison. */
export function cityPageOptions(): { slug: string; label: string; lu: boolean; keys: string[] }[] {
  // lu : sert aussi au rattachement automatique des localites dans l'admin.
  return cities.map((c) => ({ slug: c.slug, label: c.name.fr, lu: c.country === "LU", keys: cityMatchKeys(c) }));
}
