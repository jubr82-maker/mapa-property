// Moteur de calcul d'acquisition immobilière par pays.
// API publique : `computeAcquisition(profile, price)`.
//
// Sources documentées dans :
//  - lib/acquisition/sources.json
//  - lib/acquisition/country-rules.ts (propriété `source` de chaque résultat)
//  - ACQUISITION_RULES_BY_COUNTRY.md (racine repo)

import type { AcquisitionResult, BuyerProfile, CountryCode } from "./types";
import { COUNTRY_COMPUTE } from "./country-rules";

export function computeAcquisition(
  profile: BuyerProfile,
  price: number,
): AcquisitionResult {
  const fn = COUNTRY_COMPUTE[profile.country];
  if (!fn) {
    return {
      country: profile.country,
      supported: false,
      unsupportedReason:
        "Pays non couvert par le simulateur. Contactez-nous pour une estimation personnalisée.",
      price,
      grossFees: {
        registrationOrTransferTax: 0,
        notary: 0,
        mortgage: 0,
        total: 0,
      },
      aids: [],
      netFees: 0,
      totalAcquisitionNet: price,
      financing: {
        maxLTV: 0,
        typicalRateAnnual: 0,
        maxDurationYears: 0,
        source: { name: "", url: "", lastVerified: "" },
      },
      warnings: [],
      disclaimer: "Aucun calcul disponible.",
      sources: [],
    };
  }
  return fn(profile, price);
}

/**
 * Normalise une valeur `country` arbitraire (venant d'Apimo ou d'une saisie
 * manuelle) vers un `CountryCode` strict. Retourne `null` si non supporté
 * (PAS de fallback silencieux sur LU).
 */
export function normalizeCountry(input: string | null | undefined): CountryCode | null {
  if (!input) return null;
  const k = input.trim().toUpperCase();

  // Codes ISO directs
  if (k === "LU" || k === "FR" || k === "BE" || k === "DE" || k === "PT" || k === "AE") {
    return k;
  }

  // Variantes textuelles fréquentes (Apimo, BO admin)
  const NAMES: Record<string, CountryCode> = {
    LUXEMBOURG: "LU",
    "LUXEMBURG": "LU",
    "GRAND-DUCHÉ DE LUXEMBOURG": "LU",
    "GRAND DUCHE DE LUXEMBOURG": "LU",
    FRANCE: "FR",
    BELGIQUE: "BE",
    BELGIUM: "BE",
    BELGIË: "BE",
    BELGIE: "BE",
    ALLEMAGNE: "DE",
    GERMANY: "DE",
    DEUTSCHLAND: "DE",
    PORTUGAL: "PT",
    "ÉMIRATS ARABES UNIS": "AE",
    "EMIRATS ARABES UNIS": "AE",
    "UNITED ARAB EMIRATES": "AE",
    "UAE": "AE",
    "DUBAI": "AE",
    "DUBAÏ": "AE",
    "ABU DHABI": "AE",
  };

  return NAMES[k] ?? null;
}

export type {
  AcquisitionResult,
  BuyerProfile,
  CountryCode,
  FinancingTerms,
  GrossFees,
  Source,
  StateAidApplicable,
} from "./types";
