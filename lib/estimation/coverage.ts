// Garde de couverture du simulateur d'estimation public (missions
// "estimation limitee au Luxembourg", "couverture des localites" et
// "registre officiel", octobre 2026).
//
// Constat production : une commune francaise (Havange) a produit une
// fourchette de 14 a 19 M EUR, le moteur appliquant des references sans
// aucune donnee pour ce lieu. Deux gardes serveur, jamais contournables
// par le formulaire :
//
//  1. resolveLuxembourgLocation : le lieu saisi doit etre une commune, une
//     localite ou un quartier de Luxembourg-Ville du Registre national des
//     localites et des rues (lib/geo/luxembourg-localities-official.ts,
//     genere par scripts/import-caclr.py), ou un quartier du referentiel
//     prix. Correspondance EXACTE apres normalisation uniquement. Une
//     orthographe approchee n'est JAMAIS corrigee automatiquement :
//     "Havange" (FR) est a une lettre de "Hivange" (LU), "Perl" (DE) de
//     "Merl" (LU). On renvoie des suggestions que le visiteur confirme.
//
//     Les prix de reference sont publies PAR COMMUNE : une localite est
//     rattachee a SA commune officielle (donnee du registre, plus aucune
//     estimation par distance). Un meme nom de localite peut exister dans
//     deux communes (Erpeldange, Hostert...) : la commune choisie par le
//     visiteur departage, sinon on propose les deux.
//
//  2. checkEstimateSanity : au-dela d'un prix au m2 manifestement
//     irrealiste, aucune estimation n'est affichee (renvoi vers contact).
//
// Module serveur uniquement (la table officielle pese ~70 Ko).

import {
  OFFICIAL_COMMUNES,
  OFFICIAL_LOCALITIES,
  OFFICIAL_VDL_QUARTIERS,
} from "@/lib/geo/luxembourg-localities-official";
import {
  LUXEMBOURG_COMMUNES_PRICES,
  VDL_QUARTIERS_PRICES,
} from "@/lib/data/luxembourg-prices";

/** Normalisation : casse, accents, tirets, apostrophes, barres, espaces. */
export function normalizeCommune(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[-_'’./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Lignes du referentiel prix qui ne sont pas des lieux.
const NON_PLACE_ROWS = new Set(["moyenne nationale", "luxembourg ville"]);

// Commune officielle portant les quartiers de Luxembourg-Ville.
const VDL_COMMUNE = "Luxembourg";

/** Un lieu reconnu et la commune (et le quartier VDL) qui portent ses prix. */
export interface LuxembourgPlace {
  /** Nom affiche, unique (precise la commune en cas d'homonymie). */
  name: string;
  /** Commune officielle utilisee pour le calcul. */
  commune: string;
  /** Quartier VDL du referentiel prix si le lieu en est un. */
  quartier?: string;
  /** true si le lieu n'est pas la commune elle-meme (rattachement). */
  attached: boolean;
}

interface PlaceIndex {
  byKey: Map<string, LuxembourgPlace[]>;
  communes: Map<string, string>;
  places: LuxembourgPlace[];
  /** Communes officielles absentes du referentiel prix. */
  communesWithoutPrices: string[];
}

let cache: PlaceIndex | null = null;

function buildIndex(): PlaceIndex {
  // Communes officielles (graphie du registre), cle normalisee.
  const communes = new Map<string, string>();
  for (const c of OFFICIAL_COMMUNES) communes.set(normalizeCommune(c), c);
  const priceKeys = new Set(
    LUXEMBOURG_COMMUNES_PRICES.map((r) => normalizeCommune(r.commune)),
  );
  const communesWithoutPrices = OFFICIAL_COMMUNES.filter(
    (c) => !priceKeys.has(normalizeCommune(c)),
  );
  const priceQuartiers = new Map<string, string>();
  for (const q of VDL_QUARTIERS_PRICES) {
    const k = normalizeCommune(q.quartier);
    if (!NON_PLACE_ROWS.has(k)) priceQuartiers.set(k, q.quartier);
  }

  const byKey = new Map<string, LuxembourgPlace[]>();
  const places: LuxembourgPlace[] = [];
  const add = (keys: string[], place: LuxembourgPlace) => {
    for (const key of keys) {
      const k = normalizeCommune(key);
      if (!k) continue;
      const list = byKey.get(k) ?? [];
      // Un meme lieu (meme commune, meme quartier) n'est indexe qu'une fois.
      if (!list.some((p) => p.commune === place.commune && p.quartier === place.quartier)) {
        list.push(place);
        byKey.set(k, list);
      }
    }
    places.push(place);
  };

  // 1. Communes officielles.
  for (const c of OFFICIAL_COMMUNES) add([c], { name: c, commune: c, attached: false });

  // 2. Quartiers de Luxembourg-Ville : referentiel prix (donnees propres),
  //    puis quartiers officiels du registre (commune Luxembourg).
  for (const q of priceQuartiers.values()) {
    add([q], { name: q, commune: VDL_COMMUNE, quartier: q, attached: false });
  }
  for (const q of OFFICIAL_VDL_QUARTIERS) {
    const k = normalizeCommune(q);
    if (priceQuartiers.has(k)) continue;
    add([q], { name: q, commune: VDL_COMMUNE, attached: true });
  }

  // 3. Localites officielles. Nom affiche precise la commune si le nom
  //    existe dans plusieurs communes ("Erpeldange (Wiltz)").
  const communesByName = new Map<string, Set<string>>();
  for (const l of OFFICIAL_LOCALITIES) {
    const k = normalizeCommune(l.name);
    const set = communesByName.get(k) ?? new Set<string>();
    set.add(l.commune);
    const asCommune = communes.get(k);
    if (asCommune) set.add(asCommune);
    communesByName.set(k, set);
  }
  for (const l of OFFICIAL_LOCALITIES) {
    const k = normalizeCommune(l.name);
    const isCommuneItself = communes.get(k) === l.commune;
    const homonym = (communesByName.get(k)?.size ?? 1) > 1;
    const display =
      homonym && !isCommuneItself && !l.name.includes("(")
        ? `${l.name} (${l.commune})`
        : l.name;
    const place: LuxembourgPlace = isCommuneItself
      ? { name: l.commune, commune: l.commune, attached: false }
      : { name: display, commune: l.commune, attached: true };
    add([l.name, display, ...l.aliases], place);
  }

  // Liste affichee : un lieu par nom.
  const seen = new Set<string>();
  const unique = places.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
  return { byKey, communes, places: unique, communesWithoutPrices };
}

function getIndex(): PlaceIndex {
  if (!cache) cache = buildIndex();
  return cache;
}

/** Liste des lieux proposes au formulaire (nom + commune officielle). */
export function getLuxembourgPlaces(): LuxembourgPlace[] {
  return getIndex().places;
}

/** Communes officielles sans ligne dans le referentiel prix. */
export function getCommunesWithoutPrices(): string[] {
  return getIndex().communesWithoutPrices;
}

/** Nom officiel d'une commune, ou null. */
export function findOfficialCommune(input: string | null | undefined): string | null {
  if (!input) return null;
  return getIndex().communes.get(normalizeCommune(input)) ?? null;
}

function levenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** Suggestion a confirmer : nom affiche + commune officielle. */
export interface PlaceSuggestion {
  name: string;
  commune: string;
}

export type LocationResolution =
  | { status: "exact"; place: LuxembourgPlace }
  | { status: "suggest"; suggestions: PlaceSuggestion[] }
  | { status: "unknown" };

const MAX_SUGGESTIONS = 3;

const toSuggestion = (p: LuxembourgPlace): PlaceSuggestion => ({
  name: p.name,
  commune: p.commune,
});

/**
 * Resout le lieu saisi. La commune officielle du registre fait foi ;
 * `communeChoice` (commune selectionnee dans le formulaire) ne sert qu'a
 * departager deux lieux homonymes.
 */
export function resolveLuxembourgLocation(
  input: string | null | undefined,
  communeChoice?: string | null,
): LocationResolution {
  if (!input) return { status: "unknown" };
  const q = normalizeCommune(input);
  if (!q) return { status: "unknown" };
  const { byKey } = getIndex();
  const found = byKey.get(q);
  if (found && found.length > 0) {
    if (found.length === 1) return { status: "exact", place: found[0] };
    const chosen = findOfficialCommune(communeChoice);
    const match = chosen ? found.filter((p) => p.commune === chosen) : [];
    if (match.length >= 1) return { status: "exact", place: match[0] };
    return {
      status: "suggest",
      suggestions: found.slice(0, MAX_SUGGESTIONS * 2).map(toSuggestion),
    };
  }

  // Tolerance : 1 faute pour les noms courts (< 8 caracteres), 2 au-dela.
  // Jamais d'acceptation automatique, seulement des suggestions.
  if (q.length < 4) return { status: "unknown" };
  const tol = q.length < 8 ? 1 : 2;
  const scored = new Map<string, { place: LuxembourgPlace; d: number }>();
  for (const [k, list] of byKey) {
    const d = levenshtein(q, k, tol);
    if (d > tol) continue;
    for (const place of list) {
      const prev = scored.get(place.name);
      if (!prev || d < prev.d) scored.set(place.name, { place, d });
    }
  }
  if (scored.size === 0) return { status: "unknown" };
  const suggestions = [...scored.values()]
    .sort((a, b) => a.d - b.d || a.place.name.localeCompare(b.place.name, "fr"))
    .slice(0, MAX_SUGGESTIONS)
    .map((x) => toSuggestion(x.place));
  return { status: "suggest", suggestions };
}

// ---------------------------------------------------------------------------
// Seuils de vraisemblance
// ---------------------------------------------------------------------------
// Donnees reelles du depot (lib/data/luxembourg-prices.ts, Observatoire de
// l'Habitat 2025, publication mars 2026) :
//   - prix annonce le plus eleve : 14 273 EUR/m2 (appartements, Belair)
//   - borne haute la plus elevee d'une fourchette notariee : 14 075 EUR/m2
//   - VEFA la plus chere : 12 805 EUR/m2 (Hesperange)
// Les coefficients cumules du moteur (surface studio 1,25, penthouse 1,3,
// CPE 1,08) peuvent porter un bien prime a ~23 000 EUR/m2. Seuil retenu :
// 30 000 EUR/m2 habitable, soit plus de 2 fois le maximum observe.
export const MAX_PRICE_PER_SQM_LIVING = 30_000;
// Terrain : zone foncière la plus chere 2 728 EUR/m2 (Luxembourg-Ville,
// lib/estimation/land-zones.ts) ; seuil a un peu plus de 2 fois.
export const MAX_PRICE_PER_SQM_LAND = 6_000;
// Plafond absolu (protege contre une surface saisie avec des zeros en trop) :
// 1 000 m2 au prix notarie le plus eleve = 14 M EUR ; marge incluse.
export const MAX_TOTAL_PRICE = 25_000_000;

export function checkEstimateSanity(args: {
  mid: number;
  surface: number;
  isLand: boolean;
}): { ok: true } | { ok: false; reason: string } {
  const { mid, surface, isLand } = args;
  if (!Number.isFinite(mid) || mid <= 0) return { ok: false, reason: "non_positive" };
  if (mid > MAX_TOTAL_PRICE) return { ok: false, reason: "total_cap" };
  if (surface > 0) {
    const cap = isLand ? MAX_PRICE_PER_SQM_LAND : MAX_PRICE_PER_SQM_LIVING;
    if (mid / surface > cap) return { ok: false, reason: "per_sqm_cap" };
  }
  return { ok: true };
}
