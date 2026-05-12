import type {
  AcquisitionInput,
  AcquisitionLineItem,
  AcquisitionResult,
  AcquisitionSource,
} from '../types';
import { DEFAULT_LEGAL_NOTICE } from '../legal-notice';

const SOURCES: AcquisitionSource[] = [
  {
    label: 'Gouvernement Monaco',
    url: 'https://www.gouv.mc/',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'Chambre Immobilière Monégasque',
    url: 'https://www.cim.mc/',
    verifiedDate: '2026-05-12',
  },
];

const NOTARY_RATE = 0.015; // 1,5% notaire dans tous les cas
const VEFA_DUTY_RATE = 0.01; // 1% droits VEFA / neuf
const OLD_INDIVIDUAL_DUTY_RATE = 0.0475; // 4,75% droits personne physique / résident
const OFFSHORE_DUTY_RATE = 0.10; // 10% droits société offshore

// Heuristique nationalités "présumées personne physique" hors société.
const PRESUMED_INDIVIDUAL_NATIONALITIES = new Set(['FR', 'MC', 'IT']);

export function computeMonaco(input: AcquisitionInput): AcquisitionResult {
  const { price, propertyType, buyerProfile } = input;
  const lineItems: AcquisitionLineItem[] = [];
  const warnings: string[] = [];

  // ── Frais de notaire (1,5%)
  const notaryFees = price * NOTARY_RATE;
  lineItems.push({
    label: 'Frais de notaire (1,5%)',
    amount: Math.round(notaryFees),
    rate: NOTARY_RATE,
    isPercentage: true,
    notes: 'Honoraires notariés Monaco — taux fixe 1,5%.',
  });

  // ── Droits selon nature du bien et profil
  if (propertyType === 'new') {
    // VEFA / neuf : 1% droits
    lineItems.push({
      label: "Droits d'enregistrement VEFA / neuf (1%)",
      amount: Math.round(price * VEFA_DUTY_RATE),
      rate: VEFA_DUTY_RATE,
      isPercentage: true,
      notes:
        "VEFA Monaco : droits 1% (au lieu de 4,75% sur l'ancien). Total acquisition ≈ 2,5% (1,5% notaire + 1% droits).",
    });
  } else {
    // Ancien : 4,75% (personne physique) ou 10% (société offshore présumée)
    const nationality = buyerProfile.nationality?.toUpperCase();
    const isPresumedIndividual =
      buyerProfile.isResident ||
      (nationality !== undefined && PRESUMED_INDIVIDUAL_NATIONALITIES.has(nationality));

    if (isPresumedIndividual) {
      lineItems.push({
        label: "Droits d'enregistrement ancien (4,75%)",
        amount: Math.round(price * OLD_INDIVIDUAL_DUTY_RATE),
        rate: OLD_INDIVIDUAL_DUTY_RATE,
        isPercentage: true,
        notes:
          "Taux personne physique résidente ou ressortissante FR/MC/IT. Total ≈ 6,25% (1,5% + 4,75%).",
      });
    } else {
      lineItems.push({
        label: "Droits d'enregistrement ancien — société offshore présumée (10%)",
        amount: Math.round(price * OFFSHORE_DUTY_RATE),
        rate: OFFSHORE_DUTY_RATE,
        isPercentage: true,
        notes:
          'Acquisition via société non FR/MC/IT : droits 10% présumés. Total ≈ 11,5% (1,5% + 10%). Consultez votre notaire pour confirmation.',
      });
      warnings.push(
        "Société offshore présumée : droits 10% (total ≈ 11,5%). Confirmez le statut exact d'acquéreur (personne physique vs société) avec votre notaire.",
      );
    }
  }

  // ── Commission Chambre Immobilière Monégasque (info, non incluse — variable)
  lineItems.push({
    label: 'Commission CIM acheteur (information)',
    amount: 0,
    isPercentage: false,
    notes:
      'Commission Chambre Immobilière Monégasque : 3% + TVA 20% à charge acheteur (usage). Non incluse dans le calcul — variable selon mandat.',
  });

  // ── Note fiscalité avantageuse Monaco
  if (!buyerProfile.isResident) {
    warnings.push(
      "Non-résident à Monaco : la fiscalité avantageuse (pas de taxe foncière, pas d'IR sauf nationalité française, pas de capital gains) requiert l'obtention de la carte de résident monégasque. À étudier avec un conseiller fiscal indépendant.",
    );
  }

  const totalCost = lineItems.reduce((acc, li) => acc + li.amount, 0);
  const totalCostPercent = price > 0 ? (totalCost / price) * 100 : 0;

  return {
    countryCode: 'MC',
    countryName: 'Monaco',
    region: 'Monaco',
    totalCost: Math.round(totalCost),
    totalCostPercent: Math.round(totalCostPercent * 100) / 100,
    lineItems,
    warnings,
    sources: SOURCES,
    legalNotice: { ...DEFAULT_LEGAL_NOTICE },
  };
}
