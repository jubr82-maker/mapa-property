import type {
  AcquisitionInput,
  AcquisitionLineItem,
  AcquisitionResult,
  AcquisitionSource,
} from '../types';
import { DEFAULT_LEGAL_NOTICE } from '../legal-notice';

const SOURCES: AcquisitionSource[] = [
  {
    label: 'Portail Logement Luxembourg',
    url: 'https://logement.public.lu/',
    verifiedDate: '2026-05-12',
  },
  {
    label: "Guichet Public — Bëllegen Akt",
    url: 'https://guichet.public.lu/fr/citoyens/logement/achat-vente-location/achat-bien-immobilier.html',
    verifiedDate: '2026-05-12',
  },
  {
    label: "Administration de l'Enregistrement et des Domaines (AED)",
    url: 'https://pfi.public.lu/',
    verifiedDate: '2026-05-12',
  },
];

const MIN_REGISTRATION_FEE = 100;
const REGISTRATION_RATE = 0.06; // 6%
const TRANSCRIPTION_RATE = 0.01; // 1%
const VAT_NEW_PRIMARY_RATE = 0.03; // TVA super-réduite logement RP neuf
const VAT_NEW_PRIMARY_CAP = 50_000; // plafond crédit TVA
const NOTARY_AVG_RATE = 0.01; // 0,8% à 1,2% — moyenne 1%
const BELLEGEN_AKT_PER_BUYER = 40_000; // crédit d'impôt droits

export function computeLuxembourg(input: AcquisitionInput): AcquisitionResult {
  const { price, propertyType, usage, buyerProfile } = input;
  const isPrimary = usage === 'primary';
  const lineItems: AcquisitionLineItem[] = [];
  const warnings: string[] = [];

  // ── Droits enregistrement (6%) + transcription (1%) = 7%
  // ── Pour le neuf RP : TVA 3% jusqu'à plafond 50K€ remplace les droits sur la part construction.
  //    Simplification : on applique 7% sur tout, puis on mentionne TVA 3% en note pour neuf RP.
  const registrationTax = Math.max(
    price * REGISTRATION_RATE,
    MIN_REGISTRATION_FEE,
  );
  const transcriptionTax = price * TRANSCRIPTION_RATE;

  if (propertyType === 'new' && isPrimary) {
    // TVA super-réduite 3% sur logement neuf RP (plafond crédit TVA 50 000 €)
    lineItems.push({
      label: 'TVA logement neuf RP (3% super-réduite)',
      amount: 0,
      rate: VAT_NEW_PRIMARY_RATE,
      isPercentage: true,
      notes: `Taux 3% appliqué par le promoteur. Crédit d'impôt TVA plafonné à ${VAT_NEW_PRIMARY_CAP.toLocaleString('fr-FR')} € par logement. À confirmer avec le promoteur et le notaire.`,
    });
  }

  lineItems.push({
    label: "Droits d'enregistrement (6%)",
    amount: Math.round(registrationTax),
    rate: REGISTRATION_RATE,
    isPercentage: true,
    notes: `Minimum légal ${MIN_REGISTRATION_FEE} €. Mesure temporaire 3,5% (Bëllegen Akt majoré) terminée le 30 juin 2025.`,
  });
  lineItems.push({
    label: 'Droit de transcription (1%)',
    amount: Math.round(transcriptionTax),
    rate: TRANSCRIPTION_RATE,
    isPercentage: true,
  });

  // ── Bëllegen Akt (40 000 € / acquéreur, SANS condition primo/âge depuis loi 3 juillet 2025)
  //    Multiplicateur 2 si famille / couple.
  let bellegenAkt = 0;
  if (isPrimary) {
    const multiplier = buyerProfile.isFamily ? 2 : 1;
    bellegenAkt = BELLEGEN_AKT_PER_BUYER * multiplier;
    // Le crédit ne peut excéder les droits dus.
    const dueDuties = registrationTax + transcriptionTax;
    bellegenAkt = Math.min(bellegenAkt, dueDuties);

    lineItems.push({
      label: `Bëllegen Akt (crédit d'impôt droits — ${multiplier === 2 ? 'couple/famille' : 'acquéreur seul'})`,
      amount: -Math.round(bellegenAkt),
      isPercentage: false,
      notes: `Crédit ${BELLEGEN_AKT_PER_BUYER.toLocaleString('fr-FR')} €/acquéreur (loi du 3 juillet 2025, sans condition primo-accédant ni d'âge). Résidence principale uniquement. Crédit plafonné aux droits dus.`,
    });
  }

  // ── Frais notaire (0,8% à 1,2%, moyenne 1%)
  const notaryFees = price * NOTARY_AVG_RATE;
  lineItems.push({
    label: 'Frais de notaire (≈ 1%)',
    amount: Math.round(notaryFees),
    rate: NOTARY_AVG_RATE,
    isPercentage: true,
    notes: 'Barème dégressif 0,8% à 1,2% selon montant — moyenne indicative 1%. À confirmer auprès du notaire.',
  });

  // ── Warning si non résident
  if (!buyerProfile.isResident) {
    warnings.push(
      "Non-résident : conditions de financement plus strictes au Luxembourg (LTV plafonné, taux majoré). Bëllegen Akt accessible uniquement si la résidence principale est établie au Luxembourg.",
    );
  }

  // ── Totaux
  const totalCost = lineItems.reduce((acc, li) => acc + li.amount, 0);
  const totalCostPercent = price > 0 ? (totalCost / price) * 100 : 0;

  return {
    countryCode: 'LU',
    countryName: 'Luxembourg',
    region: 'Luxembourg',
    totalCost: Math.round(totalCost),
    totalCostPercent: Math.round(totalCostPercent * 100) / 100,
    lineItems,
    warnings,
    sources: SOURCES,
    legalNotice: { ...DEFAULT_LEGAL_NOTICE },
  };
}
