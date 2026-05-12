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
    label: 'LFAIE (Lex Koller) — BJ',
    url: 'https://www.bj.admin.ch/',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'Confédération suisse',
    url: 'https://www.admin.ch/',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'État de Genève',
    url: 'https://www.ge.ch/',
    verifiedDate: '2026-05-12',
  },
];

const LEX_KOLLER_MESSAGE = `🇨🇭 Suisse — La Lex Koller restreint strictement l'acquisition immobilière par les non-résidents.
• Résidence principale : accessible uniquement avec résidence effective en Suisse (permis B, C ou L)
• Résidence secondaire : quotas cantonaux limités, Genève et Zurich excluent les non-résidents, possibilité dans cantons touristiques (Valais, Vaud, Grisons, Tessin)
• Investissement locatif : INTERDIT pour les non-résidents
• Pour un projet d'acquisition en Suisse, contactez-nous pour une analyse personnalisée.`;

// Frais notaire + registre + droits cantonaux : moyenne 4% (variable 3-5% selon canton).
const NOTARY_REGISTRY_DUTIES_RATE = 0.04;

export function computeSwitzerland(input: AcquisitionInput): AcquisitionResult {
  const { price, city, buyerProfile, usage, downPaymentPercent } = input;

  // ── Cas Lex Koller : non-résident → notCovered immédiat
  if (!buyerProfile.isResident) {
    return {
      countryCode: 'CH',
      countryName: 'Suisse',
      totalCost: 0,
      totalCostPercent: 0,
      lineItems: [],
      warnings: [],
      sources: SOURCES,
      legalNotice: { ...DEFAULT_LEGAL_NOTICE },
      notCovered: true,
      contactMessage: LEX_KOLLER_MESSAGE,
    };
  }

  // ── Résident suisse (permis B, C, L) — calcul possible
  const lineItems: AcquisitionLineItem[] = [];
  const warnings: string[] = [];

  const regionMatch = cityToRegion(city);
  const canton =
    regionMatch && regionMatch.country === 'CH' ? regionMatch.region : null;

  if (!canton) {
    warnings.push(
      `Canton non identifié pour la ville "${city}". Estimation indicative moyenne nationale 4% appliquée. Confirmation impérative auprès d'un notaire cantonal.`,
    );
  }

  // ── Apport minimum : 20% RP / 40% secondaire
  const isPrimary = usage === 'primary';
  const minDownPayment = isPrimary ? 20 : 40;
  if (downPaymentPercent < minDownPayment) {
    warnings.push(
      `Apport ${downPaymentPercent}% < ${minDownPayment}% (minimum ${isPrimary ? 'résidence principale' : 'résidence secondaire'} requis par les banques suisses).`,
    );
  }

  // ── Frais notaire + registre + droits cantonaux (3-5% selon canton, moyenne 4%)
  const notaryAndDuties = price * NOTARY_REGISTRY_DUTIES_RATE;
  lineItems.push({
    label: `Frais notaire + registre foncier + droits de mutation (${(NOTARY_REGISTRY_DUTIES_RATE * 100).toFixed(0)}%)`,
    amount: Math.round(notaryAndDuties),
    rate: NOTARY_REGISTRY_DUTIES_RATE,
    isPercentage: true,
    notes: `Variable selon canton 3-5% (notaire ~0,5-1%, registre foncier ~0,3-0,5%, droits de mutation cantonaux 1-3,5%). ${canton ?? 'Canton non identifié'} — à confirmer auprès d'un notaire local.`,
  });

  // ── Information hypothèque
  lineItems.push({
    label: 'Structure hypothécaire (information — non incluse)',
    amount: 0,
    isPercentage: false,
    notes:
      "Suisse : 1ère hypothèque jusqu'à 65% de la valeur + 2ème hypothèque jusqu'à 15% (à amortir sur 15 ans maximum ou avant 65 ans). Apport personnel (fonds propres) minimum 20% RP / 40% secondaire.",
  });

  // ── Test d'effort (taux stressé 5%)
  lineItems.push({
    label: "Test d'effort bancaire (information — non incluse)",
    amount: 0,
    isPercentage: false,
    notes:
      "Test d'effort à taux stressé 5% : charges totales (intérêts hypothécaires + amortissement 2ème hypothèque + entretien 1%) doivent rester ≤ 1/3 du revenu brut. À vérifier avec votre banque.",
  });
  warnings.push(
    "Test d'effort bancaire : capacité de remboursement vérifiée à taux stressé 5% (≤ 1/3 des revenus). Vérification impérative auprès de votre établissement bancaire suisse.",
  );

  const totalCost = lineItems.reduce((acc, li) => acc + li.amount, 0);
  const totalCostPercent = price > 0 ? (totalCost / price) * 100 : 0;

  return {
    countryCode: 'CH',
    countryName: 'Suisse',
    region: canton ?? undefined,
    totalCost: Math.round(totalCost),
    totalCostPercent: Math.round(totalCostPercent * 100) / 100,
    lineItems,
    warnings,
    sources: SOURCES,
    legalNotice: { ...DEFAULT_LEGAL_NOTICE },
  };
}
