// Adresse de la page Liste des biens <-> criteres de recherche (nov. 2026).
// L'adresse reflete toujours les filtres compris (pastilles retirables d'un
// clic : meme adresse sans le filtre). Parametres :
//   q        texte libre (analyse cote serveur, lib/search/parse-query.ts)
//   city     lieux separes par des virgules (champ "Ville / quartier" de la
//            liste : meme referentiel et memes regles que le texte libre)
//   near=1   "pres de" ; zone=sud,nord ; country=<code ISO> ;
//   pays     reponse a "Dans quel pays souhaitez-vous chercher ?" (LU, FR, autre, tous)
//   types, type, transaction, budget_min, budget_max, min_bedrooms,
//   min_surface, equip (jardin,terrasse,garage,ascenseur,piscine)
import { AMENITIES, EMPTY_QUERY, parseQuery, type Amenity, type ParsedQuery } from "./parse-query";
import { criteriaFromParsed, type CountryChoice, type SearchCriteria } from "./engine";
import { isZoneKey, type ZoneKey } from "./zones";
import { countryLabel } from "@/lib/geo/countries";
import type { Place } from "./places";

export type SearchParamsRecord = Record<string, string | undefined>;

const PAYS: readonly CountryChoice[] = ["LU", "FR", "autre", "tous"];
const posInt = (v: string | undefined) => {
  const n = Number(v);
  return v && Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
const list = (v: string | undefined) => (v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Nom d'un lieu dans l'adresse (relu a l'identique par l'analyseur). */
export function placeParam(p: Place): string {
  if (p.kind === "lu-commune" && p.name === "Luxembourg") return "Luxembourg-Ville";
  return p.name;
}

function samePlace(a: Place, b: Place) {
  return a.kind === b.kind && a.name === b.name && a.commune === b.commune && a.country === b.country;
}

export interface UrlSearch {
  criteria: SearchCriteria;
  /** Analyse du texte libre q (pour les messages). */
  parsedText: ParsedQuery | null;
  offmarket: boolean;
  /** Lieux saisis mais introuvables dans le referentiel. */
  unknownCities: string[];
}

/** Criteres de l'adresse (texte libre et filtres), analyses cote serveur. */
export function searchFromParams(sp: SearchParamsRecord, extraPlaces?: Map<string, import("./places").Place[]>): UrlSearch {
  const text = (sp.q ?? "").slice(0, 500);
  const parsed = text.trim() ? parseQuery(text, extraPlaces) : null;
  const q: ParsedQuery = parsed ? { ...parsed, places: [...parsed.places], zones: [...parsed.zones], types: [...parsed.types], amenities: [...parsed.amenities] } : { ...EMPTY_QUERY, places: [], zones: [], types: [], amenities: [] };
  const unknownCities: string[] = [];
  for (const c of list(sp.city)) {
    const r = parseQuery(c, extraPlaces);
    if (!r.places.length) unknownCities.push(c);
    for (const p of r.places) if (!q.places.some((x) => samePlace(x, p))) q.places.push(p);
    if (r.near) q.near = true;
    for (const z of r.zones) if (!q.zones.includes(z)) q.zones.push(z);
  }
  const iso = (sp.country ?? "").trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(iso)) {
    const place: Place = iso === "LU" ? { kind: "lu-country", name: "Luxembourg", country: "LU" } : { kind: "country", name: countryLabel(iso, "fr"), country: iso };
    if (!q.places.some((x) => samePlace(x, place))) q.places.push(place);
  }
  if (sp.near === "1") q.near = true;
  for (const z of list(sp.zone)) if (isZoneKey(z) && !q.zones.includes(z as ZoneKey)) q.zones.push(z as ZoneKey);
  for (const t of list(sp.types ?? sp.type)) if (!q.types.includes(t)) q.types.push(t);
  if (sp.transaction === "sale" || sp.transaction === "rent") q.transaction = sp.transaction;
  const offmarket = sp.transaction === "offmarket" || Boolean(parsed?.offmarket);
  q.budgetMin = posInt(sp.budget_min) ?? q.budgetMin;
  q.budgetMax = posInt(sp.budget_max) ?? q.budgetMax;
  q.bedroomsMin = posInt(sp.min_bedrooms) ?? q.bedroomsMin;
  q.surfaceMin = posInt(sp.min_surface) ?? q.surfaceMin;
  for (const a of list(sp.equip)) if ((AMENITIES as readonly string[]).includes(a) && !q.amenities.includes(a as Amenity)) q.amenities.push(a as Amenity);
  const pays = PAYS.find((p) => p === sp.pays) ?? null;
  const understood = Boolean(parsed?.understood);
  const anyFilter = q.places.length > 0 || q.zones.length > 0 || q.types.length > 0 || q.transaction !== null || q.budgetMax !== null || q.budgetMin !== null || q.bedroomsMin !== null || q.surfaceMin !== null || q.amenities.length > 0;
  const criteria = criteriaFromParsed({ ...q, understood: understood || anyFilter }, { text: text || (unknownCities.length && !anyFilter ? unknownCities.join(" ") : ""), countryChoice: pays });
  // Ville saisie introuvable, sans autre critere : demande incomprise.
  if (unknownCities.length && !anyFilter && !understood) criteria.notUnderstood = true;
  criteria.hasQuery = criteria.hasQuery || anyFilter || Boolean(pays);
  return { criteria, parsedText: parsed, offmarket, unknownCities };
}

/** Adresse de la liste des biens pour une analyse (route API, Elena). */
export function paramsFromParsed(q: ParsedQuery, text?: string): URLSearchParams {
  const sp = new URLSearchParams();
  const cities = q.places.filter((p) => p.kind !== "country" && p.kind !== "lu-country").map(placeParam);
  if (cities.length) sp.set("city", [...new Set(cities)].join(","));
  const country = q.places.find((p) => p.kind === "country" || p.kind === "lu-country");
  if (country) sp.set("country", country.country);
  if (q.near) sp.set("near", "1");
  if (q.zones.length) sp.set("zone", q.zones.join(","));
  if (q.types.length) sp.set("types", q.types.join(","));
  if (q.transaction) sp.set("transaction", q.transaction);
  if (q.budgetMin !== null) sp.set("budget_min", String(q.budgetMin));
  if (q.budgetMax !== null) sp.set("budget_max", String(q.budgetMax));
  if (q.bedroomsMin !== null) sp.set("min_bedrooms", String(q.bedroomsMin));
  if (q.surfaceMin !== null) sp.set("min_surface", String(q.surfaceMin));
  if (q.amenities.length) sp.set("equip", q.amenities.join(","));
  if (!q.understood && text?.trim()) sp.set("q", text.trim().slice(0, 200));
  return sp;
}

/** Adresse sans un filtre (pastille retiree), ou avec une valeur changee. */
export function hrefWith(sp: SearchParamsRecord, changes: Record<string, string | null>): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (v && k !== "showAll") out.set(k, v);
  for (const [k, v] of Object.entries(changes)) {
    if (v === null || v === "") out.delete(k);
    else out.set(k, v);
  }
  const s = out.toString();
  return s ? `/biens?${s}` : "/biens";
}

/** Retire une valeur d'une liste separee par des virgules. */
export function withoutItem(value: string | undefined, item: string): string | null {
  const rest = list(value).filter((x) => x !== item);
  return rest.length ? rest.join(",") : null;
}
