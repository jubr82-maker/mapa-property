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
    label: 'Agencia Tributaria',
    url: 'https://sede.agenciatributaria.gob.es/',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'BOE (Boletín Oficial del Estado)',
    url: 'https://www.boe.es/',
    verifiedDate: '2026-05-12',
  },
];

// Vivienda nueva : IVA 10% + AJD 1% (moyenne)
const IVA_NEW_RATE = 0.10;
const AJD_AVG_RATE = 0.01;

// Frais notaire + registre combinés (~1%)
const NOTARY_REGISTRY_RATE = 0.01;

// ITP par CCAA (vivienda usada) — taux simples
const ITP_RATES: Record<string, number> = {
  'País Vasco': 0.04,
  'Navarra': 0.06,
  'Melilla': 0.06,
  'Canarias': 0.065,
  'Ceuta': 0.07,
  'La Rioja': 0.07,
  'Aragón': 0.08,
  'Asturias': 0.08,
  'Castilla y León': 0.08,
  'Extremadura': 0.08,
  'Galicia': 0.08,
  'Murcia': 0.08,
  'Castilla-La Mancha': 0.09,
  'Cantabria': 0.10,
  'Comunidad Valenciana': 0.10,
};

// Tranches progressives Cataluña (ITP 2024-2026)
const CATALUNA_TRANCHES: Array<{ cap: number; rate: number }> = [
  { cap: 600_000, rate: 0.10 },
  { cap: 900_000, rate: 0.11 },
  { cap: 1_500_000, rate: 0.12 },
  { cap: Infinity, rate: 0.13 },
];

// Tranches progressives Baleares
const BALEARES_TRANCHES: Array<{ cap: number; rate: number }> = [
  { cap: 400_000, rate: 0.08 },
  { cap: 600_000, rate: 0.09 },
  { cap: 1_000_000, rate: 0.10 },
  { cap: 2_000_000, rate: 0.12 },
  { cap: Infinity, rate: 0.13 },
];

function computeProgressiveItp(
  price: number,
  tranches: Array<{ cap: number; rate: number }>,
): { tax: number; effectiveRate: number; breakdown: string } {
  let tax = 0;
  let remaining = price;
  let prevCap = 0;
  const parts: string[] = [];
  for (const { cap, rate } of tranches) {
    const slice = Math.min(remaining, cap - prevCap);
    if (slice <= 0) break;
    const sliceTax = slice * rate;
    tax += sliceTax;
    parts.push(`${(rate * 100).toFixed(0)}% sur ${Math.round(slice).toLocaleString('fr-FR')} €`);
    remaining -= slice;
    prevCap = cap;
    if (remaining <= 0) break;
  }
  const effectiveRate = price > 0 ? tax / price : 0;
  return { tax, effectiveRate, breakdown: parts.join(' + ') };
}

function resolveCcaaItpRate(
  ccaa: string | null,
  price: number,
  usage: 'primary' | 'secondary' | 'investment',
):
  | { type: 'flat'; rate: number; note: string }
  | { type: 'progressive'; tax: number; effectiveRate: number; breakdown: string; note: string } {
  // Cataluña — progressive
  if (ccaa === 'Cataluña') {
    const { tax, effectiveRate, breakdown } = computeProgressiveItp(price, CATALUNA_TRANCHES);
    return {
      type: 'progressive',
      tax,
      effectiveRate,
      breakdown,
      note: `Cataluña — ITP progressif par tranches (${breakdown}).`,
    };
  }

  // Baleares — progressive
  if (ccaa === 'Baleares') {
    const { tax, effectiveRate, breakdown } = computeProgressiveItp(price, BALEARES_TRANCHES);
    return {
      type: 'progressive',
      tax,
      effectiveRate,
      breakdown,
      note: `Illes Balears — ITP progressif par tranches (${breakdown}).`,
    };
  }

  // Madrid — 6% standard, 7% RP ≤ 200K€ (depuis 8 avril 2025)
  if (ccaa === 'Madrid') {
    if (usage === 'primary' && price <= 200_000) {
      return {
        type: 'flat',
        rate: 0.07,
        note: 'Madrid — ITP 7% pour résidence principale ≤ 200 000 € (régime depuis 8 avril 2025).',
      };
    }
    return {
      type: 'flat',
      rate: 0.06,
      note: 'Madrid — ITP standard 6%.',
    };
  }

  // Andalucía — 7% standard, 6% RP ≤ 150K€
  if (ccaa === 'Andalucía') {
    if (usage === 'primary' && price <= 150_000) {
      return {
        type: 'flat',
        rate: 0.06,
        note: 'Andalucía — ITP réduit 6% pour résidence principale ≤ 150 000 €.',
      };
    }
    return {
      type: 'flat',
      rate: 0.07,
      note: 'Andalucía — ITP standard 7%.',
    };
  }

  // Autres CCAA dans la table
  if (ccaa && ITP_RATES[ccaa] !== undefined) {
    return {
      type: 'flat',
      rate: ITP_RATES[ccaa],
      note: `${ccaa} — ITP ${(ITP_RATES[ccaa] * 100).toFixed(1).replace('.', ',')}%.`,
    };
  }

  // Fallback moyenne nationale
  return {
    type: 'flat',
    rate: 0.07,
    note: 'Moyenne nationale 7% appliquée (CCAA non identifiée).',
  };
}

export function computeSpain(input: AcquisitionInput): AcquisitionResult {
  const { price, city, propertyType, usage, buyerProfile } = input;
  const lineItems: AcquisitionLineItem[] = [];
  const warnings: string[] = [];

  const regionMatch = cityToRegion(city);
  const ccaa =
    regionMatch && regionMatch.country === 'ES' ? regionMatch.region : null;

  if (!ccaa) {
    warnings.push(
      `Communauté Autonome non identifiée pour la ville "${city}" — moyenne nationale appliquée (7%). Confirmation impérative auprès d'un notaire local.`,
    );
  }

  if (propertyType === 'new') {
    // ── Vivienda nueva : IVA 10% + AJD 1% (moyenne CCAA, varie 0,5-1,5%)
    const iva = price * IVA_NEW_RATE;
    lineItems.push({
      label: 'IVA Vivienda nueva (10%)',
      amount: Math.round(iva),
      rate: IVA_NEW_RATE,
      isPercentage: true,
      notes:
        "Taux 10% IVA pour vivienda nueva (premier transfert). VPO (logement protégé) non détecté automatiquement — taux réduit 4% possible. Canarias : IGIC 6,5% au lieu d'IVA.",
    });

    const ajd = price * AJD_AVG_RATE;
    lineItems.push({
      label: 'AJD — Actos Jurídicos Documentados (1% moyenne)',
      amount: Math.round(ajd),
      rate: AJD_AVG_RATE,
      isPercentage: true,
      notes: `AJD varie 0,5% à 1,5% selon Communauté Autonome. Moyenne nationale 1% appliquée${ccaa ? ` (${ccaa})` : ''}.`,
    });
  } else {
    // ── Vivienda usada : ITP par CCAA (exclusif avec IVA)
    const itp = resolveCcaaItpRate(ccaa, price, usage);

    if (itp.type === 'progressive') {
      lineItems.push({
        label: `ITP ${ccaa} (progressif ≈ ${(itp.effectiveRate * 100).toFixed(2).replace('.', ',')}%)`,
        amount: Math.round(itp.tax),
        rate: itp.effectiveRate,
        isPercentage: true,
        notes: itp.note,
      });
    } else {
      lineItems.push({
        label: `ITP ${ccaa ?? 'moyenne nationale'} (${(itp.rate * 100).toFixed(1).replace('.', ',')}%)`,
        amount: Math.round(price * itp.rate),
        rate: itp.rate,
        isPercentage: true,
        notes: itp.note,
      });
    }
  }

  // ── Frais notaire + registre (~1% combiné)
  const notaryRegistry = price * NOTARY_REGISTRY_RATE;
  lineItems.push({
    label: 'Frais notaire + registre + gestoría (~1%)',
    amount: Math.round(notaryRegistry),
    rate: NOTARY_REGISTRY_RATE,
    isPercentage: true,
    notes:
      'Notaire 0,5-0,8% (barème national) + registre 0,1-0,3% + gestoría ~400 €. Estimation combinée 1%.',
  });

  // ── Warnings non-résident
  if (!buyerProfile.isResident) {
    if (buyerProfile.isEUCitizen) {
      warnings.push(
        'Non-résident UE : apport recommandé 30-40% (LTV 60-70%). Les banques espagnoles appliquent des conditions différenciées selon résidence fiscale.',
      );
    } else {
      warnings.push(
        'Non-résident hors UE : apport recommandé 40-50% (LTV 50-60%). NIE obligatoire avant signature, conditions bancaires plus strictes.',
      );
    }
  }

  const totalCost = lineItems.reduce((acc, li) => acc + li.amount, 0);
  const totalCostPercent = price > 0 ? (totalCost / price) * 100 : 0;

  return {
    countryCode: 'ES',
    countryName: 'Espagne',
    region: ccaa ?? undefined,
    totalCost: Math.round(totalCost),
    totalCostPercent: Math.round(totalCostPercent * 100) / 100,
    lineItems,
    warnings,
    sources: SOURCES,
    legalNotice: { ...DEFAULT_LEGAL_NOTICE },
  };
}
