// Repertoire des lieux de la recherche (nov. 2026). AUCUNE liste de lieux en
// dur : tout vient du referentiel de l'admin et des pages du site.
//  - Luxembourg : registre officiel CACLR (lib/geo/lu-localities.ts :
//    localites, commune, canton, codes postaux, quartiers de la Ville) et
//    ses graphies officielles (lib/geo/luxembourg-localities-official.ts,
//    meme registre) ; comparaison des noms par placeKey
//    (lib/geo/lu-place-match.ts) ; coordonnees GeoNames et haversineKm
//    (lib/geo/luxembourg-communes.ts).
//  - Etranger : pays (lib/geo/countries.ts, noms FR, EN, DE), villes des
//    pages de ville (lib/cities.ts) et villes des biens publies (passees par
//    l'appelant).
// Serveur seulement (donnees lourdes), jamais embarque dans le navigateur.
import { LU_COMMUNES, LU_LOCALITIES, LU_QUARTIERS, type LuLocality } from "@/lib/geo/lu-localities";
import { OFFICIAL_LOCALITIES } from "@/lib/geo/luxembourg-localities-official";
import { isLuCountry, placeKey, resolveLuPlace } from "@/lib/geo/lu-place-match";
import { LU_PLACES } from "@/lib/geo/lu-localities";
import { getLocalityCoords, haversineKm } from "@/lib/geo/luxembourg-communes";
import { sortedCountries, countryLabel } from "@/lib/geo/countries";
import { internationalCities, getCityBySlug } from "@/lib/cities";

export type PlaceKind = "lu-locality" | "lu-commune" | "lu-quartier" | "lu-country" | "foreign-city" | "country";

export interface Place {
  kind: PlaceKind;
  /** Nom officiel (localite, commune, quartier), ville ou pays. */
  name: string;
  /** Pays (code ISO). */
  country: string;
  /** Luxembourg : commune et canton du registre. */
  commune?: string;
  canton?: string;
  /** Ville etrangere : cles comparables (nom, alias de sa page). */
  keys?: string[];
}

/** Cle de comparaison (sans accents, majuscules, espaces, tirets, barres). */
export const keyOf = (s: string): string => placeKey(s.replace(/\//g, " "));

/** Variante sans "sur" ("Esch/Alzette" = "Esch-sur-Alzette"). */
function keyVariants(name: string): string[] {
  const words = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  const out = new Set([words.join("")]);
  const noSur = words.filter((w) => w !== "sur" && w !== "s");
  if (noSur.length !== words.length && noSur.length) out.add(noSur.join(""));
  return [...out].filter(Boolean);
}

const cantonOfCommune = new Map(LU_COMMUNES.map((c) => [c.name, c.canton]));
const COMMUNE_NAMES = new Set(LU_COMMUNES.map((c) => c.name));

/** Graphie officielle utilisable (alias du registre : noms propres seulement). */
const goodAlias = (a: string) => /^[A-ZÀ-Ý]/.test(a) && a.length >= 4 && !/[()]/.test(a);

type Index = { exact: Map<string, Place[]>; postal: Map<string, Place[]> };
let INDEX: Index | null = null;

function add(map: Map<string, Place[]>, key: string, place: Place) {
  if (!key) return;
  const list = map.get(key) ?? [];
  if (!list.some((p) => p.kind === place.kind && p.name === place.name && p.commune === place.commune && p.country === place.country)) list.push(place);
  map.set(key, list);
}

function expandPostal(code: string): string[] {
  const m = code.match(/^(\d{4})-(\d{4})$/);
  if (!m) return [code];
  const out: string[] = [];
  for (let n = Number(m[1]); n <= Number(m[2]); n++) out.push(String(n).padStart(4, "0"));
  return out;
}

function luPlaceOf(l: LuLocality): Place {
  // Localite chef-lieu de sa commune (meme nom) : traitee comme la commune
  // (regle : la localite du meme nom d'abord, puis le reste de la commune).
  if (l.name === l.commune) return { kind: "lu-commune", name: l.commune, commune: l.commune, canton: cantonOfCommune.get(l.commune) ?? l.canton, country: "LU" };
  return { kind: "lu-locality", name: l.name, commune: l.commune, canton: l.canton, country: "LU" };
}

const LU_COUNTRY: Place = { kind: "lu-country", name: "Luxembourg", country: "LU" };
const LU_CITY: Place = { kind: "lu-commune", name: "Luxembourg", commune: "Luxembourg", canton: cantonOfCommune.get("Luxembourg") ?? "LUXEMBOURG-VILLE", country: "LU" };

function buildIndex(): Index {
  const exact = new Map<string, Place[]>();
  const postal = new Map<string, Place[]>();
  for (const c of LU_COMMUNES) {
    if (c.name === "Luxembourg") continue;
    const p: Place = { kind: "lu-commune", name: c.name, commune: c.name, canton: c.canton, country: "LU" };
    for (const k of keyVariants(c.name)) add(exact, k, p);
  }
  for (const l of LU_LOCALITIES) {
    const p = l.name === "Luxembourg" ? LU_CITY : luPlaceOf(l);
    for (const code of l.postalCodes) for (const pc of expandPostal(code)) add(postal, pc, p);
    if (l.name === "Luxembourg") continue; // "Luxembourg" seul = le pays (plus bas)
    for (const k of keyVariants(l.name)) add(exact, k, p);
    const official = OFFICIAL_LOCALITIES.find((o) => o.name === l.name && o.commune === l.commune);
    for (const a of official?.aliases ?? []) if (goodAlias(a)) for (const k of keyVariants(a)) add(exact, k, p);
  }
  // Ville de Luxembourg : "Luxembourg" seul (et ses graphies d'un mot)
  // designe le pays ; les graphies de plusieurs mots ("Ville de
  // Luxembourg", "Stadt Luxemburg", "Luxembourg City") et les noms de sa
  // page designent la Ville.
  const lux = OFFICIAL_LOCALITIES.find((o) => o.name === "Luxembourg" && o.commune === "Luxembourg");
  for (const loc of ["fr", "en", "de"]) add(exact, keyOf(countryLabel("LU", loc)), LU_COUNTRY);
  add(exact, "luxembourg", LU_COUNTRY);
  for (const a of lux?.aliases ?? []) {
    if (!goodAlias(a)) continue;
    const multi = /[\s-]/.test(a.trim());
    for (const k of keyVariants(a)) add(exact, k, multi ? LU_CITY : LU_COUNTRY);
  }
  const cityPage = getCityBySlug("luxembourg-ville");
  if (cityPage) for (const n of [cityPage.name.fr, cityPage.name.en, cityPage.name.de, ...(cityPage.aliases ?? [])]) for (const k of keyVariants(n)) if (k !== "luxembourg" && k !== "luxemburg") add(exact, k, LU_CITY);
  // Quartiers de la Ville : nom, chaque partie d'un nom double, sans -Nord/-Sud.
  // Une partie raccourcie ("Belair" de "Belair-Nord") ne prend jamais le
  // nom exact d'un autre quartier.
  const fullParts = new Set(LU_QUARTIERS.flatMap((q) => q.name.split("/").map((s) => keyOf(s.trim()))));
  for (const q of LU_QUARTIERS) {
    const p: Place = { kind: "lu-quartier", name: q.name, commune: q.commune, canton: cantonOfCommune.get(q.commune) ?? "LUXEMBOURG-VILLE", country: "LU" };
    const parts = q.name.split("/").map((s) => s.trim());
    for (const n of [q.name, ...parts]) for (const k of keyVariants(n)) add(exact, k, p);
    for (const part of parts) {
      const short = part.replace(/-(Nord|Sud)$/i, "");
      if (short !== part && !fullParts.has(keyOf(short))) for (const k of keyVariants(short)) add(exact, k, p);
    }
  }
  // Villes etrangeres des pages de ville (noms FR, EN, DE et alias).
  for (const c of internationalCities) {
    const names = [c.name.fr, c.name.en, c.name.de, ...(c.aliases ?? [])];
    const p: Place = { kind: "foreign-city", name: c.name.fr, country: c.country, keys: [...new Set(names.flatMap(keyVariants))] };
    for (const k of p.keys ?? []) add(exact, k, p);
  }
  // Pays (noms FR, EN, DE), sauf le Luxembourg (traite plus haut).
  for (const loc of ["fr", "en", "de"]) {
    for (const c of sortedCountries(loc)) {
      if (c.code === "LU") continue;
      const p: Place = { kind: "country", name: countryLabel(c.code, "fr"), country: c.code };
      for (const k of keyVariants(c.label)) add(exact, k, p);
    }
  }
  return { exact, postal };
}

function index(): Index {
  return (INDEX ??= buildIndex());
}

/** Villes etrangeres des biens publies (ajoutees a la demande, sans doublon). */
export function foreignCityPlaces(rows: { city: string | null; country: string | null }[]): Map<string, Place[]> {
  const out = new Map<string, Place[]>();
  for (const r of rows) {
    if (!r.city || !r.country || isLuCountry(r.country)) continue;
    const code = countryCode(r.country);
    if (!code) continue;
    const p: Place = { kind: "foreign-city", name: r.city, country: code, keys: keyVariants(r.city) };
    for (const k of p.keys ?? []) add(out, k, p);
  }
  return out;
}

/** Lieux exacts d'une cle (registre, pages, pays, puis villes des biens). */
export function lookupExact(key: string, extra?: Map<string, Place[]>): Place[] {
  const own = index().exact.get(key) ?? [];
  const more = extra?.get(key) ?? [];
  return [...own, ...more.filter((m) => !own.some((o) => o.kind === m.kind && keyOf(o.name) === keyOf(m.name)))];
}

/** Localite d'un code postal luxembourgeois (L-8410 ou 8410). */
export function lookupPostal(code: string): Place[] {
  return index().postal.get(code.replace(/^l-?/i, "")) ?? [];
}

/** Toutes les cles connues (recherche tolerante aux fautes). */
export function allKeys(extra?: Map<string, Place[]>): string[] {
  return [...index().exact.keys(), ...(extra ? [...extra.keys()] : [])];
}

/** Code ISO d'un pays enregistre ("Luxembourg", "France", "LU"). */
export function countryCode(value: string | null | undefined): string | null {
  if (!value) return null;
  if (isLuCountry(value)) return "LU";
  if (/^[A-Za-z]{2}$/.test(value.trim())) return value.trim().toUpperCase();
  const k = keyOf(value);
  for (const loc of ["fr", "en", "de"]) {
    const hit = sortedCountries(loc).find((c) => keyOf(c.label) === k);
    if (hit) return hit.code;
  }
  return null;
}

/** Lieu officiel d'un bien du Luxembourg (localite, commune, quartier), ou null. */
export function luPlaceOfProperty(city: string | null | undefined, commune?: string | null): Place | null {
  if (!city) return null;
  const r = resolveLuPlace(LU_PLACES, city, commune);
  if (r.status === "ok") {
    const p = r.place;
    if (p.quartier) return { kind: "lu-quartier", name: p.name, commune: p.commune, canton: cantonOfCommune.get(p.commune) ?? "LUXEMBOURG-VILLE", country: "LU" };
    const loc = LU_LOCALITIES.find((l) => l.name === p.name && l.commune === p.commune);
    if (loc) return luPlaceOf(loc);
  }
  // Ville enregistree = nom d'une commune sans localite du meme nom.
  const k = keyOf(city);
  const c = LU_COMMUNES.find((x) => keyOf(x.name) === k);
  if (c) return { kind: "lu-commune", name: c.name, commune: c.name, canton: c.canton, country: "LU" };
  return null;
}

export function isCommuneName(name: string): boolean {
  return COMMUNE_NAMES.has(name);
}

/** Coordonnees d'un lieu du Luxembourg (GeoNames), ou null. */
export function coordsOf(place: Pick<Place, "name" | "commune"> | null): { lat: number; lng: number } | null {
  if (!place) return null;
  const c = getLocalityCoords(place.name) ?? (place.commune ? getLocalityCoords(place.commune) : null);
  return c ? { lat: c.lat, lng: c.lng } : null;
}

export function distanceKm(a: { lat: number; lng: number } | null, b: { lat: number; lng: number } | null): number {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  return haversineKm(a.lat, a.lng, b.lat, b.lng);
}

/** Nom affichable d'un lieu dans une langue (pays et pages traduits). */
export function placeLabel(p: Place, locale: string): string {
  if (p.kind === "country" || p.kind === "lu-country") return countryLabel(p.country, locale);
  if (p.kind === "foreign-city") {
    const page = internationalCities.find((c) => keyOf(c.name.fr) === keyOf(p.name));
    if (page) return page.name[(locale === "en" || locale === "de" ? locale : "fr") as "fr" | "en" | "de"];
  }
  return p.name;
}
