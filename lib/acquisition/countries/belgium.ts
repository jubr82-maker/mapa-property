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
    label: 'SPF Finances',
    url: 'https://finances.belgium.be/',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'Fiscalité Bruxelles',
    url: 'https://fiscalite.brussels/',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'Vlaamse Belastingdienst',
    url: 'https://www.vlaanderen.be/',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'Service Public de Wallonie',
    url: 'https://www.wallonie.be/',
    verifiedDate: '2026-05-12',
  },
  {
    label: 'Notaire.be',
    url: 'https://www.notaire.be/',
    verifiedDate: '2026-05-12',
  },
];

const NOTARY_RATE = 0.0125; // ~1-1,5% : moyenne 1,25%
const ADMIN_RATE = 0.01; // ~1% admin / frais hypothécaires / registre
const VAT_NEW_RATE = 0.21; // TVA 21% logement neuf

export function computeBelgium(input: AcquisitionInput): AcquisitionResult {
  const { price, city, propertyType, usage, buyerProfile } = input;
  const lineItems: AcquisitionLineItem[] = [];
  const warnings: string[] = [];

  const regionMatch = cityToRegion(city);
  const region =
    regionMatch && regionMatch.country === 'BE' ? regionMatch.region : null;

  if (!region) {
    warnings.push(
      `Région belge non identifiée pour la ville "${city}". Hypothèse Bruxelles-Capitale 12,5%. Confirmation impérative auprès d'un notaire local.`,
    );
  }
  const effectiveRegion = region ?? 'Bruxelles-Capitale';

  // ── VEFA / bien <2 ans : TVA 21% au lieu de droits
  if (propertyType === 'new') {
    const vat = price * VAT_NEW_RATE;
    lineItems.push({
      label: 'TVA 21% (logement neuf / VEFA)',
      amount: Math.round(vat),
      rate: VAT_NEW_RATE,
      isPercentage: true,
      notes:
        "Logement neuf ou < 2 ans : TVA 21% s'applique en lieu et place des droits d'enregistrement (sauf option terrain). À confirmer notaire.",
    });
  } else {
    // ── Droits d'enregistrement selon région
    if (effectiveRegion === 'Wallonie') {
      const isPrimaryAndUnique =
        usage === 'primary' && buyerProfile.isFirstTimeBuyer;
      const rate = isPrimaryAndUnique ? 0.03 : 0.125;
      lineItems.push({
        label: `Droits d'enregistrement Wallonie (${(rate * 100).toFixed(1)}%)`,
        amount: Math.round(price * rate),
        rate,
        isPercentage: true,
        notes: isPrimaryAndUnique
          ? 'Taux 3% RP propre et unique (depuis 1er janvier 2025). Engagement de résidence dans les 3 ans.'
          : 'Taux standard 12,5% (résidence secondaire / investissement / non primo).',
      });
    } else if (effectiveRegion === 'Flandre') {
      const isPrimaryAndUnique =
        usage === 'primary' && buyerProfile.isFirstTimeBuyer;
      const rate = isPrimaryAndUnique ? 0.02 : 0.12;
      const baseTax = price * rate;

      // Réduction 1867 € si éligible et prix <= 240 000 € (villes-centres) / 220 000 € hors centre.
      // Simplification : on applique si prix <= 240 000 €.
      let reduction = 0;
      if (isPrimaryAndUnique && price <= 240_000) {
        reduction = 1867;
      }

      lineItems.push({
        label: `Registratiebelasting Flandre (${(rate * 100).toFixed(0)}%)`,
        amount: Math.round(baseTax),
        rate,
        isPercentage: true,
        notes: isPrimaryAndUnique
          ? 'Taux 2% RP propre et unique (depuis 1er janvier 2025). Engagement domicile dans les 3 ans.'
          : 'Taux standard 12% (résidence secondaire / investissement / non primo).',
      });

      if (reduction > 0) {
        lineItems.push({
          label: 'Réduction droits (1 867 €) — RP unique ≤ 240 000 €',
          amount: -reduction,
          isPercentage: false,
          notes:
            'Plafond bien ≤ 220 000 € (240 000 € en villes-centres Anvers/Gand/etc.). À confirmer notaire selon localisation exacte.',
        });
      }
    } else {
      // Bruxelles-Capitale : 12,5% + abattement 200 000 € si RP, plafond 600 000 €.
      const baseTax = price * 0.125;
      lineItems.push({
        label: "Droits d'enregistrement Bruxelles (12,5%)",
        amount: Math.round(baseTax),
        rate: 0.125,
        isPercentage: true,
        notes: 'Taux unique 12,5% Région de Bruxelles-Capitale.',
      });

      if (usage === 'primary' && price <= 600_000) {
        // Abattement sur les premiers 200 000 € → économie 25 000 € (200 000 × 12,5%).
        const abatement = Math.min(200_000, price) * 0.125;
        lineItems.push({
          label: 'Abattement RP Bruxelles (200 000 € premiers)',
          amount: -Math.round(abatement),
          isPercentage: false,
          notes:
            "Abattement de 200 000 € sur l'assiette si résidence principale et prix ≤ 600 000 € (perte totale si prix > 600 000 €). Engagement de résidence 5 ans.",
        });
      } else if (usage === 'primary' && price > 600_000) {
        warnings.push(
          'Bruxelles : prix > 600 000 € — perte totale de l\'abattement RP de 200 000 €. À confirmer notaire.',
        );
      }
    }
  }

  // ── Honoraires notaire (~1,25%)
  const notaryFees = price * NOTARY_RATE;
  lineItems.push({
    label: 'Honoraires de notaire (~1,25%)',
    amount: Math.round(notaryFees),
    rate: NOTARY_RATE,
    isPercentage: true,
    notes: 'Barème tarifé national. Fourchette indicative 1 à 1,5% selon montant.',
  });

  // ── Frais administratifs / registre / hypothèque (~1%)
  const adminFees = price * ADMIN_RATE;
  lineItems.push({
    label: 'Frais administratifs et hypothécaires (~1%)',
    amount: Math.round(adminFees),
    rate: ADMIN_RATE,
    isPercentage: true,
    notes: 'Inclut frais hypothécaires, registre, recherches, TVA sur honoraires.',
  });

  if (!buyerProfile.isResident) {
    warnings.push(
      'Non-résident en Belgique : conditions de financement plus strictes (LTV plafonné, garanties supplémentaires possibles).',
    );
  }

  const totalCost = lineItems.reduce((acc, li) => acc + li.amount, 0);
  const totalCostPercent = price > 0 ? (totalCost / price) * 100 : 0;

  return {
    countryCode: 'BE',
    countryName: 'Belgique',
    region: effectiveRegion,
    totalCost: Math.round(totalCost),
    totalCostPercent: Math.round(totalCostPercent * 100) / 100,
    lineItems,
    warnings,
    sources: SOURCES,
    legalNotice: { ...DEFAULT_LEGAL_NOTICE },
  };
}
