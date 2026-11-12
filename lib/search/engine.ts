// Regles d'affichage de la recherche (nov. 2026, validees par Julien). Module
// pur, partage par la page Liste des biens, /api/search-ia et Elena :
//  1. localite du Luxembourg : seulement ses biens ; si aucun, "Aucun bien
//     disponible a <lieu> pour le moment" puis "A proximite" (meme commune,
//     puis meme canton, tries par distance) ;
//  2. commune : la localite du meme nom d'abord, puis le reste de la commune ;
//  3. quartier de Luxembourg-Ville : ce quartier d'abord, puis le reste de la Ville ;
//  4. "Luxembourg" seul : tout le pays, suggestion "Uniquement Luxembourg-Ville ?" ;
//  5. ville etrangere : cette ville, puis le reste du pays ; 6. pays : tout le pays ;
//  7. aucun lieu : les biens du Luxembourg d'abord, et la question du pays ;
//  8. plusieurs lieux : leur ensemble ; 9. "pres de" : localite, commune et
//     communes voisines par distance ; 10. zones : les cantons de la liste ;
//  11. equipements demandes : ces biens en premier ;
//  12. demande incomprise : jamais tous les biens en silence ;
//  13. aucun resultat : on relache UN critere a la fois (equipements,
//     chambres, surface, budget jusqu'a 15 % au-dessus, lieu elargi a la
//     commune puis au canton) ;
//  15. seuls les biens publies sont recus (jamais l'off-market detaille).
import { matchesTypeQuery } from "@/lib/property-types";
import { availableFirst } from "@/lib/property-banner";
import { coordsOf, countryCode, distanceKm, keyOf, luPlaceOfProperty, type Place } from "./places";
import { expandedTypes, type Amenity, type ParsedQuery } from "./parse-query";
import { zoneCantons } from "./zones";

/** Biens consideres comme proches pour "pres de" (en plus de la commune). */
export const NEAR_KM = 10;
/** Budget relache : jusqu'a 15 % au-dessus du maximum. */
export const BUDGET_SLACK = 0.15;

export type CountryChoice = "LU" | "FR" | "autre" | "tous";

export interface SearchCriteria extends Omit<ParsedQuery, "understood" | "luxury" | "offmarket"> {
  countryChoice: CountryChoice | null;
  /** Texte saisi sans rien d'utile reconnu (regle 12). */
  notUnderstood: boolean;
  /** Une recherche a ete faite (filtre ou texte), pour la question du pays. */
  hasQuery: boolean;
}

export type Relaxed = "amenities" | "bedrooms" | "surface" | "budget" | "commune" | "canton" | "all";

export interface SearchableProperty {
  id: string;
  country: string | null;
  city: string | null;
  city_commune?: string | null;
  transaction: string | null;
  property_type?: string | null;
  price: number | null;
  bedrooms: number | null;
  surface: number | null;
  living_surface?: number | null;
  title_fr?: string | null;
  amenities?: string | null;
  has_pool?: boolean | null;
  parking?: number | null;
  terrace_surface?: number | null;
  garden_surface?: number | null;
}

export interface SearchOutcome<T> {
  main: T[];
  /** "A proximite" (regle 1) quand le lieu n'a aucun bien. */
  nearby: T[];
  /** Lieu sans bien : "Aucun bien disponible a <lieu> pour le moment". */
  emptyPlace: Place | null;
  relaxed: Relaxed[];
  /** "Uniquement Luxembourg-Ville ?" (regle 4). */
  suggestCity: boolean;
  /** "Dans quel pays souhaitez-vous chercher ?" (regle 7). */
  askCountry: boolean;
  notUnderstood: boolean;
}

type Info = { iso: string | null; lu: Place | null; coords: { lat: number; lng: number } | null };
const infoCache = new WeakMap<object, Info>();
function infoOf(p: SearchableProperty): Info {
  let i = infoCache.get(p);
  if (!i) {
    const iso = countryCode(p.country);
    const lu = iso === "LU" ? luPlaceOfProperty(p.city, p.city_commune) : null;
    i = { iso, lu, coords: lu ? coordsOf(lu) : null };
    infoCache.set(p, i);
  }
  return i;
}

const AMENITY_TEXT: Record<Amenity, RegExp> = {
  jardin: /jardin|garden|garten/i,
  terrasse: /terrasse|terrace/i,
  garage: /garage|parking|stellplatz|carport/i,
  ascenseur: /ascenseur|elevator|\blift\b|aufzug|fahrstuhl/i,
  piscine: /piscine|\bpool\b|schwimmbad/i,
};

export function hasAmenity(p: SearchableProperty, a: Amenity): boolean {
  const text = `${p.amenities ?? ""} ${p.title_fr ?? ""}`;
  if (a === "jardin" && (p.garden_surface ?? 0) > 0) return true;
  if (a === "terrasse" && (p.terrace_surface ?? 0) > 0) return true;
  if (a === "garage" && (p.parking ?? 0) > 0) return true;
  if (a === "piscine" && p.has_pool === true) return true;
  return AMENITY_TEXT[a].test(text);
}

interface Hard {
  bedrooms: boolean;
  surface: boolean;
  budgetSlack: boolean;
}

function passes(p: SearchableProperty, c: SearchCriteria, h: Hard): boolean {
  if (c.transaction && p.transaction !== c.transaction) return false;
  if (c.types.length) {
    if (!p.property_type || !matchesTypeQuery(p.property_type, expandedTypes(c.types))) return false;
  }
  if (c.budgetMax !== null && p.price !== null) {
    const max = h.budgetSlack ? c.budgetMax * (1 + BUDGET_SLACK) : c.budgetMax;
    if (p.price > max) return false;
  }
  if (c.budgetMin !== null && p.price !== null && p.price < c.budgetMin) return false;
  if (h.bedrooms && c.bedroomsMin !== null && (p.bedrooms ?? 0) < c.bedroomsMin) return false;
  if (h.surface && c.surfaceMin !== null && Math.max(p.surface ?? 0, p.living_surface ?? 0) < c.surfaceMin) return false;
  return true;
}

const byDistance = (center: { lat: number; lng: number } | null) => (a: SearchableProperty, b: SearchableProperty) =>
  distanceKm(center, infoOf(a).coords) - distanceKm(center, infoOf(b).coords);

type Scope = "place" | "commune" | "canton";

/** Biens d'un lieu, dans l'ordre des regles 1 a 6 et 9 ; nearby : regle 1. */
function placeLists<T extends SearchableProperty>(pool: T[], place: Place, near: boolean, scope: Scope): { main: T[]; nearby: T[] } {
  const center = place.country === "LU" ? coordsOf(place) : null;
  const lu = (p: T) => infoOf(p).lu;
  const inLu = pool.filter((p) => infoOf(p).iso === "LU");
  if (place.kind === "lu-country") return { main: inLu, nearby: [] };
  if (place.kind === "country") return { main: pool.filter((p) => infoOf(p).iso === place.country), nearby: [] };
  if (place.kind === "foreign-city") {
    const keys = new Set(place.keys ?? [keyOf(place.name)]);
    const same = pool.filter((p) => infoOf(p).iso === place.country && p.city && keys.has(keyOf(p.city)));
    const rest = pool.filter((p) => infoOf(p).iso === place.country && !same.includes(p));
    return { main: [...same, ...rest], nearby: [] };
  }
  const canton = (p: T) => lu(p)?.canton;
  const sameCanton = (p: T) => {
    const c = canton(p);
    // La Ville de Luxembourg forme son propre canton dans le registre.
    const norm = (x: string | undefined) => (x === "LUXEMBOURG-VILLE" ? "LUXEMBOURG" : x);
    return Boolean(c) && norm(c) === norm(place.canton);
  };
  if (scope === "canton") return { main: inLu.filter(sameCanton).sort(byDistance(center)), nearby: [] };
  if (near) {
    const main = inLu.filter((p) => lu(p)?.commune === place.commune || distanceKm(center, infoOf(p).coords) <= NEAR_KM).sort(byDistance(center));
    return { main, nearby: [] };
  }
  const inCommune = inLu.filter((p) => lu(p)?.commune === place.commune);
  if (place.kind === "lu-locality" && scope === "place") {
    const main = inCommune.filter((p) => lu(p)?.kind === "lu-locality" && lu(p)?.name === place.name);
    const nearby = main.length ? [] : [...inCommune.sort(byDistance(center)), ...inLu.filter((p) => sameCanton(p) && lu(p)?.commune !== place.commune).sort(byDistance(center))];
    return { main, nearby };
  }
  if (place.kind === "lu-quartier" && scope === "place") {
    const first = inCommune.filter((p) => lu(p)?.kind === "lu-quartier" && lu(p)?.name === place.name);
    const main = [...first, ...inCommune.filter((p) => !first.includes(p))];
    const nearby = main.length ? [] : inLu.filter((p) => sameCanton(p) && lu(p)?.commune !== place.commune).sort(byDistance(center));
    return { main, nearby };
  }
  // Commune (ou lieu elargi a sa commune) : la localite du meme nom d'abord.
  const first = inCommune.filter((p) => lu(p)?.name === place.commune);
  const main = [...first, ...inCommune.filter((p) => !first.includes(p)).sort(byDistance(center))];
  const nearby = main.length ? [] : inLu.filter((p) => sameCanton(p) && lu(p)?.commune !== place.commune).sort(byDistance(center));
  return { main, nearby };
}

function uniq<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

/** Ordre final : equipements demandes d'abord, vente avant location sans precision, Vendu et Loue a la fin. */
function order<T extends SearchableProperty>(list: T[], c: SearchCriteria): T[] {
  const score = (p: T) => c.amenities.filter((a) => hasAmenity(p, a)).length;
  const indexed = list.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => {
    if (c.amenities.length) {
      const d = score(b.p) - score(a.p);
      if (d) return d;
    }
    if (!c.transaction) {
      const ta = a.p.transaction === "rent" ? 1 : 0;
      const tb = b.p.transaction === "rent" ? 1 : 0;
      if (ta !== tb) return ta - tb;
    }
    return a.i - b.i;
  });
  return availableFirst(indexed.map((x) => x.p));
}

function locate<T extends SearchableProperty>(pool: T[], c: SearchCriteria, scope: Scope): { main: T[]; nearby: T[]; emptyPlace: Place | null } {
  const hasPlace = c.places.length > 0 || c.zones.length > 0;
  if (!hasPlace) {
    const lu = pool.filter((p) => infoOf(p).iso === "LU");
    const fr = pool.filter((p) => infoOf(p).iso === "FR");
    switch (c.countryChoice) {
      case "LU":
        return { main: lu, nearby: [], emptyPlace: null };
      case "FR":
        return { main: fr, nearby: [], emptyPlace: null };
      case "autre":
        return { main: pool.filter((p) => !lu.includes(p) && !fr.includes(p)), nearby: [], emptyPlace: null };
      default:
        return { main: [...lu, ...pool.filter((p) => !lu.includes(p))], nearby: [], emptyPlace: null };
    }
  }
  const main: T[] = [];
  const nearby: T[] = [];
  let emptyPlace: Place | null = null;
  for (const place of c.places) {
    const r = placeLists(pool, place, c.near, scope);
    main.push(...r.main);
    nearby.push(...r.nearby);
    if (!r.main.length && !emptyPlace && c.places.length === 1) emptyPlace = place;
  }
  for (const z of c.zones) {
    const cantons = new Set(zoneCantons(z));
    main.push(...pool.filter((p) => infoOf(p).iso === "LU" && cantons.has(infoOf(p).lu?.canton ?? "")));
  }
  const mainU = uniq(main);
  return { main: mainU, nearby: uniq(nearby).filter((p) => !mainU.includes(p)), emptyPlace: mainU.length ? null : emptyPlace };
}

/** Recherche complete : regles 1 a 13 sur les biens publies. */
export function runSearch<T extends SearchableProperty>(all: T[], c: SearchCriteria): SearchOutcome<T> {
  const suggestCity = c.places.some((p) => p.kind === "lu-country") && !c.places.some((p) => p.country === "LU" && p.kind !== "lu-country");
  const askCountry = c.hasQuery && c.places.length === 0 && c.zones.length === 0 && c.countryChoice === null;
  if (c.notUnderstood) return { main: [], nearby: [], emptyPlace: null, relaxed: [], suggestCity: false, askCountry: false, notUnderstood: true };

  const attempt = (h: Hard, scope: Scope) => {
    const pool = all.filter((p) => passes(p, c, h));
    return locate(pool, c, scope);
  };
  const strict: Hard = { bedrooms: true, surface: true, budgetSlack: false };
  let r = attempt(strict, "place");
  const relaxed: Relaxed[] = [];
  if (!r.main.length && !r.nearby.length) {
    // Regle 13 : un critere de plus a chaque etape, dans cet ordre.
    const h = { ...strict };
    // Equipements : classement seulement (regle 11), annonces plus bas.
    const steps: { key: Relaxed; on: boolean; apply: () => Scope | void }[] = [
      { key: "bedrooms", on: c.bedroomsMin !== null, apply: () => void (h.bedrooms = false) },
      { key: "surface", on: c.surfaceMin !== null, apply: () => void (h.surface = false) },
      { key: "budget", on: c.budgetMax !== null, apply: () => void (h.budgetSlack = true) },
      { key: "commune", on: c.places.some((p) => p.kind === "lu-locality" || p.kind === "lu-quartier"), apply: () => "commune" },
      { key: "canton", on: c.places.some((p) => p.country === "LU" && p.kind !== "lu-country"), apply: () => "canton" },
    ];
    let scope: Scope = "place";
    for (const s of steps) {
      if (!s.on) continue;
      scope = s.apply() ?? scope;
      relaxed.push(s.key);
      r = attempt(h, scope);
      if (r.main.length || r.nearby.length) break;
    }
    // Jamais de page vide : en dernier recours, tous nos biens disponibles
    // (Luxembourg d'abord), sans aucun critere.
    if (!r.main.length && !r.nearby.length) {
      const lu = all.filter((p) => infoOf(p).iso === "LU");
      r = { main: [...lu, ...all.filter((p) => !lu.includes(p))], nearby: [], emptyPlace: r.emptyPlace };
      relaxed.length = 0;
      relaxed.push("all");
    }
  }
  const main = order(r.main, c);
  const nearby = order(r.nearby, c);
  // Equipements demandes sans aucun bien qui les a : relache et annonce.
  if (c.amenities.length && [...main, ...nearby].length && ![...main, ...nearby].some((p) => c.amenities.some((a) => hasAmenity(p, a)))) relaxed.unshift("amenities");
  return { main, nearby, emptyPlace: r.emptyPlace, relaxed, suggestCity, askCountry, notUnderstood: false };
}

/** Criteres d'une analyse de texte (sans choix de pays). */
export function criteriaFromParsed(q: ParsedQuery, opts: { text?: string; countryChoice?: CountryChoice | null } = {}): SearchCriteria {
  return {
    places: q.places,
    near: q.near,
    zones: q.zones,
    types: q.types,
    transaction: q.transaction,
    budgetMin: q.budgetMin,
    budgetMax: q.budgetMax,
    bedroomsMin: q.bedroomsMin,
    surfaceMin: q.surfaceMin,
    amenities: q.amenities,
    countryChoice: opts.countryChoice ?? null,
    notUnderstood: Boolean(opts.text?.trim()) && !q.understood,
    hasQuery: Boolean(opts.text?.trim()) || q.understood,
  };
}
