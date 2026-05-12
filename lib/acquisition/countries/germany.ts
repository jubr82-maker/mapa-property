import type {
  AcquisitionInput,
  AcquisitionLineItem,
  AcquisitionResult,
  AcquisitionSource,
} from '../types';
import { DEFAULT_LEGAL_NOTICE } from '../legal-notice';
import { cityToRegion } from '../city-to-region';

const SOURCES: AcquisitionSource[] = [
  {
    label: 'Bundesfinanzministerium',
    url: 'https://www.bundesfinanzministerium.de/',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'BMWSB Wohnen',
    url: 'https://www.bmwsb.bund.de/',
    verifiedDate: '2026-05-12',
  },
  { label: 'KfW', url: 'https://www.kfw.de/', verifiedDate: '2026-05-12' },
];

// Grunderwerbsteuer par Land (2026)
const GRUNDERWERBSTEUER: Record<string, number> = {
  Bayern: 0.035,
  Sachsen: 0.055,
  Berlin: 0.06,
  Hamburg: 0.055,
  Bremen: 0.055,
  'Baden-Württemberg': 0.05,
  Niedersachsen: 0.05,
  'Rheinland-Pfalz': 0.05,
  'Sachsen-Anhalt': 0.05,
  Hessen: 0.06,
  'Mecklenburg-Vorpommern': 0.06,
  Brandenburg: 0.065,
  'Nordrhein-Westfalen': 0.065,
  Saarland: 0.065,
  'Schleswig-Holstein': 0.065,
  Thüringen: 0.05,
};

const NOTARY_GRUNDBUCH_RATE = 0.0175; // 1,5-2% : moyenne 1,75% (notaire + Grundbuch)
const FALLBACK_RATE = 0.05; // moyenne nationale si Land inconnu

export function computeGermany(input: AcquisitionInput): AcquisitionResult {
  const { price, city, buyerProfile } = input;
  const lineItems: AcquisitionLineItem[] = [];
  const warnings: string[] = [];

  const regionMatch = cityToRegion(city);
  const land =
    regionMatch && regionMatch.country === 'DE' ? regionMatch.region : null;

  let grunderwerbRate: number;
  let landLabel: string;
  if (land && GRUNDERWERBSTEUER[land] !== undefined) {
    grunderwerbRate = GRUNDERWERBSTEUER[land];
    landLabel = land;
  } else {
    grunderwerbRate = FALLBACK_RATE;
    landLabel = 'Allemagne (moyenne)';
    warnings.push(
      `Land non identifié pour la ville "${city}" — moyenne nationale appliquée (5%). Confirmation impérative auprès d'un notaire local.`,
    );
  }

  // ── Grunderwerbsteuer (droit mutation par Land)
  lineItems.push({
    label: `Grunderwerbsteuer ${landLabel} (${(grunderwerbRate * 100).toFixed(1).replace('.', ',')}%)`,
    amount: Math.round(price * grunderwerbRate),
    rate: grunderwerbRate,
    isPercentage: true,
    notes: 'Taux fixé par chaque Land. Payable dans les 4 semaines après notification du Finanzamt.',
  });

  // ── Notaire + Grundbuch (~1,75%)
  const notaryGrundbuch = price * NOTARY_GRUNDBUCH_RATE;
  lineItems.push({
    label: 'Notaire + inscription Grundbuch (~1,75%)',
    amount: Math.round(notaryGrundbuch),
    rate: NOTARY_GRUNDBUCH_RATE,
    isPercentage: true,
    notes: 'Honoraires notariés (GNotKG) ~1-1,5% + inscription registre foncier ~0,5%. TVA 19% incluse.',
  });

  // ── Note : commission agent immobilier 3-7% + MwSt 19%
  //    Depuis décembre 2020 (§656c BGB), split 50/50 buyer/seller obligatoire si exclusive.
  //    Information : pas inclus dans le total (variable selon mandat).
  lineItems.push({
    label: "Commission agent (information — non incluse)",
    amount: 0,
    isPercentage: false,
    notes:
      "Commission agent 3-7% + MwSt 19%. Depuis décembre 2020 (§656c BGB), partage 50/50 buyer/seller obligatoire pour mandat exclusif RP. Variable selon mandat — à confirmer.",
  });

  // ── Warnings
  if (!buyerProfile.isResident) {
    warnings.push(
      "Non-résident en Allemagne : apport personnel typique 30-40% (closing costs PAS finançables par les banques allemandes). Le KfW Wohneigentumsprogramm (124) est réservé aux résidents fiscaux.",
    );
  }

  const totalCost = lineItems.reduce((acc, li) => acc + li.amount, 0);
  const totalCostPercent = price > 0 ? (totalCost / price) * 100 : 0;

  return {
    countryCode: 'DE',
    countryName: 'Allemagne',
    region: landLabel,
    totalCost: Math.round(totalCost),
    totalCostPercent: Math.round(totalCostPercent * 100) / 100,
    lineItems,
    warnings,
    sources: SOURCES,
    legalNotice: { ...DEFAULT_LEGAL_NOTICE },
  };
}
