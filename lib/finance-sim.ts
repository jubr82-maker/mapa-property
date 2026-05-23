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
