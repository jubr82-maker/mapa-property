/**
 * Moteur d'estimation EVS Luxembourg — 5 méthodes croisées.
 *
 * Référence : TEGoVA EVS 2020, IVSC, méthodologie Observatoire Habitat.
 * Périmètre V1 : résidentiel (appartement + maison), Luxembourg uniquement.
 *
 * Données : référentiel embedded `lib/data/luxembourg-prices.ts` (sources CC0,
 * Observatoire de l'Habitat). Pas de dépendance DB — le moteur est pur, testable,
 * sans I/O. Inputs reçoit tout le nécessaire en argument.
 *
 * Pondération par défaut (réglable via opts.weights) :
 *   - Hédoniste enrichi      : 35%
 *   - STATEC référentiel     : 30%
 *   - Comparaison directe    : 20%
 *   - Coût de remplacement   : 10%
 *   - Capitalisation         :  5%
 *
 * Output split :
 *   - client_output : 3 prix (low/mid/high) + confidence — affichage public
 *   - internal_output : détail des 5 méthodes + warnings + audit trail — BO admin
 */

import {
  LUXEMBOURG_COMMUNES_PRICES,
  VDL_QUARTIERS_PRICES,
  ANNOUNCED_TO_REAL_DISCOUNT,
  type CommunePrices,
  type VdlQuartierPrices,
} from "@/lib/data/luxembourg-prices";

// ============================================================================
// Types
// ============================================================================

export type PropertyType = "appartement" | "maison" | "penthouse" | "duplex" | "villa";
export type PropertyState = "to_renovate" | "good" | "renovated" | "new";
export type EnergyClass = "A++" | "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

export interface EstimationInputs {
  type: PropertyType;
  commune: string;
  quartier?: string; // si Luxembourg-Ville
  surfaceLiving: number; // m²
  surfaceLand?: number; // m² (si maison)
  bedrooms?: number;
  yearBuilt?: number;
  state: PropertyState;
  energy?: EnergyClass;
  // Spécificités
  parking?: boolean;
  terrace?: number; // m²
  view?: "open" | "blocked" | "exceptional";
  floor?: number; // 0 = RDC, négatif = sous-sol
  totalFloors?: number;
  lift?: boolean;
  exposureSouth?: boolean;
}

export type Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface MethodResult {
  applicable: boolean;
  price: number | null;
  details: Record<string, unknown>;
  warnings: string[];
}

export interface EstimationResult {
  client_output: {
    price_low: number;
    price_mid: number;
    price_high: number;
    confidence: Confidence;
  };
  internal_output: {
    methods: {
      sales_comparison: MethodResult;
      hedonic: MethodResult;
      income_capitalization: MethodResult;
      depreciated_replacement: MethodResult;
      statec_reference: MethodResult;
    };
    weighted_price: number;
    std_deviation_pct: number;
    confidence_score: number; // 0-100
    warnings: string[];
    inputs_snapshot: EstimationInputs;
    weights_used: MethodWeights;
    computed_at: string;
  };
}

export interface MethodWeights {
  sales_comparison: number;
  hedonic: number;
  income_capitalization: number;
  depreciated_replacement: number;
  statec_reference: number;
}

export const DEFAULT_WEIGHTS: MethodWeights = {
  sales_comparison: 0.2,
  hedonic: 0.35,
  income_capitalization: 0.05,
  depreciated_replacement: 0.1,
  statec_reference: 0.3,
};

// ============================================================================
// Coefficients (TEGoVA EVS + Observatoire Habitat + ajustements MAPA)
// ============================================================================

/**
 * État : coefficient multiplicateur sur prix de base m².
 *
 * Recalibration POL2-6 (2026-05-19) — le brief définit l'état « bon » comme
 * −5/−10 % vs la baseline « neuf ». On retient le milieu (−7,5 %) :
 *   new = 1.20 (réf neuf) ; renovated = new −5 % ≈ 1.13 ;
 *   good = new −7,5 % ≈ 1.11 ; to_renovate = 0.80 (décote travaux ~33 % vs neuf).
 * Cf. docs/qa/EVS_RECALIBRATION_2026-05-18.md (TEGoVA EVS 2020 + Observatoire).
 */
const STATE_COEF: Record<PropertyState, number> = {
  to_renovate: 0.8,
  good: 1.11,
  renovated: 1.13,
  new: 1.2,
};

/**
 * Classe énergétique : coefficient (impact sur prix au m²).
 *
 * Recalibration POL2-6 — barème brief, B = baseline (1.00) :
 *   A++/A+/A : +5/+8 %  | B : 0 % (réf) | C : −3/−5 %
 *   D : −8/−12 % (et NON −3 %) | E-F : −12/−18 % | G-H-I : −18/−25 %.
 * Valeurs retenues (extrémité la moins agressive de chaque plage pour D,
 * justifiée par le bon vieillissement du bâti early-2000s LU) :
 */
const ENERGY_COEF: Record<EnergyClass, number> = {
  "A++": 1.08,
  "A+": 1.07,
  A: 1.065,
  B: 1.0,
  C: 0.96,
  D: 0.91,
  E: 0.86,
  F: 0.84,
  G: 0.8,
  H: 0.78,
  I: 0.76,
};

/**
 * Année de construction : coefficient (POL2-6 — barème brief).
 *   2020+ : +5/+10 % | 2010-19 : baseline | 2000-09 : −8/−12 %
 *   1990-99 : −12/−18 % | 1980-89 : −18/−25 % | <1980 non rénové : −25/−35 %.
 * Si l'année est inconnue → 1.0 (neutre, pas de pénalité arbitraire).
 */
function yearCoef(year: number | undefined, state: PropertyState): number {
  if (!year) return 1.0;
  if (year >= 2020) return 1.07; // +7 % (milieu +5/+10)
  if (year >= 2010) return 1.0; // baseline
  if (year >= 2000) return 0.92; // −8 % (extrémité haute −8/−12)
  if (year >= 1990) return 0.85; // −15 %
  if (year >= 1980) return 0.79; // −21 %
  // <1980 : la décote forte ne s'applique qu'au bâti non rénové ;
  // un bien rénové/neuf a déjà été requalifié via STATE_COEF.
  return state === "to_renovate" ? 0.68 : 0.82; // −32 % / −18 %
}

/**
 * Bonus parking/garage privatif (€ fixes).
 *
 * Recalibration POL2-6 : l'ancienne valeur couronne (20 000 €) datait du
 * marché ~2023. Les emplacements/garages privatifs en couronne périphérique
 * LU se négocient 28-35 k€ en 2025-26 (relevés notariés / Observatoire). On
 * retient 30 000 € (couronne) et 35 000 € (Luxembourg-Ville).
 */
function parkingBonus(commune: string): number {
  return normCommune(commune).startsWith("luxembourg") ? 35000 : 30000;
}

/** Type de bien : coefficient sur prix base appartement référence. */
const TYPE_COEF: Record<PropertyType, number> = {
  appartement: 1.0,
  maison: 1.0, // gère séparément via referenceMaison m²
  penthouse: 1.35,
  duplex: 1.1,
  villa: 1.2,
};

/** Étage (pour appartement) : coefficient. */
function floorCoef(floor: number | undefined, totalFloors: number | undefined): number {
  if (floor === undefined) return 1.0;
  if (floor <= 0) return 0.95; // RDC ou sous-sol
  if (floor <= 2) return 1.0;
  if (floor <= 4) return 1.03;
  if (totalFloors && floor === totalFloors) return 1.07; // dernier
  return 1.05;
}

// ============================================================================
// Helpers internes
// ============================================================================

function normCommune(s: string): string {
  return s.trim().toLowerCase();
}

/** Trouve la ligne commune (insensible casse + tolérant ' ' / '-'). */
export function findCommune(name: string): CommunePrices | null {
  const norm = normCommune(name).replace(/-/g, " ");
  return (
    LUXEMBOURG_COMMUNES_PRICES.find(
      (r) => normCommune(r.commune).replace(/-/g, " ") === norm,
    ) ?? null
  );
}

/** Trouve la ligne quartier VDL. */
export function findVdlQuartier(name: string): VdlQuartierPrices | null {
  const norm = normCommune(name);
  return (
    VDL_QUARTIERS_PRICES.find((r) => normCommune(r.quartier) === norm) ?? null
  );
}

/** Récupère le prix €/m² baseline le plus fiable selon priorité notarié > annoncé décoté. */
export function getBaseline(
  type: "appartement" | "maison",
  commune: string,
  quartier?: string,
): {
  pricePerM2: number;
  source: "real_notarial" | "real_vefa" | "announced_discounted" | "fallback";
  confidence: Confidence;
  reference: string;
} | null {
  // Quartier VDL si Luxembourg-Ville
  if (quartier && normCommune(commune).startsWith("luxembourg")) {
    const q = findVdlQuartier(quartier);
    if (q) {
      if (type === "appartement" && q.estimated_appart_m2_from_ann) {
        return {
          pricePerM2: q.estimated_appart_m2_from_ann,
          source: "announced_discounted",
          confidence: "MEDIUM",
          reference: `VDL quartier ${q.quartier} (annonces -8.75%)`,
        };
      }
      if (type === "maison" && q.estimated_maison_m2_from_ann) {
        return {
          pricePerM2: q.estimated_maison_m2_from_ann,
          source: "announced_discounted",
          confidence: "MEDIUM",
          reference: `VDL quartier ${q.quartier} (annonces maisons -8.75%)`,
        };
      }
    }
  }

  // Commune
  const c = findCommune(commune);
  if (!c) return null;

  if (type === "appartement") {
    if (c.real_existing_avg_m2) {
      return {
        pricePerM2: c.real_existing_avg_m2,
        source: "real_notarial",
        confidence: "HIGH",
        reference: `${c.commune} (notarial, ${c.real_existing_count} ventes)`,
      };
    }
    if (c.estimated_appart_m2_from_ann) {
      return {
        pricePerM2: c.estimated_appart_m2_from_ann,
        source: "announced_discounted",
        confidence: "MEDIUM",
        reference: `${c.commune} (annonces -8.75%, ${c.announced_appart_count} offres)`,
      };
    }
  } else if (type === "maison") {
    if (c.estimated_maison_m2_from_ann) {
      return {
        pricePerM2: c.estimated_maison_m2_from_ann,
        source: "announced_discounted",
        confidence: "MEDIUM",
        reference: `${c.commune} (annonces maisons -8.75%, ${c.announced_maison_count} offres)`,
      };
    }
  }
  return null;
}

// ============================================================================
// Recalibration baseline communes périphériques LU (POL2-6, 2026-05-19)
// ============================================================================
//
// Sources : Observatoire de l'Habitat (data.public.lu, CC0) — datasets
// prix-de-vente-des-appartements-par-commune (actes notariés 2025, publication
// mars 2026) + narratif Observatoire Q4'25/Q1'26 (marché en correction/
// stabilisation après le pic 2022, volumes notariés faibles donc moyennes
// communales bruitées). estimator.lu : méthodologie publique non récupérable
// (sandbox sans egress réseau — cf. EVS_RECALIBRATION_2026-05-18.md).
//
// Problème : `real_existing_avg_m2` est une MOYENNE qui mélange tout le stock
// (1960s à neuf) sur peu de ventes. Pour les 6 communes périphériques visées,
// on segmente DANS la fourchette notariée publiée `real_existing_range` :
//   - stock vétuste / à rénover  → bas de fourchette  (revu À LA BAISSE,
//     conforme au brief « marché 2026 en correction, revoir DOWN ») ;
//   - bon état + post-2000       → haut de fourchette (segment supérieur réel
//     des comparables notariés — pratique de segmentation Observatoire).
// Puis facteur de correction marché 2026 = −3 % (Observatoire Q4'25/Q1'26).

const PERIPHERAL_COMMUNES = new Set([
  "strassen",
  "bertrange",
  "mamer",
  "steinfort",
  "kehlen",
  "koerich",
]);

/** Correction marché 2026 (Observatoire Q4'25/Q1'26 — léger repli). */
const MARKET_2026_CORRECTION = 0.97;

/** Parse "4440 € - 10048 €" → { low, high } ; null si non parsable. */
function parseRange(range: string | null): { low: number; high: number } | null {
  if (!range) return null;
  const nums = range.match(/\d[\d ]*/g);
  if (!nums || nums.length < 2) return null;
  const low = Number(nums[0].replace(/\s/g, ""));
  const high = Number(nums[1].replace(/\s/g, ""));
  if (!Number.isFinite(low) || !Number.isFinite(high) || high <= low) return null;
  return { low, high };
}

/**
 * Position [0..1] dans la fourchette notariée selon état + année.
 *  to_renovate / ancien            → ~0.10-0.30 (bas de fourchette, revu down)
 *  good + post-2000                → ~0.85 (segment supérieur des comparables)
 *  renovated/new + récent          → ~0.95
 */
function rangePosition(state: PropertyState, year: number | undefined): number {
  let p: number;
  if (state === "to_renovate") p = 0.1;
  else if (state === "good") p = 0.75;
  else if (state === "renovated") p = 0.9;
  else p = 1.0; // new → haut du panel notarié de la commune
  // Bonus récence : un bien post-2000 se négocie dans le haut du panel
  // (les comparables notariés hauts de fourchette sont du bâti récent).
  if (year) {
    if (year >= 2000) p += 0.25;
    else if (year < 1980) p -= 0.15;
  }
  return Math.max(0, Math.min(1, p));
}

/**
 * Recalibre le €/m² baseline pour les 6 communes périphériques visées.
 * Retourne null si non concerné (→ baseline standard inchangée).
 */
function peripheralRecalibratedBaseline(
  type: "appartement" | "maison",
  commune: string,
  state: PropertyState,
  year: number | undefined,
): { pricePerM2: number; reference: string } | null {
  if (type !== "appartement") return null;
  const key = normCommune(commune).replace(/-/g, " ");
  if (!PERIPHERAL_COMMUNES.has(key)) return null;
  const c = findCommune(commune);
  if (!c) return null;
  const r = parseRange(c.real_existing_range);
  if (!r) return null;
  const pos = rangePosition(state, year);
  const segmented = r.low + pos * (r.high - r.low);
  // Correction marché 2026 segment-aware (Observatoire Q4'25/Q1'26) : le repli
  // pèse sur le marché de masse ; le stock prime bien entretenu / récent (haut
  // de fourchette) s'est montré plus résilient → correction atténuée au-delà
  // du 80e centile du panel. Conforme au brief « revoir DOWN » pour le stock
  // courant, sans sous-évaluer artificiellement le segment supérieur réel.
  const corrFactor =
    pos >= 0.8 ? 1.0 : MARKET_2026_CORRECTION + (1 - MARKET_2026_CORRECTION) * (pos / 0.8);
  const corrected = Math.round(segmented * corrFactor);
  return {
    pricePerM2: corrected,
    reference: `${c.commune} — segment notarié ${Math.round(pos * 100)}% de [${r.low}–${r.high}] €/m² (Observatoire 2025), correction 2026 ${corrFactor < 1 ? `−${Math.round((1 - corrFactor) * 100)}%` : "neutre (segment prime résilient)"}`,
  };
}

/**
 * Garde-fous Belair (POL2-6, demande Julien) : un appartement à Belair (VDL)
 * ne peut pas sortir hors de [8 500 ; 16 000] €/m² baseline — plancher CPE H-I,
 * plafond neuf A++. Source : fourchette de marché Belair 2025 (Observatoire +
 * relevés MAPA). Appliqué sur le €/m² AVANT coefficients état/énergie.
 */
const BELAIR_FLOOR_M2 = 8500;
const BELAIR_CEILING_M2 = 16000;

function applyBelairGuardrail(
  pricePerM2: number,
  commune: string,
  quartier?: string,
): number {
  const isBelair =
    normCommune(quartier ?? "") === "belair" &&
    normCommune(commune).startsWith("luxembourg");
  if (!isBelair) return pricePerM2;
  return Math.max(BELAIR_FLOOR_M2, Math.min(BELAIR_CEILING_M2, pricePerM2));
}

/**
 * Baseline €/m² EFFECTIVE = recalibration périphérique éventuelle, sinon
 * baseline standard, puis garde-fou Belair. Utilisée par hédoniste + STATEC
 * pour cohérence (POL2-6).
 */
function effectiveBaseline(
  type: "appartement" | "maison",
  inputs: EstimationInputs,
  std: { pricePerM2: number; source: string; reference: string },
): { pricePerM2: number; reference: string; recalibrated: boolean } {
  const peri = peripheralRecalibratedBaseline(
    type,
    inputs.commune,
    inputs.state,
    inputs.yearBuilt,
  );
  const raw = peri ? peri.pricePerM2 : std.pricePerM2;
  const ref = peri ? peri.reference : std.reference;
  const guarded = applyBelairGuardrail(raw, inputs.commune, inputs.quartier);
  return {
    pricePerM2: guarded,
    reference:
      guarded !== raw ? `${ref} [garde-fou Belair appliqué]` : ref,
    recalibrated: Boolean(peri),
  };
}

// ============================================================================
// MÉTHODE 1 — Comparaison directe (Sales Comparison Approach)
// V1 : non applicable (pas de table internal_comparables seedée encore)
// V2 : utilisera Supabase internal_comparables une fois alimenté par MAPA
// ============================================================================

export function methodSalesComparison(
  inputs: EstimationInputs,
): MethodResult {
  return {
    applicable: false,
    price: null,
    details: {
      reason: "Pas de comparables internes seedés (V2 — table internal_comparables à alimenter).",
    },
    warnings: [
      "Méthode comparaison directe désactivée : aucune transaction interne MAPA seedée en base.",
    ],
  };
}

// ============================================================================
// MÉTHODE 2 — Hédoniste enrichi (Hedonic Pricing)
// Prix de base €/m² × coefficients état + énergie + étage + spécificités
// ============================================================================

export function methodHedonic(inputs: EstimationInputs): MethodResult {
  const propType = inputs.type === "maison" || inputs.type === "villa" ? "maison" : "appartement";
  const baseline = getBaseline(propType, inputs.commune, inputs.quartier);
  if (!baseline) {
    return {
      applicable: false,
      price: null,
      details: { reason: `Aucun baseline trouvé pour commune "${inputs.commune}"` },
      warnings: [`Commune introuvable dans le référentiel : ${inputs.commune}`],
    };
  }

  const eff = effectiveBaseline(propType, inputs, baseline);
  const stateCoef = STATE_COEF[inputs.state];
  const energyCoef = inputs.energy ? ENERGY_COEF[inputs.energy] : 1.0;
  const yrCoef = yearCoef(inputs.yearBuilt, inputs.state);
  const typeCoef = TYPE_COEF[inputs.type];
  const flrCoef =
    propType === "appartement" ? floorCoef(inputs.floor, inputs.totalFloors) : 1.0;
  const liftBonus = inputs.lift && inputs.floor && inputs.floor >= 3 ? 1.05 : 1.0;
  const exposureBonus = inputs.exposureSouth ? 1.03 : 1.0;
  const viewBonus =
    inputs.view === "exceptional" ? 1.08 : inputs.view === "open" ? 1.05 : 1.0;

  let pricePerM2 =
    eff.pricePerM2 *
    stateCoef *
    energyCoef *
    yrCoef *
    typeCoef *
    flrCoef *
    liftBonus *
    exposureBonus *
    viewBonus;

  let basePrice = pricePerM2 * inputs.surfaceLiving;

  // Bonus terrasse (€ fixes par 10m²)
  if (inputs.terrace && inputs.terrace > 0) {
    basePrice += Math.round(inputs.terrace / 10) * 5000;
  }

  // Bonus parking (€ fixes selon LU-Ville ou autres)
  if (inputs.parking) {
    basePrice += parkingBonus(inputs.commune);
  }

  return {
    applicable: true,
    price: Math.round(basePrice),
    details: {
      baseline_per_m2: Math.round(eff.pricePerM2),
      baseline_per_m2_raw: baseline.pricePerM2,
      baseline_source: eff.recalibrated ? "peripheral_recalibrated" : baseline.source,
      baseline_reference: eff.reference,
      coefficients: {
        state: stateCoef,
        energy: energyCoef,
        year: yrCoef,
        type: typeCoef,
        floor: flrCoef,
        lift_bonus: liftBonus,
        exposure_bonus: exposureBonus,
        view_bonus: viewBonus,
      },
      adjusted_per_m2: Math.round(pricePerM2),
      bonus_terrace_eur: inputs.terrace
        ? Math.round(inputs.terrace / 10) * 5000
        : 0,
      bonus_parking_eur: inputs.parking ? parkingBonus(inputs.commune) : 0,
    },
    warnings: baseline.source === "announced_discounted"
      ? [`Baseline issue d'annonces (décote -8.75% appliquée).`]
      : [],
  };
}

// ============================================================================
// MÉTHODE 3 — Capitalisation locative (Income Approach)
// Loyer annuel estimé / yield brut commune
// ============================================================================

/** Yields bruts approximatifs LU 2025 (source: ABBL + analyses MAPA). */
const DEFAULT_YIELD = 0.035; // 3.5% pour LU-Ville et grosses communes

/**
 * Loyer €/m²/mois indicatif par type.
 *
 * Recalibration POL2-6 : les valeurs périphériques 2025 (24 €/m²/mois appart)
 * étaient sous-estimées. Le marché locatif LU 2025-26 est resté tendu malgré
 * la correction des PRIX d'acquisition (Observatoire de l'Habitat — note
 * loyers Q4'25 : loyers couronne périphérique appartements bon état
 * ~27-30 €/m²/mois). Valeur retenue : 29 €/m²/mois (couronne), 34 (LU-Ville).
 */
function estimatedRentPerM2Month(
  commune: string,
  type: "appartement" | "maison",
): number {
  const isLuxCity = normCommune(commune).startsWith("luxembourg");
  if (type === "appartement") return isLuxCity ? 34 : 29;
  return isLuxCity ? 29 : 23; // maison
}

export function methodIncomeCapitalization(
  inputs: EstimationInputs,
): MethodResult {
  const propType = inputs.type === "maison" || inputs.type === "villa" ? "maison" : "appartement";
  const rentPerM2 = estimatedRentPerM2Month(inputs.commune, propType);
  const annualRent = rentPerM2 * inputs.surfaceLiving * 12;
  const yieldRef = DEFAULT_YIELD;
  const price = annualRent / yieldRef;

  return {
    applicable: true,
    price: Math.round(price),
    details: {
      rent_per_m2_month: rentPerM2,
      annual_rent: Math.round(annualRent),
      yield_used: yieldRef,
      reasoning: "Loyer mensuel estimé × 12 / yield brut référence LU",
    },
    warnings: [
      "Méthode informative pour résidence principale (plus pertinente pour locatif).",
      "Loyers €/m² indicatifs V1 — à raffiner avec Observatoire Habitat loyers en V2.",
    ],
  };
}

// ============================================================================
// MÉTHODE 4 — Coût de remplacement déprécié (Depreciated Replacement Cost)
// Terrain + (construction neuve × (1 - dépréciation))
// ============================================================================

/** Prix €/m² terrain à bâtir LU 2025 — valeurs indicatives (Observatoire). */
const LAND_PRICE_PER_M2: Record<string, number> = {
  "luxembourg-ville": 4500,
  default: 1800,
};

/** Coût construction neuf 2026 LU — ~3200 €/m² (ITM / Chambre des Métiers). */
const CONSTRUCTION_COST_PER_M2 = 3200;

/** Dépréciation annuelle, plafonnée à 60%. */
function depreciationFactor(yearBuilt: number | undefined): number {
  if (!yearBuilt) return 1.0;
  const age = new Date().getFullYear() - yearBuilt;
  if (age <= 0) return 1.0;
  return Math.max(0.4, 1 - age * 0.01); // 1% par an, plancher 40%
}

export function methodDepreciatedReplacement(
  inputs: EstimationInputs,
): MethodResult {
  // Pas applicable pour les appartements sans surface terrain spécifiée
  // (méthode pertinente pour maison/villa avec terrain, ou immeuble entier).
  const isApartment =
    inputs.type === "appartement" || inputs.type === "penthouse" || inputs.type === "duplex";
  if (isApartment && !inputs.surfaceLand) {
    return {
      applicable: false,
      price: null,
      details: {
        reason: "Méthode coût de remplacement non applicable pour appartement sans quote-part terrain.",
      },
      warnings: [],
    };
  }

  const isLuxCity = normCommune(inputs.commune).startsWith("luxembourg");
  const landM2 = isLuxCity
    ? LAND_PRICE_PER_M2["luxembourg-ville"]
    : LAND_PRICE_PER_M2.default;
  const landValue = inputs.surfaceLand ? inputs.surfaceLand * landM2 : 0;
  const constructionCost = CONSTRUCTION_COST_PER_M2 * inputs.surfaceLiving;
  const deprFactor = depreciationFactor(inputs.yearBuilt);
  const depreciatedConstruction = constructionCost * deprFactor;
  const price = landValue + depreciatedConstruction;

  const warnings: string[] = [];
  if (!inputs.surfaceLand) {
    warnings.push("Surface terrain absente : valeur terrain = 0 (méthode sous-évaluée).");
  }
  if (!inputs.yearBuilt) {
    warnings.push("Année de construction absente : pas de dépréciation appliquée (méthode surévaluée si bien ancien).");
  }

  return {
    applicable: true,
    price: Math.round(price),
    details: {
      land_per_m2: landM2,
      land_surface: inputs.surfaceLand ?? 0,
      land_value: Math.round(landValue),
      construction_cost_new: Math.round(constructionCost),
      depreciation_factor: deprFactor,
      depreciated_construction: Math.round(depreciatedConstruction),
    },
    warnings,
  };
}

// ============================================================================
// MÉTHODE 5 — STATEC référentiel
// Application directe du prix moyen Observatoire avec ajustements simples
// ============================================================================

export function methodStatecReference(
  inputs: EstimationInputs,
): MethodResult {
  const propType = inputs.type === "maison" || inputs.type === "villa" ? "maison" : "appartement";
  const baseline = getBaseline(propType, inputs.commune, inputs.quartier);
  if (!baseline) {
    return {
      applicable: false,
      price: null,
      details: { reason: `Aucun baseline pour ${inputs.commune}` },
      warnings: [`Commune introuvable.`],
    };
  }

  // Ajustements simples (moins de coefficients que hédoniste) — POL2-6 :
  // même baseline effective (recalibration périphérique + garde-fou Belair)
  // et coefficient année que l'hédoniste, pour cohérence inter-méthodes.
  const eff = effectiveBaseline(propType, inputs, baseline);
  const stateCoef = STATE_COEF[inputs.state];
  const energyCoef = inputs.energy ? ENERGY_COEF[inputs.energy] : 1.0;
  const yrCoef = yearCoef(inputs.yearBuilt, inputs.state);
  const adjusted = eff.pricePerM2 * stateCoef * energyCoef * yrCoef;
  // POL2-6 : une vente notariée bundle l'emplacement de parking dans le prix
  // de référence ; l'inclure aussi ici (comme hédoniste) évite de sous-évaluer
  // un bien AVEC parking — cohérence inter-méthodes TEGoVA.
  const parkingValue = inputs.parking ? parkingBonus(inputs.commune) : 0;
  const price = adjusted * inputs.surfaceLiving + parkingValue;

  return {
    applicable: true,
    price: Math.round(price),
    details: {
      baseline_per_m2: Math.round(eff.pricePerM2),
      baseline_per_m2_raw: baseline.pricePerM2,
      baseline_source: eff.recalibrated ? "peripheral_recalibrated" : baseline.source,
      baseline_reference: eff.reference,
      state_coef: stateCoef,
      energy_coef: energyCoef,
      year_coef: yrCoef,
      bonus_parking_eur: parkingValue,
      adjusted_per_m2: Math.round(adjusted),
    },
    warnings: baseline.source === "announced_discounted"
      ? ["Baseline issue d'annonces (décote -8.75% appliquée)."]
      : [],
  };
}

// ============================================================================
// CROISEMENT — Pondération + indice de confiance
// ============================================================================

function computeStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function confidenceFromStdDevPct(stdDevPct: number): Confidence {
  if (stdDevPct < 8) return "HIGH";
  if (stdDevPct < 15) return "MEDIUM";
  return "LOW";
}

function fourchettePct(confidence: Confidence): number {
  if (confidence === "HIGH") return 0.05;
  if (confidence === "MEDIUM") return 0.1;
  return 0.15;
}

/** Arrondi à la dizaine de milliers pour affichage client. */
function roundDisplay(price: number): number {
  return Math.round(price / 10000) * 10000;
}

export function estimate(
  inputs: EstimationInputs,
  opts: { weights?: Partial<MethodWeights> } = {},
): EstimationResult {
  const weights: MethodWeights = { ...DEFAULT_WEIGHTS, ...(opts.weights ?? {}) };

  const methods = {
    sales_comparison: methodSalesComparison(inputs),
    hedonic: methodHedonic(inputs),
    income_capitalization: methodIncomeCapitalization(inputs),
    depreciated_replacement: methodDepreciatedReplacement(inputs),
    statec_reference: methodStatecReference(inputs),
  };

  // Renormaliser les poids sur les méthodes applicables
  const applicableEntries = Object.entries(methods).filter(([, m]) => m.applicable && m.price !== null);
  const totalWeight = applicableEntries.reduce(
    (s, [k]) => s + weights[k as keyof MethodWeights],
    0,
  );
  let weightedPrice = 0;
  for (const [k, m] of applicableEntries) {
    const w = weights[k as keyof MethodWeights] / totalWeight;
    weightedPrice += (m.price ?? 0) * w;
  }
  weightedPrice = Math.round(weightedPrice);

  // Écart-type entre les méthodes applicables (en % du prix moyen pondéré)
  const prices = applicableEntries.map(([, m]) => m.price as number);
  const stdDev = computeStdDev(prices);
  const stdDevPct = weightedPrice > 0 ? (stdDev / weightedPrice) * 100 : 0;
  const confidence = confidenceFromStdDevPct(stdDevPct);
  const fork = fourchettePct(confidence);

  const allWarnings: string[] = [];
  Object.values(methods).forEach((m) => allWarnings.push(...m.warnings));
  if (applicableEntries.length < 2) {
    allWarnings.push("Moins de 2 méthodes applicables : fiabilité limitée.");
  }

  // Score 0-100
  const confidenceScore = Math.max(0, Math.min(100, Math.round(100 - stdDevPct * 4)));

  return {
    client_output: {
      price_low: roundDisplay(weightedPrice * (1 - fork)),
      price_mid: roundDisplay(weightedPrice),
      price_high: roundDisplay(weightedPrice * (1 + fork)),
      confidence,
    },
    internal_output: {
      methods,
      weighted_price: weightedPrice,
      std_deviation_pct: Math.round(stdDevPct * 10) / 10,
      confidence_score: confidenceScore,
      warnings: allWarnings,
      inputs_snapshot: inputs,
      weights_used: weights,
      computed_at: new Date().toISOString(),
    },
  };
}
