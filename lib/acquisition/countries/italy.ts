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
    label: 'Agenzia delle Entrate — Guida Acquisto Casa',
    url: 'https://www.agenziaentrate.gov.it/',
    verifiedDate: '2026-05-12',
  },
  {
    label: "Ministero dell'Economia e delle Finanze",
    url: 'https://www.mef.gov.it/',
    verifiedDate: '2026-05-12',
  },
];

// Prima casa (résidence principale)
const PRIMA_CASA_REGISTRO_RATE = 0.02; // 2% imposta di registro (ancien — privé)
const PRIMA_CASA_IVA_RATE = 0.04; // 4% IVA (neuf — constructeur)
const PRIMA_CASA_FIXED_FEES = 50; // 50€ ipotecaria + 50€ catastale (privé)
const PRIMA_CASA_IVA_FIXED_FEES = 200; // 200€ + 200€ (neuf entreprise)

// Seconda casa (résidence secondaire / investissement)
const SECONDA_CASA_REGISTRO_RATE = 0.09; // 9% imposta di registro (ancien — privé)
const SECONDA_CASA_IVA_RATE = 0.10; // 10% IVA (neuf — constructeur, hors luxe)
const SECONDA_CASA_FIXED_FEES = 50; // 50€ + 50€

// Barème notaire simplifié (selon prix)
function computeNotaryFees(price: number): number {
  if (price < 200_000) return 3000;
  if (price < 300_000) return 4000;
  return 5500;
}

export function computeItaly(input: AcquisitionInput): AcquisitionResult {
  const { price, propertyType, usage, buyerProfile, city } = input;
  const lineItems: AcquisitionLineItem[] = [];
  const warnings: string[] = [];

  const regionMatch = cityToRegion(city);
  const region =
    regionMatch && regionMatch.country === 'IT' ? regionMatch.region : null;

  const isPrimary = usage === 'primary';

  if (isPrimary) {
    // ── Prima casa
    if (propertyType === 'new') {
      // Neuf via constructeur/entreprise : IVA 4% + 200€ + 200€
      const iva = price * PRIMA_CASA_IVA_RATE;
      lineItems.push({
        label: 'IVA Prima casa neuf (4%)',
        amount: Math.round(iva),
        rate: PRIMA_CASA_IVA_RATE,
        isPercentage: true,
        notes:
          "Taux réduit 4% IVA pour Prima casa achetée auprès d'une entreprise constructrice. Conditions Prima casa à respecter (résidence dans 18 mois, pas d'autre RP).",
      });
      lineItems.push({
        label: 'Imposta ipotecaria (forfait)',
        amount: PRIMA_CASA_IVA_FIXED_FEES,
        isPercentage: false,
        notes: 'Forfait 200 € applicable en cas d\'IVA.',
      });
      lineItems.push({
        label: 'Imposta catastale (forfait)',
        amount: PRIMA_CASA_IVA_FIXED_FEES,
        isPercentage: false,
        notes: 'Forfait 200 € applicable en cas d\'IVA.',
      });
    } else {
      // Ancien / privé : Imposta di Registro 2% + 50€ + 50€
      const registro = price * PRIMA_CASA_REGISTRO_RATE;
      lineItems.push({
        label: 'Imposta di Registro Prima casa (2%)',
        amount: Math.round(registro),
        rate: PRIMA_CASA_REGISTRO_RATE,
        isPercentage: true,
        notes:
          "Taux réduit Prima casa 2% sur valeur cadastrale (ou prix si choisi). Conditions : résidence dans 18 mois, pas d'autre RP en Italie.",
      });
      lineItems.push({
        label: 'Imposta ipotecaria (forfait)',
        amount: PRIMA_CASA_FIXED_FEES,
        isPercentage: false,
        notes: 'Forfait 50 €.',
      });
      lineItems.push({
        label: 'Imposta catastale (forfait)',
        amount: PRIMA_CASA_FIXED_FEES,
        isPercentage: false,
        notes: 'Forfait 50 €.',
      });
    }

    warnings.push(
      "Catégories A/1, A/8, A/9 (manoir, villa luxe, château) exclues de la Prima casa — vérifier la classification cadastrale du bien auprès du notaire.",
    );
  } else {
    // ── Seconda casa (secondaire / investissement)
    if (propertyType === 'new') {
      // Neuf entreprise : IVA 10% (luxe 22% non détectable → warning)
      const iva = price * SECONDA_CASA_IVA_RATE;
      lineItems.push({
        label: 'IVA Seconda casa neuf (10%)',
        amount: Math.round(iva),
        rate: SECONDA_CASA_IVA_RATE,
        isPercentage: true,
        notes:
          "Taux 10% IVA Seconda casa neuve (hors luxe). Pour catégories de luxe A/1, A/8, A/9 : IVA 22% — vérifier classification cadastrale.",
      });
      lineItems.push({
        label: 'Imposta ipotecaria (forfait)',
        amount: SECONDA_CASA_FIXED_FEES,
        isPercentage: false,
        notes: 'Forfait 50 € applicable en cas d\'IVA pour Seconda casa.',
      });
      lineItems.push({
        label: 'Imposta catastale (forfait)',
        amount: SECONDA_CASA_FIXED_FEES,
        isPercentage: false,
        notes: 'Forfait 50 € applicable en cas d\'IVA pour Seconda casa.',
      });
      warnings.push(
        "Catégories de luxe A/1, A/8, A/9 : IVA 22% au lieu de 10%. Vérifier la classification cadastrale auprès du notaire.",
      );
    } else {
      // Ancien privé : Imposta di Registro 9% + 50€ + 50€
      const registro = price * SECONDA_CASA_REGISTRO_RATE;
      lineItems.push({
        label: 'Imposta di Registro Seconda casa (9%)',
        amount: Math.round(registro),
        rate: SECONDA_CASA_REGISTRO_RATE,
        isPercentage: true,
        notes:
          'Taux standard Seconda casa 9% sur valeur cadastrale (option prezzo-valore) ou prix.',
      });
      lineItems.push({
        label: 'Imposta ipotecaria (forfait)',
        amount: SECONDA_CASA_FIXED_FEES,
        isPercentage: false,
        notes: 'Forfait 50 €.',
      });
      lineItems.push({
        label: 'Imposta catastale (forfait)',
        amount: SECONDA_CASA_FIXED_FEES,
        isPercentage: false,
        notes: 'Forfait 50 €.',
      });
    }
  }

  // ── Frais notaire (barème simplifié)
  const notaryFees = computeNotaryFees(price);
  lineItems.push({
    label: 'Frais de notaire (forfait simplifié)',
    amount: notaryFees,
    isPercentage: false,
    notes:
      'Barème indicatif : 3 000 € (<200 K€) / 4 000 € (200-300 K€) / 5 500 € (≥300 K€). Inclut honoraires, IVA 22% et débours. À confirmer auprès du notaire italien.',
  });

  // ── Warnings
  if (!buyerProfile.isResident) {
    warnings.push(
      'Apport non-résident 30-50% recommandé (LTV ≤ 60-70%). Les banques italiennes appliquent des conditions plus strictes pour les non-résidents.',
    );
  }

  const totalCost = lineItems.reduce((acc, li) => acc + li.amount, 0);
  const totalCostPercent = price > 0 ? (totalCost / price) * 100 : 0;

  return {
    countryCode: 'IT',
    countryName: 'Italie',
    region: region ?? undefined,
    totalCost: Math.round(totalCost),
    totalCostPercent: Math.round(totalCostPercent * 100) / 100,
    lineItems,
    warnings,
    sources: SOURCES,
    legalNotice: { ...DEFAULT_LEGAL_NOTICE },
  };
}
