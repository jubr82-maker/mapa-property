/**
 * Parking — module DÉDIÉ (ne pas éditer lib/markets.ts partagé).
 *
 * POL3-6 — logique "ÉCART À LA NORME" (calibration finale MAPA, validée
 * Julien). Périmètre : LUXEMBOURG UNIQUEMENT (le moteur EVS est LU-only).
 *
 * Une vente notariée bundle le parking dans le prix. On ne valorise donc
 * pas un parking en absolu mais l'ÉCART à la norme attendue pour le type
 * et la surface du bien : un manque pénalise (malus % du prix), un surplus
 * valorise (bonus € fixe par place excédentaire, par strate de commune).
 *
 * Strates : Limpertsberg → FIRST_RING (corrigé vs proposition Agent B en
 * PRIME). Bonus = Scénario B confirmé par Julien.
 *
 * Sources : Observatoire de l'Habitat (Ministère du Logement), Notaires LU,
 * Chambre Immobilière Grand-Duché, données internes MAPA Property.
 *
 * Aucune dépendance I/O — fonctions pures, testables.
 */

import type { EstimationInputs } from "@/lib/estimation/engine";

// ============================================================================
// Legacy POL2-6 (conservé pour rétro-compat des appels existants — le
// pipeline EVS V2 utilise computeParkingAdjustment ci-dessous)
// ============================================================================

export interface ParkingCoeff {
  /** € pour 1 emplacement INTÉRIEUR (box/garage privatif). */
  interior: number;
  /** € pour 1 emplacement EXTÉRIEUR (place de parking). */
  exterior: number;
}

/** Normalisation : minuscules, sans accents, tirets → espaces. */
function normSpace(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/-/g, " ");
}

const LEGACY_PRIME = new Set(["belair"]);
const LEGACY_FIRST_RING = new Set([
  "strassen",
  "bertrange",
  "kirchberg",
  "limpertsberg",
]);
const LEGACY_WEST_RING = new Set([
  "steinfort",
  "mamer",
  "capellen",
  "kehlen",
  "koerich",
  "hobscheid",
  "kaerjeng",
]);
const LEGACY_SOUTH_BASIN = new Set([
  "esch sur alzette",
  "differdange",
  "dudelange",
  "petange",
]);

const LEGACY_COEFFS = {
  prime: { interior: 45000, exterior: 20000 },
  firstRing: { interior: 35000, exterior: 18000 },
  westRing: { interior: 30000, exterior: 15000 },
  southBasin: { interior: 22000, exterior: 12000 },
  other: { interior: 25000, exterior: 12000 },
} as const;

export function getParkingCoeff(
  commune: string,
  quartier?: string,
): ParkingCoeff {
  const c = normSpace(commune);
  const q = quartier ? normSpace(quartier) : "";
  if (c.startsWith("luxembourg")) {
    if (q && LEGACY_FIRST_RING.has(q)) return LEGACY_COEFFS.firstRing;
    return LEGACY_COEFFS.prime;
  }
  if (LEGACY_PRIME.has(c)) return LEGACY_COEFFS.prime;
  if (LEGACY_FIRST_RING.has(c)) return LEGACY_COEFFS.firstRing;
  if (LEGACY_WEST_RING.has(c)) return LEGACY_COEFFS.westRing;
  if (LEGACY_SOUTH_BASIN.has(c)) return LEGACY_COEFFS.southBasin;
  return LEGACY_COEFFS.other;
}

export function calcParkingValue(
  commune: string,
  quartier: string | undefined,
  interiorCount: number,
  exteriorCount: number,
): number {
  const k = getParkingCoeff(commune, quartier);
  const ni = Math.max(0, Math.min(10, Math.floor(interiorCount || 0)));
  const ne = Math.max(0, Math.min(10, Math.floor(exteriorCount || 0)));
  return ni * k.interior + ne * k.exterior;
}

// ============================================================================
// POL3-6 — PARKING "ÉCART À LA NORME" (calibration finale MAPA)
// ============================================================================

// Norme parking selon type et surface
function normParkings(type: string, surface: number): number {
  if (type === "maison" || type === "villa") return 2;
  if (type === "studio") return 0;
  if (type === "appartement" && surface <= 40) return 0;
  if (surface <= 65) return 1; // 1 chambre
  if (surface <= 100) return 1; // 2 chambres
  return 2; // 3 chambres+ ou >100m²
}

// Strates communes — Limpertsberg → FIRST_RING (corrigé vs Agent B en PRIME)
const PARKING_PRIME = [
  "belair",
  "centre",
  "centre-ville",
  "hollerich",
  "weimershof",
  "merl",
];
const PARKING_FIRST_RING = [
  "limpertsberg",
  "kirchberg",
  "strassen",
  "bertrange",
  "gasperich",
  "gasperich-cloche-d-or",
  "cessange",
  "cents",
];
const PARKING_SECOND_RING = [
  "mamer",
  "bonnevoie",
  "gare",
  "beggen",
  "neudorf",
  "rollingergrund",
  "muhlenbach",
  "eich",
  "dommeldange",
  "bridel",
  "leudelange",
];
const PARKING_WEST = [
  "steinfort",
  "capellen",
  "kehlen",
  "koerich",
  "hobscheid",
  "kaerjeng",
  "käerjeng",
  "mersch",
  "lorentzweiler",
  "kopstal",
];
const PARKING_NORTH_EAST = [
  "walferdange",
  "steinsel",
  "howald",
  "hesperange",
  "schuttrange",
  "alzingen",
  "itzig",
  "bereldange",
  "helmsange",
  "moutfort",
  "fentange",
  "contern",
  "sandweiler",
  "heisdorf",
];
const PARKING_SOUTH = [
  "esch-sur-alzette",
  "differdange",
  "dudelange",
  "petange",
  "pétange",
  "belvaux",
  "schifflange",
  "bettembourg",
  "soleuvre",
  "sanem",
  "rumelange",
  "kayl",
  "belval",
  "oberkorn",
  "niederkorn",
  "rodange",
];

// Bonus valeurs (Scénario B confirmé par Julien)
const PARKING_BONUS: Record<string, { interior: number; exterior: number }> = {
  prime: { interior: 85000, exterior: 45000 },
  first_ring: { interior: 80000, exterior: 35000 },
  second_ring: { interior: 45000, exterior: 22000 },
  west: { interior: 25000, exterior: 12000 },
  north_east: { interior: 28000, exterior: 14000 },
  south: { interior: 22000, exterior: 12000 },
  other: { interior: 20000, exterior: 10000 },
};

// Malus manque (% du prix bien)
function parkingMalusRate(stratum: string): number {
  if (stratum === "prime" || stratum === "first_ring") return 0.05;
  return 0.03;
}

function getParkingStratum(commune: string, quartier?: string): string {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  const key = quartier ? norm(quartier) : norm(commune);
  if (PARKING_PRIME.includes(key)) return "prime";
  if (PARKING_FIRST_RING.includes(key)) return "first_ring";
  if (PARKING_SECOND_RING.includes(key)) return "second_ring";
  if (PARKING_WEST.includes(key)) return "west";
  if (PARKING_NORTH_EAST.includes(key)) return "north_east";
  if (PARKING_SOUTH.includes(key)) return "south";
  return "other";
}

export function computeParkingAdjustment(
  inputs: EstimationInputs,
  propertyValue: number,
): number {
  const interior = Math.min(Math.max(0, inputs.parkingInterior || 0), 10);
  const exterior = Math.min(Math.max(0, inputs.parkingExterior || 0), 10);
  const totalParkings = interior + exterior;
  const expected = normParkings(inputs.type, inputs.surfaceLiving);
  const ecart = totalParkings - expected;

  // Cas spécial studio (norme 0) avec parking
  if (expected === 0 && totalParkings > 0) {
    return propertyValue * 0.05; // +5% bonus
  }

  const stratum = getParkingStratum(inputs.commune, inputs.quartier);

  if (ecart === 0) return 0; // norme atteinte

  if (ecart < 0) {
    // Manque : malus
    return -propertyValue * parkingMalusRate(stratum) * Math.abs(ecart);
  }

  // Surplus : bonus par parking en plus
  // Priorité intérieurs sur extérieurs pour ratio bonus
  const interiorSurplus = Math.max(0, interior - expected);
  let exteriorSurplus = exterior;
  if (interior < expected) {
    // Les extérieurs comblent d'abord la norme
    const exteriorFillingNorm = Math.min(exterior, expected - interior);
    exteriorSurplus = Math.max(0, exterior - exteriorFillingNorm);
  }

  const bonus = PARKING_BONUS[stratum] || PARKING_BONUS.other;
  return interiorSurplus * bonus.interior + exteriorSurplus * bonus.exterior;
}
