// Simulateur de financement immobilier, utilitaires pure JS,
// utilisables côté client et serveur. Pas de dépendance externe.
import { FALLBACK_RATES, type RatesJson } from "./rates";

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

// Forme minimale acceptée par getRateForDuration, compatible avec
// InterestRates (lib/types.ts) sans creer de dependance circulaire.
type RatesShape = { rates?: RatesJson | null } | null;

// Paliers lus dans interest_rates.rates. Valeurs de secours (base sans ligne
// BCE) : statistiques BCE, septembre 2026, verifiees le 17/11/2026
// (fixe de 1 a 5 ans 3,85 ; de 5 a 10 ans 3,97 ; plus de 10 ans 4,03 ;
// variable et fixe jusqu'a 1 an 3,13).
const FIXED_PALIERS: ReadonlyArray<{ years: number; key: "fixed_5" | "fixed_10" | "fixed_15" | "fixed_20" | "fixed_25" | "fixed_30"; fallback: number }> = [
  { years: 5,  key: "fixed_5",  fallback: FALLBACK_RATES.fixed_5 as number },
  { years: 10, key: "fixed_10", fallback: FALLBACK_RATES.fixed_10 as number },
  { years: 15, key: "fixed_15", fallback: FALLBACK_RATES.fixed_15 as number },
  { years: 20, key: "fixed_20", fallback: FALLBACK_RATES.fixed_20 as number },
  { years: 25, key: "fixed_25", fallback: FALLBACK_RATES.fixed_25 as number },
  { years: 30, key: "fixed_30", fallback: FALLBACK_RATES.fixed_30 as number },
];

const VARIABLE_FALLBACK = FALLBACK_RATES.variable as number;

/**
 * Retourne le taux annuel a appliquer pour une duree donnee.
 *
 * - type='variable' : `rates.variable` (BCE : variable et fixe jusqu'a 1 an).
 * - type='fixed' :
 *   - jusqu'a 5 ans : fixed_5 (BCE : fixe de 1 a 5 ans) ;
 *   - de 5 a 10 ans : interpolation lineaire entre fixed_5 et fixed_10 ;
 *   - 10 ans : fixed_10 (BCE : fixe de 5 a 10 ans) ;
 *   - plus de 10 ans : taux moyen des prets a taux fixe de plus de 10 ans
 *     (fixed_over_10) s'il est enregistre, sinon paliers 15 a 30 ans.
 *
 * Valeurs de palier renvoyees telles quelles ; interpolation arrondie a
 * 2 decimales. Aucun throw : palier absent = valeur de secours.
 */
export function getRateForDuration(
  years: number,
  type: "fixed" | "variable",
  rates?: RatesShape,
): number {
  const r = rates?.rates ?? null;
  if (type === "variable") {
    return r?.variable ?? VARIABLE_FALLBACK;
  }
  const val = (p: (typeof FIXED_PALIERS)[number]) => r?.[p.key] ?? p.fallback;

  if (years <= FIXED_PALIERS[0].years) return val(FIXED_PALIERS[0]);
  if (years > 10 && typeof r?.fixed_over_10 === "number") return r.fixed_over_10;
  const y = years > 10 ? Math.max(years, 15) : years;
  const last = FIXED_PALIERS[FIXED_PALIERS.length - 1];
  if (y >= last.years) return val(last);

  for (let i = 0; i < FIXED_PALIERS.length - 1; i++) {
    const lo = FIXED_PALIERS[i];
    const hi = FIXED_PALIERS[i + 1];
    if (y === lo.years) return val(lo);
    if (y === hi.years) return val(hi);
    if (y > lo.years && y < hi.years) {
      const ratio = (y - lo.years) / (hi.years - lo.years);
      return Math.round((val(lo) + ratio * (val(hi) - val(lo))) * 100) / 100;
    }
  }

  // Defense : ne devrait jamais arriver
  return val(last);
}
