// Logique d'estimation hédoniste simplifiée pour le MVP.
// Calibration grossière sur prix moyen Luxembourg-Ville 2024-2025.
// À raffiner ultérieurement avec données Observatoire de l'Habitat précises.

const BASE_PRICE_PER_SQM: Record<string, number> = {
  LU: 12000,
  FR: 7500,
  BE: 5500,
  DE: 6500,
  CH: 14000,
  MC: 50000,
  ES: 5000,
  PT: 4500,
  IT: 6000,
  AE: 8000,
};

const TYPE_FACTOR: Record<string, number> = {
  appartement: 1.0,
  maison: 0.85,
  penthouse: 1.35,
  duplex: 1.1,
  villa: 1.2,
  immeuble: 0.7,
  terrain: 0.3,
};

const STATE_FACTOR: Record<string, number> = {
  to_renovate: 0.7,
  good: 0.95,
  renovated: 1.05,
  new: 1.15,
};

// Coefficients CPE LU 10 niveaux (master prompt phase 3)
// A++/A+ +8%, A +5%, B +2%, C 0% (base), D -3%, E -7%, F -12%, G -17%, H -22%, I -28%
const ENERGY_FACTOR: Record<string, number> = {
  "A++": 1.08,
  "A+": 1.08,
  A: 1.05,
  B: 1.02,
  C: 1.0,
  D: 0.97,
  E: 0.93,
  F: 0.88,
  G: 0.83,
  H: 0.78,
  I: 0.72,
};

// Communes premium LU avec multiplicateur (au-dessus du prix LU base)
const LU_COMMUNE_MULTIPLIER: Record<string, number> = {
  Belair: 1.4,
  Limpertsberg: 1.35,
  Kirchberg: 1.3,
  Merl: 1.2,
  "Luxembourg-Ville": 1.45,
  Strassen: 1.15,
  Bertrange: 1.1,
  Walferdange: 1.05,
};

export interface EstimateInput {
  country: string; // LU/FR/etc
  commune?: string;
  type: string; // appartement/maison/...
  state: keyof typeof STATE_FACTOR;
  energy?: string;
  livingSurface: number; // m²
  landSurface?: number;
  terraceSurface?: number;
  bedrooms?: number;
  year?: number;
  // Acquisition profile
  buyersCount?: 1 | 2;
  primaryAgeMax?: number;
  isPrimoLu?: boolean;
  isPrimaryResidence?: boolean;
  monthlyIncome?: number; // net cumulés
  monthlyCharges?: number;
  downPayment?: number;
}

export interface EstimateResult {
  range: { low: number; mid: number; high: number };
  pricePerSqm: number;
  financing: {
    maxBorrowable: number;
    monthlyPaymentMax: number;
    suggestedDuration: number;
    rateUsed: number;
    notaryFees: number;
  } | null;
  helps: { key: string; amount?: number; conditions: string[] }[];
}

export const estimateProperty = (
  input: EstimateInput,
  rate: number,
): EstimateResult => {
  const base = BASE_PRICE_PER_SQM[input.country] ?? 6000;
  const typeFactor = TYPE_FACTOR[input.type] ?? 1.0;
  const stateFactor = STATE_FACTOR[input.state] ?? 1.0;
  const energyFactor = input.energy
    ? (ENERGY_FACTOR[input.energy] ?? 1.0)
    : 1.0;
  const communeMultiplier =
    input.country === "LU" && input.commune
      ? (LU_COMMUNE_MULTIPLIER[input.commune] ?? 1.0)
      : 1.0;

  const pricePerSqm =
    base * typeFactor * stateFactor * energyFactor * communeMultiplier;

  // BUG T4 : un terrain n'a pas de surface habitable — sa valeur =
  // surface du terrain × prix/m² (TYPE_FACTOR.terrain encode déjà la
  // décote foncier vs bâti, pas de coef ancillaire 0.15 ici).
  const isLand = input.type === "terrain";
  const baseValue = isLand
    ? pricePerSqm * (input.landSurface ?? 0)
    : pricePerSqm * input.livingSurface;
  const landValue =
    !isLand && input.landSurface && input.type !== "appartement"
      ? input.landSurface * pricePerSqm * 0.15
      : 0;
  const terraceValue = isLand
    ? 0
    : (input.terraceSurface ?? 0) * pricePerSqm * 0.4;

  const mid = Math.round(baseValue + landValue + terraceValue);
  const range = {
    low: Math.round(mid * 0.85),
    mid,
    high: Math.round(mid * 1.15),
  };

  // Financing
  let financing: EstimateResult["financing"] = null;
  if (
    input.monthlyIncome &&
    input.monthlyCharges !== undefined &&
    input.downPayment !== undefined
  ) {
    const dispo = Math.max(
      0,
      (input.monthlyIncome - input.monthlyCharges) * 0.35,
    );
    const age = input.primaryAgeMax ?? 40;
    let suggestedDuration = 25;
    if (age > 65) suggestedDuration = 20;
    else if (age > 55) suggestedDuration = 25;
    else if (age <= 35) suggestedDuration = 30;
    // Capital empruntable max
    const r = rate / 100 / 12;
    const n = suggestedDuration * 12;
    const maxBorrowable =
      r === 0 ? dispo * n : (dispo * (1 - Math.pow(1 + r, -n))) / r;
    const notaryFees = mid * 0.07;

    financing = {
      maxBorrowable: Math.round(maxBorrowable),
      monthlyPaymentMax: Math.round(dispo),
      suggestedDuration,
      rateUsed: rate,
      notaryFees: Math.round(notaryFees),
    };
  }

  // Helps applicables (LU)
  const helps: EstimateResult["helps"] = [];
  if (input.country === "LU") {
    if (input.isPrimaryResidence) {
      const buyers = input.buyersCount ?? 1;
      helps.push({
        key: "bellegen_akt",
        amount: 40000 * buyers,
        conditions: [
          "Résidence principale (occupation effective et personnelle)",
          "Aucune condition d'âge ni de primo-accession",
          `Crédit d'impôt 40 000 € par acquéreur (${buyers} personne${buyers > 1 ? "s" : ""})`,
        ],
      });
    }
    if (input.state === "new" && input.isPrimaryResidence) {
      helps.push({
        key: "vat_reduced",
        amount: 50000,
        conditions: [
          "Construction neuve",
          "Résidence principale",
          "TVA réduite 3% jusqu'à 50 000 € de crédit",
        ],
      });
    }
    if (
      input.isPrimoLu &&
      input.isPrimaryResidence &&
      input.monthlyIncome &&
      input.monthlyIncome < 6000
    ) {
      helps.push({
        key: "state_aid",
        conditions: [
          "Primo-acquéreur, revenus modestes",
          "Conditions précises sur logement.lu",
          "Aide étatique possible (à vérifier auprès du Fonds du Logement)",
        ],
      });
    }
    helps.push({
      key: "climate_loan",
      conditions: [
        "Prêt climatique pour rénovation énergétique (PrimeHouse)",
        "Conditions sur klima-agence.lu",
      ],
    });
  }

  return {
    range,
    pricePerSqm: Math.round(pricePerSqm),
    financing,
    helps,
  };
};

// ============================================================================
// Méthode rendement — Immeuble / Local commercial (phase 3 master prompt)
// ============================================================================

export interface YieldEstimateInput {
  monthlyRentExpected: number; // €
  capRate?: number; // 4.5% LU centre, 5.5% sud — par défaut 4.5%
}

export interface YieldEstimateResult {
  estimatedValue: number;
  capRateUsed: number;
  annualRent: number;
}

export const estimateByYield = (input: YieldEstimateInput): YieldEstimateResult => {
  const capRate = input.capRate ?? 0.045;
  const annual = input.monthlyRentExpected * 12;
  return {
    estimatedValue: Math.round(annual / capRate),
    capRateUsed: capRate,
    annualRent: annual,
  };
};

// Coûts annexes acquisition LU (phase 3)
export interface AcquisitionCostsInput {
  priceEur: number;
  bellegenAktBuyers?: number; // 0 si pas applicable
  mandateRate?: number; // 0.03 / 0.04 / 0.05 / 0.01 / 0
}

export interface AcquisitionCostsResult {
  registrationDuty: number; // 7% LU
  bellegenAktReduction: number;
  notaryFees: number; // ~1.75%
  mapaFees: number;
  vatOnFees: number; // 17% LU sur honoraires
  totalAdditional: number;
}

export const computeAcquisitionCosts = (input: AcquisitionCostsInput): AcquisitionCostsResult => {
  const registrationDuty = input.priceEur * 0.07;
  const bellegenAktReduction = (input.bellegenAktBuyers ?? 0) * 40000;
  const notaryFees = input.priceEur * 0.0175;
  const mapaFees = input.priceEur * (input.mandateRate ?? 0);
  const vatOnFees = mapaFees * 0.17;
  const totalAdditional =
    Math.max(0, registrationDuty - bellegenAktReduction) +
    notaryFees +
    mapaFees +
    vatOnFees;
  return {
    registrationDuty: Math.round(registrationDuty),
    bellegenAktReduction: Math.round(bellegenAktReduction),
    notaryFees: Math.round(notaryFees),
    mapaFees: Math.round(mapaFees),
    vatOnFees: Math.round(vatOnFees),
    totalAdditional: Math.round(totalAdditional),
  };
};
