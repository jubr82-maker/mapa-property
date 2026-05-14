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

/** État : coefficient multiplicateur sur prix de base m². */
const STATE_COEF: Record<PropertyState, number> = {
  to_renovate: 0.75,
  good: 1.0,
  renovated: 1.1,
  new: 1.2,
};

/** Classe énergétique : coefficient (impact sur prix au m²). */
const ENERGY_COEF: Record<EnergyClass, number> = {
  "A++": 1.15,
  "A+": 1.12,
  A: 1.1,
  B: 1.05,
  C: 1.0,
  D: 0.97,
  E: 0.92,
  F: 0.88,
  G: 0.82,
  H: 0.78,
  I: 0.75,
};

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

  const stateCoef = STATE_COEF[inputs.state];
  const energyCoef = inputs.energy ? ENERGY_COEF[inputs.energy] : 1.0;
  const typeCoef = TYPE_COEF[inputs.type];
  const flrCoef =
    propType === "appartement" ? floorCoef(inputs.floor, inputs.totalFloors) : 1.0;
  const liftBonus = inputs.lift && inputs.floor && inputs.floor >= 3 ? 1.05 : 1.0;
  const exposureBonus = inputs.exposureSouth ? 1.03 : 1.0;
  const viewBonus =
    inputs.view === "exceptional" ? 1.08 : inputs.view === "open" ? 1.05 : 1.0;

  let pricePerM2 =
    baseline.pricePerM2 *
    stateCoef *
    energyCoef *
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
    basePrice += normCommune(inputs.commune).startsWith("luxembourg") ? 30000 : 20000;
  }

  return {
    applicable: true,
    price: Math.round(basePrice),
    details: {
      baseline_per_m2: baseline.pricePerM2,
      baseline_source: baseline.source,
      baseline_reference: baseline.reference,
      coefficients: {
        state: stateCoef,
        energy: energyCoef,
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
      bonus_parking_eur: inputs.parking
        ? normCommune(inputs.commune).startsWith("luxembourg")
          ? 30000
          : 20000
        : 0,
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

/** Loyer €/m²/mois indicatif par type (à raffiner avec Observatoire loyers V2). */
function estimatedRentPerM2Month(
  commune: string,
  type: "appartement" | "maison",
): number {
  // Valeurs indicatives 2025 sur LU-Ville (à étoffer avec dataset loyers Observatoire V2).
  const isLuxCity = normCommune(commune).startsWith("luxembourg");
  if (type === "appartement") return isLuxCity ? 32 : 24;
  return isLuxCity ? 28 : 20; // maison
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

  // Ajustements simples (moins de coefficients que hédoniste)
  const stateCoef = STATE_COEF[inputs.state];
  const energyCoef = inputs.energy ? ENERGY_COEF[inputs.energy] : 1.0;
  const adjusted = baseline.pricePerM2 * stateCoef * energyCoef;
  const price = adjusted * inputs.surfaceLiving;

  return {
    applicable: true,
    price: Math.round(price),
    details: {
      baseline_per_m2: baseline.pricePerM2,
      baseline_source: baseline.source,
      baseline_reference: baseline.reference,
      state_coef: stateCoef,
      energy_coef: energyCoef,
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
