// Garde de couverture du simulateur d'estimation public (mission
// "estimation limitee au Luxembourg", octobre 2026).
//
// Constat production : une commune francaise (Havange) a produit une
// fourchette de 14 a 19 M EUR, le moteur appliquant des references sans
// aucune donnee pour ce lieu. Deux gardes serveur, jamais contournables
// par le formulaire :
//
//  1. resolveLuxembourgCommune : la commune doit appartenir au referentiel
//     officiel des localites luxembourgeoises (GeoNames, 600 localites,
//     lib/geo/luxembourg-localities.json) ou au referentiel prix
//     Observatoire (communes fusionnees type Kaerjeng, quartiers VDL).
//     Correspondance EXACTE apres normalisation uniquement. Une orthographe
//     approchee n'est JAMAIS corrigee automatiquement : "Havange" (FR) est a
//     une lettre de "Hivange" (LU), "Perl" (DE) de "Merl" (LU). On renvoie
//     des suggestions que le visiteur confirme lui-meme.
//
//  2. checkEstimateSanity : au-dela d'un prix au m2 manifestement
//     irrealiste, aucune estimation n'est affichee (renvoi vers contact).
//
// Module serveur uniquement (le JSON des localites pese ~160 Ko).

import localities from "@/lib/geo/luxembourg-localities.json";
import {
  LUXEMBOURG_COMMUNES_PRICES,
  VDL_QUARTIERS_PRICES,
} from "@/lib/data/luxembourg-prices";

interface RawLocality {
  name: string;
  asciiname: string;
  alternateNames: string[];
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

/** cle normalisee -> nom canonique transmis au moteur. */
let index: Map<string, string> | null = null;

function getIndex(): Map<string, string> {
  if (index) return index;
  const m = new Map<string, string>();
  // Priorite 1 : noms du referentiel prix (ceux que le moteur sait lire).
  for (const r of LUXEMBOURG_COMMUNES_PRICES) {
    const k = normalizeCommune(r.commune);
    if (!NON_PLACE_ROWS.has(k) && !m.has(k)) m.set(k, r.commune);
  }
  for (const q of VDL_QUARTIERS_PRICES) {
    const k = normalizeCommune(q.quartier);
    if (!NON_PLACE_ROWS.has(k) && !m.has(k)) m.set(k, q.quartier);
  }
  // Priorite 2 : localites officielles et leurs graphies latines
  // (Petingen -> Petange, Luxemburg -> Luxembourg, Esch -> ...).
  for (const l of localities as RawLocality[]) {
    for (const n of [l.name, l.asciiname, ...l.alternateNames]) {
      if (!n || !LATIN_ONLY.test(n)) continue;
      const k = normalizeCommune(n);
      if (k && !m.has(k)) m.set(k, l.name);
    }
  }
  index = m;
  return m;
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

export type CommuneResolution =
  | { status: "exact"; canonical: string }
  | { status: "suggest"; suggestions: string[] }
  | { status: "unknown" };

const MAX_SUGGESTIONS = 3;

export function resolveLuxembourgCommune(
  input: string | null | undefined,
): CommuneResolution {
  if (!input) return { status: "unknown" };
  const q = normalizeCommune(input);
  if (!q) return { status: "unknown" };
  const idx = getIndex();
  const exact = idx.get(q);
  if (exact) return { status: "exact", canonical: exact };

  // Tolerance : 1 faute pour les noms courts (< 8 caracteres), 2 au-dela.
  // Jamais d'acceptation automatique, seulement des suggestions.
  if (q.length < 4) return { status: "unknown" };
  const tol = q.length < 8 ? 1 : 2;
  const scored = new Map<string, number>();
  for (const [k, canonical] of idx) {
    const d = levenshtein(q, k, tol);
    if (d <= tol) {
      const prev = scored.get(canonical);
      if (prev === undefined || d < prev) scored.set(canonical, d);
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
