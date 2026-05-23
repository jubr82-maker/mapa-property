// Simulateur de financement immobilier — utilitaires pure JS,
// utilisables côté client et serveur. Pas de dépendance externe.

export interface MortgageParams {
  price: number;
  downPayment: number;
  rateAnnual: number;
  durationYears: number;
}

export interface MortgageResult {
  borrowedAmount: number;
  monthlyRate: number;
  monthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  schedule: AmortizationLine[];
}

export interface AmortizationLine {
  month: number;
  principal: number;
  interest: number;
  remaining: number;
}

export function computeMortgage(p: MortgageParams): MortgageResult {
  const borrowedAmount = Math.max(0, p.price - p.downPayment);
  const months = p.durationYears * 12;
  const r = p.rateAnnual / 100 / 12;
  if (borrowedAmount === 0 || months === 0 || r === 0) {
    const monthly = borrowedAmount / Math.max(months, 1);
    return {
      borrowedAmount,
      monthlyRate: r,
      monthlyPayment: monthly,
      totalInterest: 0,
      totalPaid: borrowedAmount,
      schedule: [],
    };
  }
  const monthlyPayment = (borrowedAmount * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);

  // On limite l'amortissement à 60 lignes pour l'affichage (1ère et dernière années).
  const schedule: AmortizationLine[] = [];
  let remaining = borrowedAmount;
  for (let m = 1; m <= months; m++) {
    const interest = remaining * r;
    const principal = monthlyPayment - interest;
    remaining = Math.max(0, remaining - principal);
    if (m <= 12 || m > months - 12 || m % 12 === 0) {
      schedule.push({ month: m, principal, interest, remaining });
    }
  }

  const totalPaid = monthlyPayment * months;
  return {
    borrowedAmount,
    monthlyRate: r,
    monthlyPayment,
    totalInterest: totalPaid - borrowedAmount,
    totalPaid,
    schedule,
  };
}

export function computeDebtRatio(monthlyPayment: number, monthlyIncome: number): number {
  if (monthlyIncome <= 0) return 0;
  return (monthlyPayment / monthlyIncome) * 100;
}

export function fmtEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(Math.round(n)) + " €";
}

// Taux indicatifs par pays (mise à jour manuelle ou via le cron
// refresh-rates documenté en blocker — dev pragmatique 2026-05).
// LU mai 2026 : 3,82% = interpolation 25 ans entre les taux fixes
// courtiers 10 ans (3,69%) et 30 ans (3,90%). Source BCL janvier 2026
// + grille courtiers Luxembourg.
export const DEFAULT_RATES_BY_COUNTRY: Record<string, number> = {
  LU: 3.82,
  FR: 3.65,
  BE: 3.45,
  DE: 3.95,
  PT: 3.6,
  AE: 4.5,
};

// Forme minimale acceptée par getRateForDuration — compatible avec
// InterestRates (lib/types.ts) sans creer de dependance circulaire.
type RatesShape = {
  rates?: {
    fixed_5?: number;
    fixed_10?: number;
    fixed_15?: number;
    fixed_20?: number;
    fixed_25?: number;
    fixed_30?: number;
    variable?: number;
  } | null;
} | null;

// Paliers fixes Supabase (lus depuis la table interest_rates). Fallbacks
// alignes sur la grille courtiers Luxembourg mai 2026 — utilises si la
// DB est vide pour ce palier.
const FIXED_PALIERS: ReadonlyArray<{ years: number; key: keyof NonNullable<NonNullable<RatesShape>["rates"]>; fallback: number }> = [
  { years: 5,  key: "fixed_5",  fallback: 3.40 },
  { years: 10, key: "fixed_10", fallback: 3.69 },
  { years: 15, key: "fixed_15", fallback: 3.76 },
  { years: 20, key: "fixed_20", fallback: 3.79 },
  { years: 25, key: "fixed_25", fallback: 3.82 },
  { years: 30, key: "fixed_30", fallback: 3.90 },
];

const VARIABLE_FALLBACK = 2.85;

/**
 * Retourne le taux annuel a appliquer pour une duree donnee.
 *
 * - type='variable' : lit `rates.variable`, fallback 2.85%.
 * - type='fixed' : si la duree correspond a un palier (5/10/15/20/25/30),
 *   retourne la valeur exacte ; sinon interpole lineairement entre les
 *   deux paliers encadrants. Bornes : 3.40% (<=5 ans) / 3.90% (>=30 ans).
 *
 * Toutes les valeurs sont arrondies a 2 decimales. Aucun throw : si la DB
 * est partiellement vide, les fallbacks codes prennent le relais palier
 * par palier.
 */
export function getRateForDuration(
  years: number,
  type: "fixed" | "variable",
  rates?: RatesShape,
): number {
  if (type === "variable") {
    return rates?.rates?.variable ?? VARIABLE_FALLBACK;
  }

  // Borne basse
  if (years <= FIXED_PALIERS[0].years) {
    return rates?.rates?.[FIXED_PALIERS[0].key] ?? FIXED_PALIERS[0].fallback;
  }
  // Borne haute
  const last = FIXED_PALIERS[FIXED_PALIERS.length - 1];
  if (years >= last.years) {
    return rates?.rates?.[last.key] ?? last.fallback;
  }

  // Interpolation lineaire entre les deux paliers encadrants
  for (let i = 0; i < FIXED_PALIERS.length - 1; i++) {
    const lo = FIXED_PALIERS[i];
    const hi = FIXED_PALIERS[i + 1];
    if (years >= lo.years && years <= hi.years) {
      const loRate = rates?.rates?.[lo.key] ?? lo.fallback;
      const hiRate = rates?.rates?.[hi.key] ?? hi.fallback;
      const ratio = (years - lo.years) / (hi.years - lo.years);
      return Math.round((loRate + ratio * (hiRate - loRate)) * 100) / 100;
    }
  }

  // Defense : ne devrait jamais arriver
  return rates?.rates?.fixed_25 ?? FIXED_PALIERS[4].fallback;
}
