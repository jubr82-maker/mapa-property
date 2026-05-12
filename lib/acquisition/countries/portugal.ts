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
    label: 'Autoridade Tributária — Portal das Finanças',
    url: 'https://www.portaldasfinancas.gov.pt/',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'Banco de Portugal',
    url: 'https://www.bportugal.pt/',
    verifiedDate: '2026-05-12',
  },
];

// Tranches IMT 2026 Continente — Habitação Própria e Permanente (résidence principale)
// Marginales jusqu'à 660 982 €. Au-delà : taxa única sur le TOTAL.
const IMT_PRIMARY_CONTINENTE: Array<{ cap: number; rate: number }> = [
  { cap: 106_346, rate: 0.00 },
  { cap: 145_471, rate: 0.02 },
  { cap: 198_347, rate: 0.05 },
  { cap: 330_539, rate: 0.07 },
  { cap: 660_982, rate: 0.08 },
];

// Continente — résidence secondaire / autre habitation
// Identique mais 1ère tranche à 1% (pas 0%)
const IMT_SECONDARY_CONTINENTE: Array<{ cap: number; rate: number }> = [
  { cap: 106_346, rate: 0.01 },
  { cap: 145_471, rate: 0.02 },
  { cap: 198_347, rate: 0.05 },
  { cap: 330_539, rate: 0.07 },
  { cap: 660_982, rate: 0.08 },
];

// Seuils taxa única (au-delà du barème marginal)
const IMT_TAXA_UNICA_MID_CAP = 1_150_853; // jusqu'à ce seuil : 6%
const IMT_TAXA_UNICA_MID_RATE = 0.06;
const IMT_TAXA_UNICA_HIGH_RATE = 0.075; // au-delà : 7,5%
const IMT_MARGINAL_LIMIT = 660_982; // au-delà : taxa única sur le total

// IMT Jovem (≤ 35 ans, primo-accédant, RP) — Continente
const IMT_JOVEM_FULL_EXEMPTION_CAP = 330_539;
const IMT_JOVEM_PARTIAL_CAP = 660_982;
const IMT_JOVEM_PARTIAL_RATE = 0.08; // 8% sur différence price - 330 539

// Régions Autonomes : seuils ×1,25 (Madeira / Açores)
const REGION_AUTONOMOUS_MULTIPLIER = 1.25;

// Imposto do Selo (0,8% sur prix)
const IMPOSTO_DO_SELO_RATE = 0.008;

// Frais notaire + registre (~1-1,5% → 1,25% flat)
const NOTARY_REGISTRY_RATE = 0.0125;

/**
 * Calcule l'IMT progressif (marginal jusqu'à IMT_MARGINAL_LIMIT, puis taxa única sur le TOTAL).
 */
function computeIMTProgressive(
  price: number,
  tranches: Array<{ cap: number; rate: number }>,
  marginalLimit: number,
  taxaUnicaMidCap: number,
  taxaUnicaMidRate: number,
  taxaUnicaHighRate: number,
): { tax: number; mode: 'progressive' | 'taxa_unica_mid' | 'taxa_unica_high' } {
  if (price > taxaUnicaMidCap) {
    return { tax: price * taxaUnicaHighRate, mode: 'taxa_unica_high' };
  }
  if (price > marginalLimit) {
    return { tax: price * taxaUnicaMidRate, mode: 'taxa_unica_mid' };
  }

  // Progressif marginal
  let tax = 0;
  let prevCap = 0;
  let remaining = price;
  for (const { cap, rate } of tranches) {
    const slice = Math.min(remaining, cap - prevCap);
    if (slice <= 0) break;
    tax += slice * rate;
    remaining -= slice;
    prevCap = cap;
    if (remaining <= 0) break;
  }
  return { tax, mode: 'progressive' };
}

/**
 * Adapte les tranches d'IMT aux régions autonomes (×1.25 sur les seuils).
 */
function scaleTranches(
  tranches: Array<{ cap: number; rate: number }>,
  multiplier: number,
): Array<{ cap: number; rate: number }> {
  return tranches.map((t) => ({ cap: t.cap * multiplier, rate: t.rate }));
}

export function computePortugal(input: AcquisitionInput): AcquisitionResult {
  const { price, city, usage, buyerProfile } = input;
  const lineItems: AcquisitionLineItem[] = [];
  const warnings: string[] = [];

  // ── Région
  const regionMatch = cityToRegion(city);
  let region: 'Continente' | 'Madeira' | 'Açores' = 'Continente';
  if (regionMatch && regionMatch.country === 'PT') {
    if (regionMatch.region === 'Madeira') region = 'Madeira';
    else if (regionMatch.region === 'Açores') region = 'Açores';
    else region = 'Continente';
  } else {
    warnings.push(
      `Région portugaise non identifiée pour la ville "${city}". Hypothèse Continente appliquée. Confirmation impérative auprès d'un notaire local.`,
    );
  }

  const isPrimary = usage === 'primary';
  const isAutonomous = region !== 'Continente';
  const multiplier = isAutonomous ? REGION_AUTONOMOUS_MULTIPLIER : 1;

  // ── Sélection du barème + scaling régions autonomes
  const baseTranches = isPrimary
    ? IMT_PRIMARY_CONTINENTE
    : IMT_SECONDARY_CONTINENTE;
  const tranches = scaleTranches(baseTranches, multiplier);
  const marginalLimit = IMT_MARGINAL_LIMIT * multiplier;
  const taxaUnicaMidCap = IMT_TAXA_UNICA_MID_CAP * multiplier;

  // ── IMT Jovem (éligibilité)
  const isImtJovemEligible =
    isPrimary &&
    buyerProfile.age !== undefined &&
    buyerProfile.age <= 35 &&
    buyerProfile.isFirstTimeBuyer;

  // Seuils Jovem adaptés région autonome
  const jovemFullExemptionCap = IMT_JOVEM_FULL_EXEMPTION_CAP * multiplier;
  const jovemPartialCap = IMT_JOVEM_PARTIAL_CAP * multiplier;

  let imtTax = 0;
  let imtNote = '';
  let imtRate = 0;
  let imtosomptosBaseExonere = false; // pour Imposto do Selo (exonéré si Jovem en isenção totale)

  if (isImtJovemEligible) {
    if (price <= jovemFullExemptionCap) {
      // Isenção totale IMT
      imtTax = 0;
      imtNote = `IMT Jovem — Isenção totale (acheteur ≤ 35 ans, primo-accédant, RP, prix ≤ ${Math.round(jovemFullExemptionCap).toLocaleString('fr-FR')} €${isAutonomous ? ` — seuils ×1,25 ${region}` : ''}).`;
      imtRate = 0;
      imtosomptosBaseExonere = true;
    } else if (price <= jovemPartialCap) {
      // Isenção partielle : 8% sur (price - jovemFullExemptionCap)
      imtTax = (price - jovemFullExemptionCap) * IMT_JOVEM_PARTIAL_RATE;
      imtNote = `IMT Jovem — Isenção partielle : 8% appliqué uniquement sur la différence (${(price - jovemFullExemptionCap).toLocaleString('fr-FR')} €) au-delà de ${Math.round(jovemFullExemptionCap).toLocaleString('fr-FR')} €.`;
      imtRate = price > 0 ? imtTax / price : 0;
    } else {
      // > jovemPartialCap → IMT Jovem ne s'applique pas, barème standard
      const { tax, mode } = computeIMTProgressive(
        price,
        tranches,
        marginalLimit,
        taxaUnicaMidCap,
        IMT_TAXA_UNICA_MID_RATE,
        IMT_TAXA_UNICA_HIGH_RATE,
      );
      imtTax = tax;
      imtRate = price > 0 ? tax / price : 0;
      imtNote = `IMT Jovem inapplicable (prix > ${Math.round(jovemPartialCap).toLocaleString('fr-FR')} €). Barème standard${mode === 'taxa_unica_mid' ? ' — taxa única 6% sur le TOTAL' : mode === 'taxa_unica_high' ? ' — taxa única 7,5% sur le TOTAL' : ' progressif marginal'}.`;
      warnings.push(
        `IMT Jovem inapplicable : prix > ${Math.round(jovemPartialCap).toLocaleString('fr-FR')} € (plafond Jovem). Barème standard appliqué.`,
      );
    }
  } else {
    // Barème standard
    const { tax, mode } = computeIMTProgressive(
      price,
      tranches,
      marginalLimit,
      taxaUnicaMidCap,
      IMT_TAXA_UNICA_MID_RATE,
      IMT_TAXA_UNICA_HIGH_RATE,
    );
    imtTax = tax;
    imtRate = price > 0 ? tax / price : 0;
    if (mode === 'taxa_unica_high') {
      imtNote = `IMT taxa única 7,5% sur le TOTAL (prix > ${Math.round(taxaUnicaMidCap).toLocaleString('fr-FR')} €)${isAutonomous ? ` — seuils ×1,25 ${region}` : ''}.`;
    } else if (mode === 'taxa_unica_mid') {
      imtNote = `IMT taxa única 6% sur le TOTAL (prix > ${Math.round(marginalLimit).toLocaleString('fr-FR')} €)${isAutonomous ? ` — seuils ×1,25 ${region}` : ''}.`;
    } else {
      imtNote = `IMT progressif marginal — ${isPrimary ? 'Habitação Própria e Permanente' : 'Habitação Secundária'} ${region}${isAutonomous ? ' (seuils ×1,25)' : ''}.`;
    }
  }

  lineItems.push({
    label: `IMT — Imposto Municipal sobre as Transmissões (≈ ${(imtRate * 100).toFixed(2).replace('.', ',')}%)`,
    amount: Math.round(imtTax),
    rate: imtRate,
    isPercentage: true,
    notes: imtNote,
  });

  // ── Imposto do Selo (0,8%)
  if (isImtJovemEligible && imtosomptosBaseExonere) {
    lineItems.push({
      label: 'Imposto do Selo — Exonération IMT Jovem',
      amount: 0,
      isPercentage: false,
      notes: 'Exonération totale de l\'Imposto do Selo dans le cadre de l\'isenção IMT Jovem.',
    });
  } else {
    const selo = price * IMPOSTO_DO_SELO_RATE;
    lineItems.push({
      label: 'Imposto do Selo (0,8%)',
      amount: Math.round(selo),
      rate: IMPOSTO_DO_SELO_RATE,
      isPercentage: true,
      notes: 'Droit de timbre 0,8% applicable systématiquement (hors exonération IMT Jovem).',
    });
  }

  // ── Frais notaire + registre (1,25%)
  const notaryRegistry = price * NOTARY_REGISTRY_RATE;
  lineItems.push({
    label: 'Frais notaire + registre prédial (~1,25%)',
    amount: Math.round(notaryRegistry),
    rate: NOTARY_REGISTRY_RATE,
    isPercentage: true,
    notes: 'Fourchette indicative 1 à 1,5%. Inclut acte notarié + registo predial + débours.',
  });

  // ── Warning non-résident
  if (!buyerProfile.isResident) {
    warnings.push(
      'Apport non-résident 30-40% (LTV 60-70%). Surveillance : projet 2026 de surtaxe IMT pour acheteurs non-résidents en discussion au Parlement portugais.',
    );
  }

  const totalCost = lineItems.reduce((acc, li) => acc + li.amount, 0);
  const totalCostPercent = price > 0 ? (totalCost / price) * 100 : 0;

  return {
    countryCode: 'PT',
    countryName: 'Portugal',
    region,
    totalCost: Math.round(totalCost),
    totalCostPercent: Math.round(totalCostPercent * 100) / 100,
    lineItems,
    warnings,
    sources: SOURCES,
    legalNotice: { ...DEFAULT_LEGAL_NOTICE },
  };
}
