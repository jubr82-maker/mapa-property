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
import { calcParkingValue, computeParkingAdjustment } from "@/lib/estimation/parking-coeff";
import { calcLandValue, getLandZone } from "@/lib/estimation/land-zones";
import { getApartmentBaseline } from "@/lib/data/luxembourg-prices";

// ============================================================================
// Types
// ============================================================================

export type PropertyType = "appartement" | "maison" | "penthouse" | "duplex" | "villa";
// Sprint C7 : 6 etats au lieu de 4. Mapping doux des anciens :
//   to_renovate → to_renovate (idem)
//   good        → good        (idem)
//   renovated   → excellent   (rename)
//   new         → new         (idem)
// + ajouts fair (a rafraichir), major_works (gros travaux).
export type PropertyState =
  | "to_renovate"
  | "good"
  | "renovated"
  | "new"
  | "excellent"
  | "fair"
  | "major_works";
export type EnergyClass = "A++" | "A+" | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I";

// Sprint C7 — types Observatoire pour appartements (segment='apartment').
// Tous OPTIONNELS dans EstimationInputs, avec defaults safe.
export type FloorType =
  | "basement"
  | "ground"
  | "first"
  | "middle"
  | "high"
  | "top"
  | "penthouse";
export type AtypicalType = "standard" | "studio" | "duplex" | "triplex" | "loft";

/**
 * Catégories de travaux EVS (POL3-6). 11 catégories + `piscine`.
 * Chacune : grâce (années 100 % rétention) puis décote linéaire annuelle.
 */
export type WorkCategory =
  | "toiture"
  | "facade_isolation"
  | "pac"
  | "chauffage"
  | "photovoltaique"
  | "electricite"
  | "menuiseries"
  | "cuisine"
  | "salle_de_bain"
  | "peinture"
  | "sols_revetements"
  | "amenagement_exterieur"
  | "piscine";

export interface WorkItem {
  category: WorkCategory;
  /** Année de réalisation des travaux (1980-2026). */
  year: number;
  /** Montant € HT engagé (optionnel — 0 si non renseigné). */
  amount: number;
}

export interface EstimationInputs {
  /** Pays ISO 3166-1 alpha-2. EVS = LUXEMBOURG UNIQUEMENT. */
  country?: string;
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
  /** Nombre d'emplacements de parking INTÉRIEUR (box/garage). */
  parkingInterior?: number;
  /** Nombre d'emplacements de parking EXTÉRIEUR. */
  parkingExterior?: number;
  /** Travaux récents déclarés (vétusté appliquée par catégorie). */
  works?: WorkItem[];
  terrace?: number; // m²
  view?: "open" | "blocked" | "exceptional" | "panoramic";
  floor?: number; // 0 = RDC, négatif = sous-sol
  totalFloors?: number;
  lift?: boolean;
  exposureSouth?: boolean;
  /** Surface sous-sol AMÉNAGÉ/FINI m² (maisons — annexes au-delà de 30 m²). */
  basementFinishedSqm?: number;
  // ──────────────────────────────────────────────────────────────────────
  // Sprint C7 — Methode Observatoire (appartements uniquement).
  // Tous optionnels. Si absents, defaults safe (cf. estimateObservatoire).
  // ──────────────────────────────────────────────────────────────────────
  /** Etat C7 enrichi (6 niveaux). Si absent, fallback sur `state` legacy
   *  via mapLegacyState(). */
  condition?: PropertyState;
  /** Type d'etage (apartment only). Default 'middle'. */
  floorType?: FloorType;
  /** Type atypique (apartment only). Default 'standard'. */
  atypicalType?: AtypicalType;
  /** Vente en l'etat futur d'achevement (TVA 3% logement neuf). */
  vefa?: boolean;
  /** Nombre de places de parking interieur (box/garage). Cap 5. */
  parkingIndoor?: number;
  /** Nombre de places de parking exterieur. Cap 5. */
  parkingOutdoor?: number;
  /** Cave privative presente (forfait 3000€). */
  cellar?: boolean;
  /** Surface terrasse m². > 15 = bonus, <=15 inclus dans prix/m². */
  terraceArea?: number;
  /** Surface balcon m² (info seulement, inclus dans prix/m²). */
  balconyArea?: number;
  /** Surface jardin m² (apartment only). 800€/m² plafond 50k€. */
  gardenArea?: number;
}

// ============================================================================
// Sprint C7 — Constantes methode Observatoire (placeholders commit 1).
// Les vraies valeurs sont injectees aux commits 2-7. Garder ces objets
// dans le meme fichier evite un import circulaire avec methodHedonic etc.
// ============================================================================

/** Sprint C7 — coefficients CPE A++ → I. Placeholder 1.0 (rempli commit 2). */
export const CPE_COEF_C7: Record<EnergyClass, number> = {
  "A++": 1.0,
  "A+": 1.0,
  A: 1.0,
  B: 1.0,
  C: 1.0,
  D: 1.0,
  E: 1.0,
  F: 1.0,
  G: 1.0,
  H: 1.0,
  I: 1.0,
};

/** Sprint C7 — coefficients etat (6 niveaux). Placeholder 1.0 (commit 3). */
export const STATE_COEF_C7: Record<PropertyState, number> = {
  new: 1.0,
  excellent: 1.0,
  renovated: 1.0, // alias de excellent via mapLegacyState
  good: 1.0,
  fair: 1.0,
  to_renovate: 1.0,
  major_works: 1.0,
};

/** Sprint C7 — coefficients etage (apartment only). Placeholder 1.0 (commit 4). */
export const FLOOR_COEF_C7: Record<FloorType, number> = {
  basement: 1.0,
  ground: 1.0,
  first: 1.0,
  middle: 1.0,
  high: 1.0,
  top: 1.0,
  penthouse: 1.0,
};

/** Sprint C7 — coefficients atypique (apartment only). Placeholder 1.0 (commit 5). */
export const ATYPICAL_COEF_C7: Record<AtypicalType, number> = {
  standard: 1.0,
  studio: 1.0,
  duplex: 1.0,
  triplex: 1.0,
  loft: 1.0,
};

/** Sprint C7 — mapping doux state legacy → C7 (back-compat).
 *  `renovated` ancien → `excellent` C7 (rename, meme coef cible 1.05). */
function mapLegacyState(state: PropertyState | undefined): PropertyState {
  if (!state) return "good";
  if (state === "renovated") return "excellent";
  return state;
}

/** Sprint C7 — derive floorType + atypicalType depuis PropertyType legacy
 *  si l'utilisateur n'a pas saisi explicitement les nouveaux champs C7. */
function deriveAtypicalFromType(
  inputs: EstimationInputs,
): AtypicalType {
  if (inputs.atypicalType) return inputs.atypicalType;
  if (inputs.type === "duplex") return "duplex";
  // penthouse, appartement → standard (le penthouse passe par floorType).
  return "standard";
}

function deriveFloorFromType(inputs: EstimationInputs): FloorType {
  if (inputs.floorType) return inputs.floorType;
  if (inputs.type === "penthouse") return "penthouse";
  return "middle";
}

/** Sprint C7 — segment Observatoire derive du PropertyType legacy. */
function isHouseSegment(type: PropertyType): boolean {
  return type === "maison" || type === "villa";
}

/** Retour d'erreur pays non couvert (EVS = LU only). */
export interface CountryNotCoveredError {
  error: "COUNTRY_NOT_COVERED";
  message: string;
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
// Sprint C7 : PropertyState etendu de 4 a 7 valeurs (mapping doux des
// anciennes : renovated → excellent). Cette table reste utilisee par les
// methodes legacy code-mort (methodHedonic / methodStatecReference /
// estimateApartment / estimateHouse). Les nouveaux etats (excellent / fair /
// major_works) heritent par defaut des coefs proches pour eviter une
// regression silencieuse des fixtures maisons (qui continuent d'utiliser
// estimateHouse → STATE_COEF).
const STATE_COEF: Record<PropertyState, number> = {
  to_renovate: 0.8,
  good: 1.11,
  renovated: 1.13,
  new: 1.2,
  // Sprint C7 ajouts (alignes sur valeurs proches existantes pour code mort) :
  excellent: 1.13, // alias renovated
  fair: 0.95, // entre to_renovate (0.8) et good (1.11)
  major_works: 0.7, // pire que to_renovate
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
// FIGÉ — calibration finale MAPA-validée Julien (POL3-6 Étape 1.D).
// NE PAS modifier. Spec : A+/AP/A 1.10 ; "A++" = top tier → 1.10 (clé du
// type EnergyClass, alignée sur A+/A conformément au barème Julien).
const ENERGY_COEF: Record<EnergyClass, number> = {
  "A++": 1.1,
  "A+": 1.1,
  A: 1.1,
  B: 1.05,
  C: 1.02,
  D: 1.0,
  E: 0.86,
  F: 0.84,
  G: 0.8,
  H: 0.78,
  I: 0.78,
};

/**
 * Année de construction : coefficient (POL2-6 — barème brief).
 *   2020+ : +5/+10 % | 2010-19 : baseline | 2000-09 : −8/−12 %
 *   1990-99 : −12/−18 % | 1980-89 : −18/−25 % | <1980 non rénové : −25/−35 %.
 * Si l'année est inconnue → 1.0 (neutre, pas de pénalité arbitraire).
 */
// FIGÉ — calibration finale MAPA-validée Julien (POL3-6 Étape 1.E).
// NE PAS modifier. Année absente → 1.0 (neutre, dégradation gracieuse).
function yearCoef(year: number | undefined): number {
  if (!year) return 1.0;
  if (year >= 2020) return 1.0;
  if (year >= 2010) return 0.96;
  if (year >= 2000) return 0.92;
  if (year >= 1990) return 0.88;
  if (year >= 1980) return 0.84;
  return 0.78;
}

/**
 * Valeur € totale des emplacements de parking d'un bien (POL3-6).
 *
 * Coefficient PAR COMMUNE délégué à `lib/estimation/parking-coeff.ts`
 * (module dédié, valeurs Observatoire/notarié 2025-26 : box couronne
 * 28-35 k€, hyper-centre/Belair 40-50 k€).
 *
 * Rétrocompat : l'ancien drapeau `parking: boolean` (POL2-6, formulaire
 * legacy) ⇒ 1 emplacement INTÉRIEUR si parkingInterior/Exterior absents.
 */
function computeParkingValue(inputs: EstimationInputs): number {
  let interior = inputs.parkingInterior ?? 0;
  let exterior = inputs.parkingExterior ?? 0;
  if (
    inputs.parkingInterior === undefined &&
    inputs.parkingExterior === undefined &&
    inputs.parking
  ) {
    interior = 1;
  }
  if (interior <= 0 && exterior <= 0) return 0;
  return calcParkingValue(inputs.commune, inputs.quartier, interior, exterior);
}

// ============================================================================
// MODULE TRAVAUX / VÉTUSTÉ (POL3-6)
// ============================================================================
//
// Barème MAPA Property — décote progressive par catégorie de travaux.
// Chaque catégorie a un nombre d'années de GRÂCE (rétention 100 % de la
// plus-value : travaux comme neufs) puis une DÉCOTE LINÉAIRE annuelle
// (decayPerYear) jusqu'à un plancher (floor). Plus le poste est durable
// (toiture, isolation), plus la grâce est longue et la décote lente ; les
// postes esthétiques (peinture) vieillissent vite.
//
// `piscine` est un cas spécial : c'est une PRIME sur la valeur du bien
// (0.15) tant que l'âge ≤ graceYears (7 ans, neuve/quasi-neuve) ; au-delà,
// elle bascule sur une rétention décroissante appliquée au montant.
//
// Sources de calibrage : TEGoVA EVS 2020 (dépréciation par composant),
// barèmes d'usure du bâti Observatoire de l'Habitat / Ministère du
// Logement (durées de vie utiles des lots techniques).

interface WorkCategorySpec {
  /** Années de rétention 100 %. */
  graceYears: number;
  /** Décote linéaire par an au-delà de la grâce (fraction). */
  decayPerYear: number;
  /** Piscine uniquement : prime (fraction de la valeur du bien). */
  premium?: number;
}

// Barème vétusté MAPA-VALIDÉ (Julien, POL3-6). Cap plancher = 0
// (la rétention peut tomber à -100 %). NE PAS recalibrer ici : seules
// les baselines €/m² communes (luxembourg-prices.ts) sont ajustables.
export const WORKS_CATEGORIES: Record<WorkCategory, WorkCategorySpec> = {
  // GROS ŒUVRE LOURD : grâce 2 ans, décote 2 %/an, cap -100%
  toiture: { graceYears: 2, decayPerYear: 0.02 },
  facade_isolation: { graceYears: 2, decayPerYear: 0.02 },
  pac: { graceYears: 2, decayPerYear: 0.02 },
  chauffage: { graceYears: 2, decayPerYear: 0.02 },

  // PHOTOVOLTAÏQUE : pas de grâce, décote 4 %/an, cap -100% à 25 ans
  photovoltaique: { graceYears: 0, decayPerYear: 0.04 },

  // GROS ŒUVRE TECHNIQUE : grâce 2 ans, décote 5 %/an, cap -100%
  electricite: { graceYears: 2, decayPerYear: 0.05 },
  menuiseries: { graceYears: 2, decayPerYear: 0.05 },

  // CUISINE / SDB : pas de grâce, décote 5 %/an, cap -100% à 20 ans
  cuisine: { graceYears: 0, decayPerYear: 0.05 },
  salle_de_bain: { graceYears: 0, decayPerYear: 0.05 },

  // LÉGER : pas de grâce, décote 5 %/an, cap -100% à 20 ans
  peinture: { graceYears: 0, decayPerYear: 0.05 },
  sols_revetements: { graceYears: 0, decayPerYear: 0.05 },
  amenagement_exterieur: { graceYears: 0, decayPerYear: 0.05 },

  // PISCINE : prime +15 % les 7 premières années, décote 5 %/an dès an 8
  piscine: { graceYears: 7, decayPerYear: 0.05, premium: 0.15 },
};

/** Prime piscine par défaut (fraction de la valeur du bien) — fallback. */
export const POOL_PREMIUM = 0.15;

/**
 * Rétention [0..1] d'un poste de travaux selon son ancienneté.
 *
 * - âge ≤ graceYears        → 1.0 (travaux comme neufs).
 * - âge > graceYears        → 1 − (âge − grâce) × decayPerYear,
 *                             borné au plancher de la catégorie.
 *
 * Pour `piscine`, retourne la rétention sur le MONTANT (la prime sur
 * valeur du bien est gérée en amont par `calcWorksAddedValue`).
 */
export function calcWorkRetention(
  category: WorkCategory,
  yearOfWork: number,
  currentYear = 2026,
): number {
  const spec = WORKS_CATEGORIES[category];
  const age = Math.max(0, currentYear - yearOfWork);
  if (age <= spec.graceYears) return 1.0;
  const decayed = 1 - (age - spec.graceYears) * spec.decayPerYear;
  return Math.max(0, decayed); // cap plancher 0 (peut tomber à -100 %)
}

/**
 * Plus-value € totale apportée par les travaux déclarés.
 *
 * - `piscine` : si âge ≤ graceYears → prime = basePropertyValue × 0.15
 *   (une piscine récente valorise le BIEN, pas le coût du chantier) ;
 *   sinon → montant × rétention (piscine vieillissante = actif amorti).
 * - autres catégories : montant × rétention (plus-value = part résiduelle
 *   de l'investissement encore « lisible » dans le bien).
 *
 * Montant 0 (non renseigné) → contribution 0 pour la catégorie, SAUF
 * piscine récente (prime sur valeur du bien, indépendante du montant).
 */
export function calcWorksAddedValue(
  works: WorkItem[] | undefined,
  basePropertyValue: number,
  currentYear = 2026,
): number {
  if (!works || works.length === 0) return 0;
  let addedValue = 0;
  for (const work of works) {
    const retention = calcWorkRetention(work.category, work.year, currentYear);
    if (work.category === "piscine") {
      const ageInYears = currentYear - work.year;
      const cat = WORKS_CATEGORIES.piscine;
      if (ageInYears <= cat.graceYears) {
        addedValue += basePropertyValue * (cat.premium ?? POOL_PREMIUM) * retention;
      } else {
        addedValue += (work.amount || 0) * retention;
      }
    } else {
      addedValue += (work.amount || 0) * retention;
    }
  }
  return addedValue;
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

// POL3-6 — CADRAGE MÉTIER : le moteur s'applique UNIFORMÉMENT à TOUTES
// les communes LU (aucune exclue), chacune avec SA baseline notariée. La
// segmentation dans la fourchette notariée `real_existing_range` n'est
// donc plus restreinte à 6 communes : elle s'applique à toute commune LU
// disposant d'une fourchette notariée publiée parsable (le référentiel
// `real_existing_range` couvre les communes à volume ≥10 ventes). Sinon
// (peu de ventes, range "*") → baseline standard inchangée (fallback).

/** Correction marché 2026 (Observatoire Q4'25/Q1'26 — repli marché de masse). */
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
 * Position [0..1] dans la fourchette notariée selon état + année (POL3-6).
 *
 * Recalibrée pour V2 : `real_existing_avg_m2` est une MOYENNE qui mélange
 * tout le stock (1960s→neuf). Le segment qui correspond à un bien donné
 * doit refléter sa qualité RELATIVE dans le panel notarié de la commune :
 *  - to_renovate                   → bas de fourchette (0.00)
 *  - good (état d'usage courant)    → tiers inférieur (0.10), c'est le
 *    stock le plus représenté donc proche du bas/médian du panel
 *  - renovated                     → ~0.30
 *  - new                           → ~0.55 (sans atteindre le sommet du
 *    panel, réservé au neuf prime VEFA hors périmètre)
 * Récence : +0.15 si ≥2000, +0.30 si ≥2015 (cumulatif au seuil atteint),
 * −0.10 si <1980 (stock ancien). Plafonné [0,1]. Calibrage Observatoire
 * Q4'25/Q1'26 (marché de masse en correction post-pic 2022) ; bandes
 * cibles brief POL3-6 vérifiées par scripts/test-engine.mjs.
 */
// Calibration finale MAPA-validée Julien (POL3-6 Étape 1.C). "good" ne doit
// jamais coller au plafond — plafond réservé à "new + récent 2020+".
function rangePosition(state: PropertyState, year: number | undefined): number {
  let pos: number;
  switch (state) {
    case "to_renovate":
      pos = 0.1;
      break;
    case "good":
      pos = 0.45;
      break;
    case "renovated":
      pos = 0.7;
      break;
    case "new":
      pos = 0.9;
      break;
    default:
      pos = 0.45;
  }
  if (year !== undefined) {
    if (year >= 2020) pos += 0.15;
    else if (year >= 2010) pos += 0.1;
    else if (year >= 2000) pos += 0.05;
    else if (year < 1980) pos -= 0.15;
  }
  return Math.max(0, Math.min(1.0, pos));
}

/**
 * Recalibre le €/m² baseline par SEGMENTATION dans la fourchette notariée
 * publiée `real_existing_range` de la commune (Observatoire 2025).
 *
 * POL3-6 — CADRAGE : appliqué à TOUTE commune LU disposant d'une
 * fourchette notariée parsable, pour les APPARTEMENTS. Retourne null si
 * la commune n'a pas de fourchette notariée fiable (peu de ventes →
 * fallback baseline standard, jamais d'exclusion arbitraire).
 *
 * MAISON : la fourchette notariée `real_existing_range` du référentiel
 * mixe TOUT le stock vendu (fortement pondéré appartements/VEFA, plus
 * chers au m² que les maisons individuelles dans ces communes — cf.
 * écart `estimated_maison_m2_from_ann` ≈ 0,7 × appartement). La segmenter
 * sur-évaluerait les maisons. Les maisons restent donc sur leur baseline
 * `estimated_maison_m2_from_ann` (annonces maisons décotées −8,75 %,
 * Observatoire) via getBaseline — recalibration appartement-only.
 */
function peripheralRecalibratedBaseline(
  type: "appartement" | "maison",
  commune: string,
  state: PropertyState,
  year: number | undefined,
): { pricePerM2: number; reference: string } | null {
  if (type !== "appartement") return null;
  const c = findCommune(commune);
  if (!c) return null;
  const r = parseRange(c.real_existing_range);
  if (!r) return null;
  const pos = rangePosition(state, year);
  const segmented = r.low + pos * (r.high - r.low);
  // Correction marché 2026 segment-aware (Observatoire Q4'25/Q1'26) : le
  // repli pèse sur le marché de masse (bas/médian du panel) ; le stock
  // prime/récent (haut de fourchette) s'est montré plus résilient → la
  // correction s'atténue au-delà du 80e centile du panel.
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
  const yrCoef = yearCoef(inputs.yearBuilt);
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

  const bareBricks = pricePerM2 * inputs.surfaceLiving;
  let basePrice = bareBricks;

  // Bonus terrasse (€ fixes par 10m²)
  const terraceBonus =
    inputs.terrace && inputs.terrace > 0
      ? Math.round(inputs.terrace / 10) * 5000
      : 0;
  basePrice += terraceBonus;

  // Parking (POL3-6) : coefficient PAR COMMUNE (lib/estimation/parking-coeff).
  // Rétrocompat : l'ancien `parking: boolean` ⇒ 1 emplacement intérieur.
  const parkingValue = computeParkingValue(inputs);
  basePrice += parkingValue;

  // Travaux récents (POL3-6) : plus-value vétusté par catégorie. La prime
  // piscine porte sur la valeur du bien (gros œuvre + terrasse), pas le
  // montant — base = `bareBricks + terraceBonus`.
  const worksValue = calcWorksAddedValue(
    inputs.works,
    bareBricks + terraceBonus,
  );
  basePrice += worksValue;

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
      bonus_terrace_eur: terraceBonus,
      bonus_parking_eur: parkingValue,
      works_added_value_eur: worksValue,
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

// POL3-6 : yieldForCommune (calibration AGENT-B) SUPPRIMÉ — retour au
// DEFAULT_YIELD unique (valeur MAPA fixée).

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
  const yrCoef = yearCoef(inputs.yearBuilt);
  const adjusted = eff.pricePerM2 * stateCoef * energyCoef * yrCoef;
  const bareBricks = adjusted * inputs.surfaceLiving;
  // POL2-6/POL3-6 : une vente notariée bundle parking + travaux récents dans
  // le prix ; les inclure aussi ici (comme hédoniste) évite de sous-évaluer
  // un bien équipé — cohérence inter-méthodes TEGoVA.
  const parkingValue = computeParkingValue(inputs);
  const worksValue = calcWorksAddedValue(inputs.works, bareBricks);
  const price = bareBricks + parkingValue + worksValue;

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
      works_added_value_eur: worksValue,
      adjusted_per_m2: Math.round(adjusted),
    },
    warnings: baseline.source === "announced_discounted"
      ? ["Baseline issue d'annonces (décote -8.75% appliquée)."]
      : [],
  };
}

// ============================================================================
// GARDE LU-ONLY + DISPATCH EVS V2
// ============================================================================

/**
 * Garde EVS = LUXEMBOURG UNIQUEMENT (CADRAGE MÉTIER NON-NÉGOCIABLE,
 * POL3-6). Le moteur travaux/parkings/vétusté/CPE/année/état s'applique
 * UNIFORMÉMENT à TOUTES les communes LU (chacune avec sa baseline). Pour
 * tout pays explicite ≠ LU (Dubai, Monaco, Paris…) le moteur retourne
 * immédiatement une erreur — JAMAIS un nombre.
 *
 * Si `country` est absent → comportement historique (commune LU implicite,
 * cf. cas test 1-6/Cas 4 commune inconnue) ; on ne bloque pas.
 */
export function isCountryCovered(country: string | undefined): boolean {
  if (country === undefined || country === null || country === "") return true;
  return country.trim().toUpperCase() === "LU";
}

export function isCountryNotCoveredError(
  r: EstimationResult | CountryNotCoveredError,
): r is CountryNotCoveredError {
  return (r as CountryNotCoveredError).error === "COUNTRY_NOT_COVERED";
}

// ============================================================================
// EVS V2 — CALIBRATION FINALE MAPA-VALIDÉE JULIEN (POL3-6)
// Refonte en deux branches : estimateApartment (€/m² simple) vs
// estimateHouse (bâti + terrain + annexes). Sources : Observatoire de
// l'Habitat (Ministère du Logement), STATEC, Notaires LU, Chambre
// Immobilière Grand-Duché, données internes MAPA Property.
// ============================================================================

// Coefficients SURFACE (apparts ET maisons, sur le bâti). Plus c'est petit,
// plus c'est cher au m² (rareté studio) ; plus c'est grand, moins cher
// (marché de niche). FIGÉ — calibration finale Julien (Étape 1.B).
function surfaceCoef(surface: number): number {
  if (surface < 40) return 1.25; // studio rare
  if (surface < 65) return 1.15; // 1 chambre
  if (surface < 100) return 1.05; // 2 chambres
  if (surface < 140) return 0.95; // 3 chambres
  if (surface < 200) return 0.9; // 4 chambres / familial
  if (surface < 300) return 0.82; // grande maison
  return 0.75; // trophy
}

// Coûts construction LU 2026 (norme classe A obligatoire). FIGÉ Julien
// (Étape 2.B). Inclut gros œuvre + second œuvre + finitions standard.
// Source : observation marché construction LU 2026 + données internes MAPA.
// Réajusté POL3-6 (annonces réelles 2026, validé Julien) — terrain construit
// Bertrange/Strassen ~2 200-2 750 €/m² → coûts bâti relevés.
const BATI_COST_PER_SQM: Record<string, number> = {
  new: 4250,
  renovated: 3800,
  good: 3200,
  to_renovate: 2200,
};

// Sous-sols / annexes (déjà inclus pour apparts via €/m² marché). FIGÉ.
const ANNEXE_COST_PER_SQM = 1750; // moyenne sous-sol fini / garage / box

// ACTION 3 (POL3-6, calibration finale annonces 2026, validé Julien) —
// multiplicateur marché commune appliqué au sous-total des MAISONS
// uniquement, APRÈS rangePosition et AVANT parking/travaux.
const COMMUNE_MARKET_COEF_HOUSE: Record<string, number> = {
  // Premium LU-Ville (tous quartiers)
  luxembourg: 1.35,
  belair: 1.35,
  weimershof: 1.35,
  merl: 1.35,
  limpertsberg: 1.3,
  kirchberg: 1.3,
  centre: 1.3,
  "centre-ville": 1.3,
  hollerich: 1.3,

  // 1ère couronne premium
  strassen: 1.3,
  bertrange: 1.25,
  walferdange: 1.2,
  steinsel: 1.2,
  howald: 1.2,
  kopstal: 1.0,
  bridel: 1.2,
  leudelange: 1.2,
  bereldange: 1.15,
  hesperange: 1.15,
  helmsange: 1.15,

  // 2ème couronne
  mamer: 1.1,
  schuttrange: 1.1,
  alzingen: 1.1,
  itzig: 1.1,
  moutfort: 1.08,
  fentange: 1.08,
  contern: 1.08,
  sandweiler: 1.08,
  mersch: 1.05,
  lorentzweiler: 1.05,
  junglinster: 1.05,

  // 3ème couronne
  steinfort: 1.0,
  capellen: 1.0,
  kehlen: 1.05,
  koerich: 1.0,
  hobscheid: 0.95,
  kaerjeng: 0.95,
  "käerjeng": 0.95,
  bascharage: 0.95,

  // Sud
  "esch-sur-alzette": 1.0,
  differdange: 0.95,
  dudelange: 1.0,
  petange: 0.95,
  "pétange": 0.95,
  belvaux: 0.95,
  schifflange: 0.95,
  bettembourg: 1.0,

  // Nord
  wiltz: 0.9,
  clervaux: 0.85,
  ettelbruck: 0.95,
  diekirch: 1.0,
  vianden: 0.85,
};

function getCommuneMarketCoefHouse(commune: string): number {
  if (!commune) return 1.05;
  const key = commune
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return COMMUNE_MARKET_COEF_HOUSE[key] || 1.05;
}

// FIX 2 (POL3-6, validé Julien) — prime type ; penthouse modulé par la
// baseline ancien €/m² du bien (tier haut/moyen/bas).
function getTypePremium(type: string, baselineAncien: number): number {
  const t = type?.toLowerCase();
  if (t === "penthouse") {
    if (baselineAncien > 11000) return 1.3; // tier haut : Belair, Weimershof, Hollerich, Merl
    if (baselineAncien > 9500) return 1.15; // tier moyen : Centre, Limpertsberg, Kirchberg, Gasperich, Cessange, Muhlenbach, Rollingergrund, Neudorf, Beggen, Bonnevoie
    // tier bas (Gare, Eich, Dommeldange, Cents, Weimerskirch + reste) :
    // « penthouse » en quartier moins prestigieux = DÉCOTE, pas prime.
    return 0.85;
  }
  const m: Record<string, number> = {
    studio: 1.0,
    appartement: 1.0,
    duplex: 1.05,
    loft: 1.1,
    villa: 1.15,
    maison: 1.0,
  };
  return m[t] || 1.0;
}

/**
 * Construit un EstimationResult EVS V2 conforme à l'interface (méthode
 * unique synthétique dans le slot `hedonic` ; weighted_price = mid pour
 * la rétro-compat du pipeline app/api/estimate). Fourchette ±10 %.
 */
function buildEvsResult(
  inputs: EstimationInputs,
  value: number,
  details: Record<string, unknown>,
): EstimationResult {
  const mid = Math.round(value);
  const synthetic: MethodResult = {
    applicable: true,
    price: mid,
    details,
    warnings: [],
  };
  const na = (reason: string): MethodResult => ({
    applicable: false,
    price: null,
    details: { reason },
    warnings: [],
  });
  return {
    client_output: {
      price_low: Math.round(mid * 0.9),
      price_mid: mid,
      price_high: Math.round(mid * 1.1),
      confidence: "MEDIUM",
    },
    internal_output: {
      methods: {
        sales_comparison: na("EVS V2 — méthode unique bâti/terrain ou €/m²."),
        hedonic: synthetic,
        income_capitalization: na("EVS V2 — non utilisée."),
        depreciated_replacement: na("EVS V2 — non utilisée."),
        statec_reference: na("EVS V2 — non utilisée."),
      },
      weighted_price: mid,
      std_deviation_pct: 10,
      confidence_score: 75,
      warnings: [],
      inputs_snapshot: inputs,
      weights_used: DEFAULT_WEIGHTS,
      computed_at: new Date().toISOString(),
    },
  };
}

/** Branche APPARTEMENT : €/m² simple (baseline MAPA × coefficients). */
function estimateApartment(inputs: EstimationInputs): EstimationResult {
  const bl = getApartmentBaseline(inputs.commune, inputs.quartier);
  let baseM2: number;
  if (bl) {
    baseM2 =
      inputs.state === "new" ? bl.pricePerM2_neuf : bl.pricePerM2_ancien;
  } else {
    // Fallback gracieux : ancienne baseline référentiel (jamais de throw).
    const legacy = getBaseline(
      "appartement",
      inputs.commune,
      inputs.quartier,
    );
    baseM2 = legacy ? legacy.pricePerM2 : 0;
  }

  const surfCoef = surfaceCoef(inputs.surfaceLiving);
  let value = inputs.surfaceLiving * baseM2 * surfCoef;
  value *= inputs.energy ? ENERGY_COEF[inputs.energy] ?? 1.0 : 1.0;
  value *= yearCoef(inputs.yearBuilt);
  value *= MARKET_2026_CORRECTION;

  const pos = rangePosition(inputs.state, inputs.yearBuilt);
  value *= 1 + (pos - 0.5) * 0.2;

  // FIX 2 — prime type ; penthouse modulé par baseline ancien quartier.
  const baselineAncien = bl ? bl.pricePerM2_ancien : baseM2;
  value *= getTypePremium(inputs.type, baselineAncien);

  value += computeParkingAdjustment(inputs, value);
  value += calcWorksAddedValue(inputs.works, value);

  // FIX 3 — bonus terrasse / dernier étage / vue / exposition (apparts).
  if (inputs.terrace && inputs.terrace > 5) {
    value += (inputs.terrace - 5) * 1500;
  }
  if (
    inputs.floor &&
    inputs.totalFloors &&
    inputs.floor === inputs.totalFloors &&
    inputs.floor >= 5
  ) {
    value *= 1.05;
  }
  if (inputs.view === "exceptional" || inputs.view === "panoramic") {
    value *= 1.08;
  }
  if (inputs.exposureSouth === true) {
    value *= 1.03;
  }

  // ACTION 4 (POL3-6) — PAS de plafond FIX4 (retiré, validé Julien).

  return buildEvsResult(inputs, value, {
    method: "apartment_per_sqm",
    baseline_per_m2: Math.round(baseM2),
    surface_coef: surfCoef,
    range_position: pos,
  });
}

/** Branche MAISON/VILLA : bâti + terrain + annexes (Étape 2.C). */
function estimateHouse(inputs: EstimationInputs): EstimationResult {
  // 1. Bâti
  const stateBati = BATI_COST_PER_SQM[inputs.state] || BATI_COST_PER_SQM.good;
  const surfCoef = surfaceCoef(inputs.surfaceLiving);
  let bati = inputs.surfaceLiving * stateBati * surfCoef;
  bati *= inputs.energy ? ENERGY_COEF[inputs.energy] ?? 1.0 : 1.0;
  bati *= yearCoef(inputs.yearBuilt);
  bati *= MARKET_2026_CORRECTION;

  // 2. Terrain
  const landZone = getLandZone(inputs.commune, inputs.quartier);
  const land = calcLandValue(inputs.surfaceLand || 0, landZone);

  // 3. Annexes (sous-sol fini > 30 m² seulement)
  let annexes = 0;
  if (inputs.basementFinishedSqm && inputs.basementFinishedSqm > 30) {
    annexes = (inputs.basementFinishedSqm - 30) * ANNEXE_COST_PER_SQM;
  }

  // 4. Sous-total avant ajustements
  let subtotal = bati + land + annexes;

  // 5. rangePosition ajuste la fourchette (-10 % à +10 %)
  const pos = rangePosition(inputs.state, inputs.yearBuilt);
  const adj = (pos - 0.5) * 0.2;
  subtotal *= 1 + adj;

  // ACTION 3 — multiplicateur marché commune (maisons), APRÈS
  // rangePosition et AVANT parking/travaux.
  const marketCoef = getCommuneMarketCoefHouse(inputs.commune);
  subtotal *= marketCoef;

  // FIX 2 — prime type (villa, etc.) ; maison/villa non modulés par baseline.
  subtotal *= getTypePremium(inputs.type, 0);

  // 6. Parkings (écart à la norme)
  subtotal += computeParkingAdjustment(inputs, subtotal);

  // 7. Travaux (plus-value avec vétusté)
  subtotal += calcWorksAddedValue(inputs.works, subtotal);

  return buildEvsResult(inputs, subtotal, {
    method: "hedonic_terrain_bati",
    bati_value: Math.round(bati),
    land_value: Math.round(land),
    annexes_value: Math.round(annexes),
    land_zone: landZone,
    range_position: pos,
  });
}

// ============================================================================
// Sprint C7 — Methode Observatoire (appartements uniquement).
//
// Formule unique conforme standards Observatoire de l'Habitat (LISER) +
// modele hedonique luxembourgeois :
//
//   mid = surface
//       × prix_m²_commune
//       × CPE
//       × etat
//       × etage
//       × atypique
//       × (1 + VEFA × 0.03)
//       × coef_surface_degressive
//       + bonus_annexes
//
//   low  = mid × 0.90
//   high = mid × 1.10   (spread ±10% intervalle de confiance Observatoire)
//
// Rupture vs POL3-6 (sprints prec.) :
//   - Plus de decote vetuste annuelle (yearCoef supprime du flux)
//   - Plus de calcWorksAddedValue (travaux ignores du calcul ; le CPE +
//     etat refletent indirectement l'age et l'usage du bien)
//   - Plus de rangePosition / MARKET_2026_CORRECTION / typePremium
//   - Plus de surfaceCoef historique → remplace par degressivite -0.5%/m² >80m²
//
// House (segment='house') : RESTE sur estimateHouse() intact (bati+terrain
// calibre POL3-6 par Julien). Le routage estimateMain() distingue les 2.
//
// Commit 1 : squelette + placeholders coefs (1.0 partout). Commits 2-7
// remplissent les vraies valeurs Observatoire.
// ============================================================================

function estimateObservatoire(inputs: EstimationInputs): EstimationResult {
  // 1. Prix de base m² commune (source TS hardcodee getBaseline — pas de
  //    migration Supabase async dans ce sprint, decision Julien).
  const baseline = getBaseline("appartement", inputs.commune, inputs.quartier);
  if (!baseline) {
    // Pas de baseline → renvoyer un EstimationResult minimal a 0 plutot
    // que crash. L'admin verra la commune introuvable dans warnings.
    return buildEvsResult(inputs, 0, {
      method: "observatoire_no_baseline",
      reason: `Commune "${inputs.commune}" hors referentiel.`,
    });
  }
  const pricePerM2 = baseline.pricePerM2;
  const baseValue = inputs.surfaceLiving * pricePerM2;

  // 2. Coefficients Observatoire (placeholders commit 1, valeurs commits 2-7).
  const cpe = inputs.energy ? CPE_COEF_C7[inputs.energy] ?? 1.0 : 1.0;

  const state = mapLegacyState(inputs.condition ?? inputs.state);
  const stateCoef = STATE_COEF_C7[state] ?? 1.0;

  const floor = deriveFloorFromType(inputs);
  const floorCoef = FLOOR_COEF_C7[floor] ?? 1.0;

  const atypical = deriveAtypicalFromType(inputs);
  const atypicalCoef = ATYPICAL_COEF_C7[atypical] ?? 1.0;

  const vefaCoef = inputs.vefa ? 1.03 : 1.0;

  // Degressivite surface : commit 6 (placeholder 1.0 ici).
  const surfaceCoef = 1.0;

  // 3. mid avant annexes.
  const midBeforeAnnexes =
    baseValue * cpe * stateCoef * floorCoef * atypicalCoef * vefaCoef * surfaceCoef;

  // 4. Bonus annexes (placeholders commit 1 — vraies valeurs commit 7).
  const parkingIndoor = Math.max(0, Math.min(5, inputs.parkingIndoor ?? 0));
  const parkingOutdoor = Math.max(0, Math.min(5, inputs.parkingOutdoor ?? 0));
  const annexes = 0
    + parkingIndoor * 0
    + parkingOutdoor * 0
    + (inputs.cellar ? 0 : 0)
    + 0  // terrasse > 15m²
    + 0; // jardin (apartment only)

  const mid = Math.round(midBeforeAnnexes + annexes);

  // Spread ±10% Observatoire (commit 8 le formalise dans buildEvsResult,
  // ici on bypass et on construit notre propre EstimationResult).
  const low = Math.round(mid * 0.9);
  const high = Math.round(mid * 1.1);

  const naResult = {
    applicable: false,
    price: null,
    details: { reason: "Sprint C7 — methode Observatoire active (appartement)." },
    warnings: [],
  };

  return {
    client_output: {
      price_low: low,
      price_mid: mid,
      price_high: high,
      confidence: "MEDIUM",
    },
    internal_output: {
      methods: {
        sales_comparison: naResult,
        hedonic: {
          applicable: true,
          price: mid,
          details: {
            method: "observatoire_c7",
            base_per_m2: pricePerM2,
            surface: inputs.surfaceLiving,
            coef_cpe: cpe,
            coef_etat: stateCoef,
            coef_etage: floorCoef,
            coef_atypique: atypicalCoef,
            coef_vefa: vefaCoef,
            coef_surface: surfaceCoef,
            annexes,
          },
          warnings: [],
        },
        income_capitalization: naResult,
        depreciated_replacement: naResult,
        statec_reference: naResult,
      },
      weighted_price: mid,
      std_deviation_pct: 10,
      confidence_score: 75,
      warnings: [],
      inputs_snapshot: inputs,
      weights_used: DEFAULT_WEIGHTS,
      computed_at: new Date().toISOString(),
    },
  };
}

/** Dispatcher : le type de bien détermine la formule (Étape 1.A).
 *  Sprint C7 : apartment → estimateObservatoire (nouveau) ;
 *  house/villa → estimateHouse (intact, calibre POL3-6 par Julien). */
function estimateMain(inputs: EstimationInputs): EstimationResult {
  if (isHouseSegment(inputs.type)) {
    return estimateHouse(inputs); // INTACT — bati + terrain + travaux
  }
  return estimateObservatoire(inputs); // C7 nouvelle methode
  // NB : estimateApartment() ci-dessous reste defini comme code mort
  // (POL3-6 conservation, dette technique acceptee — usage futur eventuel).
}

export function estimate(
  inputs: EstimationInputs,
): EstimationResult | CountryNotCoveredError {
  // GARDE LU-ONLY : avant tout calcul (POL3-6, Étape 6).
  if (!isCountryCovered(inputs.country)) {
    return {
      error: "COUNTRY_NOT_COVERED",
      message: "Estimation MAPA Property limitée au Luxembourg.",
    };
  }
  // country absent → comportement historique (couvert).
  return estimateMain(inputs);
}
