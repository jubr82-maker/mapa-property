// Sprint C13-bis C3 — Lookup + distance haversine sur les 600 localites
// du Luxembourg (source GeoNames officielle, fetchee via
// scripts/fetch-luxembourg-geonames.mjs).
//
// Aucune coordonnee inventee. Tous les couples lat/lng viennent de
// GeoNames.org (CC BY 4.0) qui est lui-meme aligne sur les donnees
// officielles luxembourgeoises (cadastre + ACT).
//
// Usage typique cote rayon de recherche (C4) :
//   const center = getLocalityCoords("Steinfort");
//   const target = getLocalityCoords(p.city);
//   if (center && target) {
//     const km = haversineKm(center.lat, center.lng, target.lat, target.lng);
//     if (km <= 10) // within radius
//   }

import localities from "./luxembourg-localities.json";

export interface Locality {
  name: string;
  asciiname: string;
  alternateNames: string[];
  lat: number;
  lng: number;
  population: number;
  featureCode: string;
  canton?: string;
}

export const LOCALITIES: Locality[] = localities as Locality[];

/**
 * Normalise pour le lookup : lowercase + strip accents NFD +
 * trims/condense espaces + replace -/_ par espace.
 */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Distance haversine en km entre 2 points WGS84.
 * Formule standard, rayon terrestre moyen 6371 km.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface LookupResult {
  name: string;
  lat: number;
  lng: number;
  canton?: string;
}

/**
 * Cherche une localite par nom (case-insensitive, accents-insensitive,
 * tirets/espaces tolerants). Match cascade :
 *  1. name normalise exact
 *  2. asciiname normalise exact
 *  3. n'importe quel alternateName normalise exact
 *  4. prefix match sur name normalise (ex. "luxembourg" -> "Luxembourg-Ville")
 *
 * Si plusieurs candidats, retourne celui avec la population la plus haute
 * (heuristique : le user veut la commune la plus connue avec ce nom).
 *
 * @returns LookupResult ou null si introuvable.
 */
export function getLocalityCoords(
  query: string | null | undefined,
): LookupResult | null {
  if (!query) return null;
  const q = normalize(query);
  if (!q) return null;

  const candidates: Locality[] = [];

  // 1 + 2. Match exact name OR asciiname normalises.
  for (const loc of LOCALITIES) {
    if (normalize(loc.name) === q || normalize(loc.asciiname) === q) {
      candidates.push(loc);
    }
  }
  if (candidates.length > 0) return pickBest(candidates);

  // 3. Match dans alternateNames.
  for (const loc of LOCALITIES) {
    if (loc.alternateNames.some((n) => normalize(n) === q)) {
      candidates.push(loc);
    }
  }
  if (candidates.length > 0) return pickBest(candidates);

  // 4. Prefix match — name commence par q (ex. "luxembourg" matche
  //    "Luxembourg-Ville", "Luxembourg-Dommeldange", etc.)
  for (const loc of LOCALITIES) {
    if (
      normalize(loc.name).startsWith(q) ||
      normalize(loc.asciiname).startsWith(q)
    ) {
      candidates.push(loc);
    }
  }
  if (candidates.length > 0) return pickBest(candidates);

  return null;
}

function pickBest(candidates: Locality[]): LookupResult {
  // Population la plus haute en premier (le user veut la commune la plus
  // probable avec ce nom).
  const sorted = candidates.slice().sort((a, b) => b.population - a.population);
  const best = sorted[0];
  return {
    name: best.name,
    lat: best.lat,
    lng: best.lng,
    canton: best.canton,
  };
}
