// Localites du Luxembourg (oct. 2026) : recherche, reconnaissance d'un nom
// officiel et rattachement a une page de ville. Module pur, sans donnees :
// la liste (lib/geo/lu-localities.ts, registre CACLR) est passee en
// argument, pour que l'admin la recoive en prop sans l'embarquer dans son
// JavaScript.
import { normPlace, type CityMatchEntry } from "@/lib/city-match";

/**
 * Localite officielle, ou quartier de la Ville de Luxembourg. `communeOnly` :
 * commune seule, affichee quand une valeur deja enregistree est le nom
 * exact d'une commune (ventes realisees), jamais proposee a la recherche.
 */
export type LuPlace = { name: string; commune: string; quartier?: boolean; communeOnly?: boolean };

/** Cle de comparaison : sans accents, majuscules, espaces ni traits d'union. */
export function placeKey(s: string): string {
  return normPlace(s).replace(/-/g, "");
}

/** Pays enregistre = Luxembourg ? Code "LU" ou nom (biens importes : "Luxembourg"). */
export function isLuCountry(country: string | null | undefined): boolean {
  if (!country) return false;
  const k = placeKey(country);
  return k === "lu" || k === "luxembourg" || k === "luxemburg";
}

/** Localites dont le nom contient la saisie ; celles qui commencent par elle d'abord. */
export function searchLuPlaces(list: LuPlace[], query: string, limit = 8): LuPlace[] {
  const q = placeKey(query);
  if (!q) return [];
  const hits = list.filter((p) => placeKey(p.name).includes(q));
  const starts = (p: LuPlace) => (placeKey(p.name).startsWith(q) ? 0 : 1);
  return hits.sort((a, b) => starts(a) - starts(b) || a.name.localeCompare(b.name, "fr") || a.commune.localeCompare(b.commune, "fr")).slice(0, limit);
}

/**
 * Panneau du champ ville (nov. 2026) : sans saisie, la liste COMPLETE par
 * ordre alphabetique ; avec une saisie, toutes les correspondances (meme
 * comparaison que searchLuPlaces, sans limite). Une commune seule
 * (communeOnly) n'est jamais proposee.
 */
export function filterLuPlaces(list: LuPlace[], query: string): LuPlace[] {
  const choices = list.filter((p) => !p.communeOnly);
  if (!placeKey(query)) return [...choices].sort((a, b) => a.name.localeCompare(b.name, "fr") || a.commune.localeCompare(b.commune, "fr"));
  return searchLuPlaces(choices, query, Infinity);
}

/** Meme localite (nom, commune et nature). */
export function sameLuPlace(a: LuPlace | null | undefined, b: LuPlace | null | undefined): boolean {
  return Boolean(a && b && a.name === b.name && a.commune === b.commune && Boolean(a.quartier) === Boolean(b.quartier) && Boolean(a.communeOnly) === Boolean(b.communeOnly));
}

/** Localite officielle exacte (nom et, si donnee, commune), ou null. */
export function findLuPlace(list: LuPlace[], name: string | null | undefined, commune?: string | null): LuPlace | null {
  if (!name) return null;
  const same = list.filter((p) => p.name === name && (!commune || p.commune === commune));
  return same.length === 1 ? same[0] : null;
}

export type LuResolution =
  | { status: "ok"; place: LuPlace }
  | { status: "ambiguous"; places: LuPlace[] }
  | { status: "none" };

/**
 * Localite officielle correspondant a une ville enregistree ("Mondorf les
 * bains" -> "Mondorf-les-Bains"), sans rien deviner : comparaison sans
 * accents, majuscules, espaces ni traits d'union, et une seule localite.
 * Plusieurs localites du meme nom (Hostert) : la commune enregistree
 * tranche, sinon "ambiguous".
 */
export function resolveLuPlace(list: LuPlace[], raw: string | null | undefined, commune?: string | null): LuResolution {
  if (!raw) return { status: "none" };
  const k = placeKey(raw);
  if (!k) return { status: "none" };
  let places = list.filter((p) => placeKey(p.name) === k);
  if (places.length > 1 && commune) places = places.filter((p) => p.commune === commune);
  if (places.length === 1) return { status: "ok", place: places[0] };
  return places.length ? { status: "ambiguous", places } : { status: "none" };
}

/** Page de la Ville de Luxembourg (commune et quartiers sans page propre). */
export const LUXEMBOURG_CITY_SLUG = "luxembourg-ville";

/**
 * Page d'une localite officielle (rattachement automatique) :
 * - quartier de la Ville : sa page s'il en a une (chaque partie d'un nom
 *   double "Neudorf / Weimershof", sans "-Nord" ni "-Sud" : Bonnevoie-Sud
 *   vers Bonnevoie), sinon Luxembourg-Ville ;
 * - autre localite : la page de sa commune si elle existe (Capellen vers
 *   Mamer, Kleinbettingen vers Steinfort), sinon aucune.
 * `entries` : pages du Luxembourg seulement.
 */
export function luPlacePageSlug(place: LuPlace, entries: CityMatchEntry[]): string | null {
  const pageOf = (name: string) => entries.find((e) => e.keys.includes(normPlace(name)))?.slug ?? null;
  if (place.quartier) {
    for (const part of place.name.split("/").map((s) => s.trim())) {
      const slug = pageOf(part) ?? pageOf(part.replace(/-(Nord|Sud)$/i, ""));
      if (slug) return slug;
    }
    return LUXEMBOURG_CITY_SLUG;
  }
  if (place.commune === "Luxembourg") return LUXEMBOURG_CITY_SLUG;
  return pageOf(place.name) ?? pageOf(place.commune);
}

/**
 * Rattachement automatique d'une ville saisie au Luxembourg : localite
 * officielle reconnue (une seule), puis page de sa commune ou de son
 * quartier. Ville non reconnue ou ambigue : aucune page.
 */
export function luCitySlug(list: LuPlace[], entries: CityMatchEntry[], place: string | null | undefined, commune?: string | null): string | null {
  const r = resolveLuPlace(list, place, commune);
  return r.status === "ok" ? luPlacePageSlug(r.place, entries) : null;
}

/**
 * Ventes realisees (oct. 2026) : le champ enregistre la COMMUNE (lue par le
 * moteur d'estimation, comparaison par commune). Valeur deja enregistree :
 * nom exact d'une commune -> cette commune ; sinon nom d'une seule localite
 * -> cette localite (sa commune sera enregistree) ; sinon rien, sans deviner.
 */
export function resolveSaleCommune(list: LuPlace[], stored: string | null | undefined): LuPlace | null {
  if (!stored) return null;
  const k = placeKey(stored);
  if (!k) return null;
  const commune = [...new Set(list.map((p) => p.commune))].find((c) => placeKey(c) === k);
  if (commune) return { name: commune, commune, communeOnly: true };
  const r = resolveLuPlace(list.filter((p) => !p.quartier), stored);
  return r.status === "ok" ? r.place : null;
}
