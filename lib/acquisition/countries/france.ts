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
    label: 'Service-Public.fr — Droits de mutation',
    url: 'https://www.service-public.fr/particuliers/vosdroits/F10871',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'impots.gouv.fr',
    url: 'https://www.impots.gouv.fr/',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'HCSF',
    url: 'https://www.economie.gouv.fr/hcsf',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'Notaires de France',
    url: 'https://www.notaires.fr/',
    verifiedDate: '2026-05-12',
  },
];

// Taux DMTO (depuis 1er avril 2025, 83 départements à 6,32%)
const DMTO_DEFAULT_OLD = 0.0632; // 6,32% ancien (taux majoré)
const DMTO_REDUCED_OLD = 0.0581; // 5,81% (06 + primo-accédant exempté de la hausse)
const DMTO_REDUCED_36_56 = 0.0509; // 5,09% (départements 36, 56)
const DMTO_NEW = 0.00715; // 0,715% neuf

function computeDmtoRate(
  region: string | null,
  propertyType: 'new' | 'old',
  isFirstTimeBuyer: boolean,
): { rate: number; note: string; department: string } {
  if (propertyType === 'new') {
    return {
      rate: DMTO_NEW,
      note: "Neuf / VEFA : taxe de publicité foncière 0,715% (TVA 20% incluse dans le prix promoteur).",
      department: region ?? 'France',
    };
  }

  // Ancien
  if (region === '36' || region === '56') {
    return {
      rate: DMTO_REDUCED_OLD,
      note: `Département ${region} — taux réduit 5,09% (départements n'ayant pas adopté la hausse 5,81→6,32%).`,
      department: region,
    };
  }

  if (region === '06') {
    return {
      rate: DMTO_REDUCED_OLD,
      note: 'Département 06 (Alpes-Maritimes) — taux 5,81% (hausse non appliquée).',
      department: region,
    };
  }

  // Tous autres départements : 6,32% sauf primo-accédant exempté
  if (isFirstTimeBuyer) {
    return {
      rate: DMTO_REDUCED_OLD,
      note: "Primo-accédant exempté de la hausse 5,81 → 6,32% (n'ayant pas été propriétaire de sa résidence principale durant les 2 dernières années). À confirmer notaire.",
      department: region ?? 'France',
    };
  }

  return {
    rate: DMTO_DEFAULT_OLD,
    note: 'Ancien — taux majoré 6,32% applicable depuis le 1er avril 2025 (83 départements concernés).',
    department: region ?? 'France',
  };
}

// Barème notaire simplifié (émoluments dégressifs) pour information.
function computeNotaryFees(price: number): number {
  // Barème simplifié approchant les émoluments tarifaires :
  //  - 4% sur les premiers 6 500
  //  - 1,635% de 6 500 à 17 000
  //  - 1,085% de 17 000 à 60 000
  //  - 0,825% au-delà
  // + TVA 20% + débours/formalités (~800 €) — on simplifie en flat ≈ 1% + 800 €.
  let fees = 0;
  let remaining = price;
  const bands: Array<{ cap: number; rate: number }> = [
    { cap: 6_500, rate: 0.04 },
    { cap: 17_000, rate: 0.01635 },
    { cap: 60_000, rate: 0.01085 },
    { cap: Infinity, rate: 0.00825 },
  ];
  let prevCap = 0;
  for (const { cap, rate } of bands) {
    const slice = Math.min(remaining, cap - prevCap);
    if (slice <= 0) break;
    fees += slice * rate;
    remaining -= slice;
    prevCap = cap;
    if (remaining <= 0) break;
  }
  // TVA 20% sur émoluments + débours forfaitaires
  fees = fees * 1.2 + 800;
  return fees;
}

export function computeFrance(input: AcquisitionInput): AcquisitionResult {
  const { price, propertyType, city, buyerProfile, usage } = input;
  const lineItems: AcquisitionLineItem[] = [];
  const warnings: string[] = [];

  const regionMatch = cityToRegion(city);
  const region =
    regionMatch && regionMatch.country === 'FR' ? regionMatch.region : null;

  if (!region) {
    warnings.push(
      `Département non identifié pour la ville "${city}". Taux par défaut 6,32% appliqué — confirmation impérative auprès d'un notaire local.`,
    );
  }

  // ── DMTO (Droits de mutation à titre onéreux)
  const dmto = computeDmtoRate(
    region,
    propertyType,
    buyerProfile.isFirstTimeBuyer,
  );
  const dmtoAmount = price * dmto.rate;

  lineItems.push({
    label:
      propertyType === 'new'
        ? 'Taxe de publicité foncière (0,715%) — neuf'
        : `Droits de mutation (${(dmto.rate * 100).toFixed(2).replace('.', ',')}%) — ${dmto.department}`,
    amount: Math.round(dmtoAmount),
    rate: dmto.rate,
    isPercentage: true,
    notes: dmto.note,
  });

  if (propertyType === 'new') {
    lineItems.push({
      label: 'TVA 20% (incluse dans le prix promoteur)',
      amount: 0,
      isPercentage: false,
      notes:
        "Pour le neuf, la TVA 20% est incluse dans le prix affiché par le promoteur. TVA réduite 5,5% possible en zone ANRU / accession sociale (À confirmer auprès d'un notaire local).",
    });
  }

  // ── Émoluments notaire (dégressifs)
  const notaryFees = computeNotaryFees(price);
  lineItems.push({
    label: 'Émoluments de notaire (barème dégressif + TVA + débours)',
    amount: Math.round(notaryFees),
    isPercentage: false,
    notes:
      'Barème national (décret tarifs notariés). Inclut TVA 20% sur émoluments + débours/formalités estimés 800 €.',
  });

  // ── Contribution sécurité immobilière (0,10%)
  const csi = price * 0.001;
  lineItems.push({
    label: 'Contribution de sécurité immobilière (0,10%)',
    amount: Math.round(csi),
    rate: 0.001,
    isPercentage: true,
  });

  // ── Warnings
  if (usage === 'investment') {
    warnings.push(
      "Investissement locatif : aucune aide primo-accédant ni PTZ applicable. La fiscalité revenus fonciers / LMNP est à étudier avec un conseiller fiscal indépendant.",
    );
  }
  if (!buyerProfile.isResident) {
    warnings.push(
      "Non-résident : financement plus contraint (LTV plafonné, taux majoré). Plus-values immobilières non-résident soumises à régime spécifique (prélèvement 19% + prélèvements sociaux 17,2%).",
    );
  }

  // ── Totaux
  const totalCost = lineItems.reduce((acc, li) => acc + li.amount, 0);
  const totalCostPercent = price > 0 ? (totalCost / price) * 100 : 0;

  return {
    countryCode: 'FR',
    countryName: 'France',
    region: region ?? undefined,
    totalCost: Math.round(totalCost),
    totalCostPercent: Math.round(totalCostPercent * 100) / 100,
    lineItems,
    warnings,
    sources: SOURCES,
    legalNotice: { ...DEFAULT_LEGAL_NOTICE },
  };
}
