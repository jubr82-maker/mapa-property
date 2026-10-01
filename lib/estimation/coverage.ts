// Garde de couverture du simulateur d'estimation public (missions
// "estimation limitee au Luxembourg" et "couverture des localites",
// octobre 2026).
//
// Constat production : une commune francaise (Havange) a produit une
// fourchette de 14 a 19 M EUR, le moteur appliquant des references sans
// aucune donnee pour ce lieu. Deux gardes serveur, jamais contournables
// par le formulaire :
//
//  1. resolveLuxembourgLocation : le lieu saisi doit etre une commune du
//     referentiel prix Observatoire, un quartier de Luxembourg-Ville, ou une
//     localite de la liste GeoNames du depot
//     (lib/geo/luxembourg-localities.json). Correspondance EXACTE apres
//     normalisation uniquement. Une orthographe approchee n'est JAMAIS
//     corrigee automatiquement : "Havange" (FR) est a une lettre de
//     "Hivange" (LU), "Perl" (DE) de "Merl" (LU). On renvoie des
//     suggestions que le visiteur confirme lui-meme.
//
//     Les prix de reference sont publies PAR COMMUNE : une localite sans
//     donnees propres (Hagen) est rattachee a une commune pour le calcul.
//     La liste GeoNames ne porte pas la commune de chaque localite ; le
//     rattachement automatique prend le siege communal le plus proche dans
//     le meme canton. Il est APPROXIMATIF (118/142 sur le jeu de controle de
//     la mission d'octobre 2026) : le formulaire l'affiche comme commune
//     proposee, modifiable, et la commune choisie par le visiteur prime.
//
//  2. checkEstimateSanity : au-dela d'un prix au m2 manifestement
//     irrealiste, aucune estimation n'est affichee (renvoi vers contact).
//
// Module serveur uniquement (le JSON des localites pese ~160 Ko).

import localities from "@/lib/geo/luxembourg-localities.json";
import { haversineKm } from "@/lib/geo/luxembourg-communes";
import {
  LUXEMBOURG_COMMUNES_PRICES,
  VDL_QUARTIERS_PRICES,
} from "@/lib/data/luxembourg-prices";

interface RawLocality {
  name: string;
  asciiname: string;
  alternateNames: string[];
  lat: number;
  lng: number;
  featureCode: string;
  canton?: string;
}

/** Normalisation : casse, accents, tirets, apostrophes, espaces multiples. */
export function normalizeCommune(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[-_'’.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Les alternateNames GeoNames contiennent des graphies cyrilliques, arabes,
// etc. : seules les graphies latines sont utiles a une saisie FR/EN/DE.
const LATIN_ONLY = /^[\p{Script=Latin}\s\-'’.()]+$/u;

// Lignes du referentiel prix qui ne sont pas des lieux.
const NON_PLACE_ROWS = new Set(["moyenne nationale"]);

// Commune portant les quartiers VDL dans le referentiel prix.
const VDL_COMMUNE = "Luxembourg";

// Sieges GeoNames (anciennes communes) dont la commune actuelle, issue d'une
// fusion, porte un autre nom dans le referentiel prix. Fusions communales
// officielles, a verifier contre le Registre national des localites et des
// rues (cf. rapport de mission) : SUPPOSE, pas derive des donnees du depot.
const SEAT_TO_MERGED_COMMUNE: Record<string, string> = {
  bascharage: "Käerjeng",
  capellen: "Mamer",
  medernach: "Vallée de l'Ernz",
  hosingen: "Parc Hosingen",
  rosport: "Rosport-Mompach",
  mompach: "Rosport-Mompach",
  grosbous: "Groussbus-Wal",
  wahl: "Groussbus-Wal",
  tuntange: "Helperknapp",
  "boevange sur attert": "Helperknapp",
  bous: "Bous-Waldbredimus",
  waldbredimus: "Bous-Waldbredimus",
  septfontaines: "Habscht",
  wilwerwiltz: "Kiischpelt",
  bettborn: "Préizerdaul",
  bavigne: "Lac de la Haute-Sûre",
};

const SEAT_CODES = new Set(["PPLA", "PPLA2", "PPLA3", "PPLC"]);

/** Un lieu reconnu et la commune (et le quartier VDL) qui portent ses prix. */
export interface LuxembourgPlace {
  /** Nom affiche (graphie canonique). */
  name: string;
  /** Commune du referentiel prix utilisee pour le calcul. */
  commune: string;
  /** Quartier VDL si le lieu en est un. */
  quartier?: string;
  /** true si le lieu n'a pas de donnees propres (rattachement). */
  attached: boolean;
}

interface PlaceIndex {
  byKey: Map<string, LuxembourgPlace>;
  communes: Map<string, string>;
  places: LuxembourgPlace[];
}

let cache: PlaceIndex | null = null;

function buildIndex(): PlaceIndex {
  const communes = new Map<string, string>();
  for (const r of LUXEMBOURG_COMMUNES_PRICES) {
    const k = normalizeCommune(r.commune);
    if (!NON_PLACE_ROWS.has(k) && !communes.has(k)) communes.set(k, r.commune);
  }
  const all = localities as RawLocality[];
  const latinNames = (l: RawLocality) =>
    [l.name, l.asciiname, ...l.alternateNames].filter(
      (x) => x && LATIN_ONLY.test(x),
    );
  const ownCommune = (l: RawLocality) =>
    latinNames(l)
      .map((x) => communes.get(normalizeCommune(x)))
      .find(Boolean);

  const seats = all
    .filter((l) => SEAT_CODES.has(l.featureCode))
    .map((l) => ({
      l,
      commune: ownCommune(l) ?? SEAT_TO_MERGED_COMMUNE[normalizeCommune(l.name)],
    }))
    .filter((x): x is { l: RawLocality; commune: string } => Boolean(x.commune));

  const attach = (l: RawLocality): string | undefined => {
    let best: { commune: string; km: number } | null = null;
    for (const s of seats) {
      if (s.l.canton !== l.canton) continue;
      const km = haversineKm(l.lat, l.lng, s.l.lat, s.l.lng);
      if (!best || km < best.km) best = { commune: s.commune, km };
    }
    return best?.commune;
  };

  const byKey = new Map<string, LuxembourgPlace>();
  const places: LuxembourgPlace[] = [];
  const add = (keys: string[], place: LuxembourgPlace) => {
    let added = false;
    for (const key of keys) {
      const k = normalizeCommune(key);
      if (k && !byKey.has(k)) {
        byKey.set(k, place);
        added = true;
      }
    }
    if (added) places.push(place);
  };

  // Priorite 1 : communes du referentiel prix (donnees propres).
  for (const [k, commune] of communes) {
    add([k], { name: commune, commune, attached: false });
  }
  // Priorite 2 : quartiers de Luxembourg-Ville (donnees propres).
  for (const q of VDL_QUARTIERS_PRICES) {
    if (NON_PLACE_ROWS.has(normalizeCommune(q.quartier))) continue;
    add([q.quartier], {
      name: q.quartier,
      commune: VDL_COMMUNE,
      quartier: q.quartier,
      attached: false,
    });
  }
  // Priorite 3 : localites GeoNames et leurs graphies latines
  // (Petingen -> Petange, Hoen -> Hagen), rattachees a leur commune.
  for (const l of all) {
    const own = ownCommune(l);
    const commune = own ?? attach(l);
    if (!commune) continue;
    add(latinNames(l), { name: l.name, commune, attached: !own });
  }
  return { byKey, communes, places };
}

function getIndex(): PlaceIndex {
  if (!cache) cache = buildIndex();
  return cache;
}

/** Liste des lieux proposes au formulaire (nom + commune proposee). */
export function getLuxembourgPlaces(): LuxembourgPlace[] {
  // Homonymes (deux "Reckange"...) : une seule entree par nom, la premiere
  // (communes d'abord, puis localites par population decroissante).
  const seen = new Set<string>();
  return getIndex().places.filter((p) => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });
}

/** Nom canonique d'une commune du referentiel prix, ou null. */
export function findPriceCommune(input: string | null | undefined): string | null {
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

export type LocationResolution =
  | { status: "exact"; place: LuxembourgPlace }
  | { status: "suggest"; suggestions: string[] }
  | { status: "unknown" };

const MAX_SUGGESTIONS = 3;

/**
 * Resout le lieu saisi. `communeChoice` = commune choisie par le visiteur
 * dans le formulaire : si c'est une commune valide du referentiel prix, elle
 * prime sur le rattachement automatique (le visiteur connait sa commune).
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
  if (found) {
    const chosen = findPriceCommune(communeChoice);
    if (!chosen || chosen === found.commune) return { status: "exact", place: found };
    // Commune choisie differente : elle prime ; un quartier VDL n'a plus
    // de sens hors Luxembourg-Ville.
    return {
      status: "exact",
      place: {
        name: found.name,
        commune: chosen,
        quartier: chosen === VDL_COMMUNE ? found.quartier : undefined,
        attached: normalizeCommune(found.name) !== normalizeCommune(chosen),
      },
    };
  }

  // Tolerance : 1 faute pour les noms courts (< 8 caracteres), 2 au-dela.
  // Jamais d'acceptation automatique, seulement des suggestions.
  if (q.length < 4) return { status: "unknown" };
  const tol = q.length < 8 ? 1 : 2;
  const scored = new Map<string, number>();
  for (const [k, place] of byKey) {
    const d = levenshtein(q, k, tol);
    if (d <= tol) {
      const prev = scored.get(place.name);
      if (prev === undefined || d < prev) scored.set(place.name, d);
    }
  }
  if (scored.size === 0) return { status: "unknown" };
  const suggestions = [...scored.entries()]
    .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0], "fr"))
    .slice(0, MAX_SUGGESTIONS)
    .map(([name]) => name);
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
