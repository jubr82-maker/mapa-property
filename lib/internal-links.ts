// Maillage interne (oct. 2026) : villes et simulateurs, jusque-la presque
// sans lien entrant (pages villes accessibles seulement depuis d'autres
// villes et le sitemap). Listes courtes, pour ne pas surcharger.
import { cities, type City } from "@/lib/cities";

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

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Page ville correspondant a la ville d'un bien (nom ou slug), si elle existe. */
export function cityForPlace(place: string | null | undefined): City | undefined {
  if (!place) return undefined;
  const key = norm(place);
  return cities.find(
    (c) => c.slug === key || norm(c.name.fr) === key || norm(c.name.en) === key || norm(c.name.de) === key,
  );
}
