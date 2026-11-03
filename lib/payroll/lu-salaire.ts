// Calcul de salaire au Luxembourg (nov. 2026) : brut vers net, net vers
// brut, cout employeur, estimation annuelle en classe 2. Fonctions pures,
// sans reseau ; parametres de lib/payroll/lu-parametres-2026.ts.
//
// Methode mensuelle : le brut mensuel est annualise (x 12), l'impot et les
// credits d'impot sont calcules sur l'annee puis divises par 12. Pas de
// 13e mois. Chaque montant mensuel est arrondi au centime.
//
//   revenu imposable annuel = brut annuel - pension - maladie (la dependance
//     n'est pas deduite) - frais de deplacement - 540 - 480
//   impot annuel = bareme (classe 1 ou 2) x 1,07 (fonds pour l'emploi)
//   net = brut - cotisations salarie (dependance comprise) - impot
//         + credit d'impot salarie + credit CO2
//
// Estimations : l'impot reel est fixe par l'Administration des
// contributions directes. Classe 1a : non implementee.

import { PARAMS_2026, type LuPayrollParams } from "@/lib/payroll/lu-parametres-2026";

export type PayrollTaxClass = 1 | 2;

export type PayrollSettings = {
  /** Classe d'impot de la retenue mensuelle. */
  taxClass: PayrollTaxClass;
  /** Deduction annuelle pour frais de deplacement (euros). */
  travelDeduction: number;
  /** Taux de mutualite des employeurs en % (0,23, 0,95, 1,56 ou 2,66). */
  mutualiteRate: number;
  /** Facteur bonus-malus de l'assurance accident (0,85 a 1,5). */
  accidentFactor: number;
};

export type NetResult = {
  brut: number;
  pension: number;
  maladie: number;
  dependance: number;
  cotisationsSalarie: number;
  /** Impot retenu du mois (fonds pour l'emploi compris). */
  impot: number;
  creditCis: number;
  creditCo2: number;
  net: number;
  annual: {
    brut: number;
    cotisationsDeductibles: number;
    revenuImposable: number;
    impot: number;
    creditCis: number;
    creditCo2: number;
  };
};

export type EmployerCost = {
  brut: number;
  pension: number;
  maladie: number;
  accident: number;
  santeTravail: number;
  mutualite: number;
  charges: number;
  coutTotal: number;
};

/** Au centime, sans erreur de virgule flottante. */
export function cents(n: number): number {
  return Math.round(Number((n * 100).toPrecision(12))) / 100;
}

/** Classe 1a : pas de calcul (affiche "calcul non disponible"). */
export function isTaxClassSupported(c: unknown): c is PayrollTaxClass {
  return c === 1 || c === 2;
}

/** Bareme de la classe 1 sur un revenu imposable annuel, sans fonds pour l'emploi. */
export function baremeClasse1(revenu: number, p: LuPayrollParams = PARAMS_2026): number {
  if (!(revenu > 0)) return 0;
  let tax = 0;
  let low = 0;
  for (const b of p.baremeClasse1) {
    if (revenu <= low) break;
    tax += (Math.min(revenu, b.upTo) - low) * b.rate;
    low = b.upTo;
  }
  return tax;
}

/** Impot annuel (bareme de la classe, fonds pour l'emploi compris), au centime. */
export function impotAnnuel(revenu: number, taxClass: PayrollTaxClass, p: LuPayrollParams = PARAMS_2026): number {
  if (!(revenu > 0)) return 0;
  const bareme = taxClass === 2 ? 2 * baremeClasse1(revenu / 2, p) : baremeClasse1(revenu, p);
  const seuil = taxClass === 2 ? p.fondsEmploiSeuilClasse2 : p.fondsEmploiSeuilClasse1;
  const fonds = revenu > seuil ? p.fondsEmploiTauxMajore : p.fondsEmploiTaux;
  return cents(bareme * (1 + fonds));
}

/** Credit d'impot salarie annuel sur le brut annuel, au centime. */
export function creditCisAnnuel(brutAnnuel: number, p: LuPayrollParams = PARAMS_2026): number {
  const c = p.cis;
  if (brutAnnuel < c.debut || brutAnnuel >= c.fin) return 0;
  if (brutAnnuel <= c.finPente) return cents(c.base + (brutAnnuel - c.debut) * c.pente);
  if (brutAnnuel <= c.debutDegressif) return c.plateau;
  return cents(Math.max(0, c.plateau - (brutAnnuel - c.debutDegressif) * c.degressif));
}

/** Credit d'impot CO2 salarie annuel sur le brut annuel, au centime. */
export function creditCo2Annuel(brutAnnuel: number, p: LuPayrollParams = PARAMS_2026): number {
  const c = p.co2;
  if (brutAnnuel < c.debut || brutAnnuel >= c.fin) return 0;
  if (brutAnnuel <= c.debutDegressif) return c.plateau;
  return cents(Math.max(0, c.plateau - (brutAnnuel - c.debutDegressif) * c.degressif));
}

/** Cotisations salarie d'un mois, chacune au centime. */
export function cotisationsSalarie(brut: number, p: LuPayrollParams = PARAMS_2026): { pension: number; maladie: number; dependance: number } {
  const b = Math.max(0, brut);
  const plafonne = Math.min(b, p.plafondMensuel);
  return {
    pension: cents(plafonne * p.pensionSalarie),
    maladie: cents(plafonne * p.maladieSalarie),
    dependance: cents(Math.max(0, b - p.dependanceAbattementMensuel) * p.dependanceSalarie),
  };
}

/**
 * Revenu imposable annuel : brut annuel moins pension et maladie annuelles
 * (plafond annuel = 12 fois le plafond mensuel), moins frais de deplacement
 * et forfaits. Jamais negatif.
 */
export function revenuImposableAnnuel(brutAnnuel: number, travelDeduction: number, p: LuPayrollParams = PARAMS_2026): { cotisationsDeductibles: number; revenuImposable: number } {
  const b = Math.max(0, brutAnnuel);
  const plafonne = Math.min(b, p.plafondMensuel * 12);
  const cotisationsDeductibles = cents(plafonne * (p.pensionSalarie + p.maladieSalarie));
  const revenuImposable = cents(Math.max(0, b - cotisationsDeductibles - Math.max(0, travelDeduction) - p.forfaitFraisObtention - p.forfaitDepensesSpeciales));
  return { cotisationsDeductibles, revenuImposable };
}

/** Brut mensuel vers net mensuel (retenue de la classe reglee). */
export function brutVersNet(brut: number, s: Pick<PayrollSettings, "taxClass" | "travelDeduction">, p: LuPayrollParams = PARAMS_2026): NetResult {
  const b = cents(Math.max(0, brut));
  const { pension, maladie, dependance } = cotisationsSalarie(b, p);
  const cotisations = cents(pension + maladie + dependance);
  const brutAnnuel = cents(b * 12);
  const { cotisationsDeductibles, revenuImposable } = revenuImposableAnnuel(brutAnnuel, s.travelDeduction, p);
  const impotA = impotAnnuel(revenuImposable, s.taxClass, p);
  const cisA = creditCisAnnuel(brutAnnuel, p);
  const co2A = creditCo2Annuel(brutAnnuel, p);
  const impot = cents(impotA / 12);
  const creditCis = cents(cisA / 12);
  const creditCo2 = cents(co2A / 12);
  return {
    brut: b,
    pension,
    maladie,
    dependance,
    cotisationsSalarie: cotisations,
    impot,
    creditCis,
    creditCo2,
    net: cents(b - cotisations - impot + creditCis + creditCo2),
    annual: { brut: brutAnnuel, cotisationsDeductibles, revenuImposable, impot: impotA, creditCis: cisA, creditCo2: co2A },
  };
}

/** Plafond de recherche : 100 000 euros bruts par mois. */
const MAX_BRUT_CENTS = 10_000_000;

/**
 * Net mensuel souhaite vers brut mensuel, par recherche au centime : le plus
 * petit brut dont le net atteint le net souhaite (le net croit avec le brut).
 */
export function netVersBrut(net: number, s: Pick<PayrollSettings, "taxClass" | "travelDeduction">, p: LuPayrollParams = PARAMS_2026): NetResult {
  const target = cents(Math.max(0, net));
  if (target === 0) return brutVersNet(0, s, p);
  let lo = 0;
  let hi = MAX_BRUT_CENTS;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (brutVersNet(mid / 100, s, p).net >= target) hi = mid;
    else lo = mid + 1;
  }
  return brutVersNet(lo / 100, s, p);
}

/** Charges patronales d'un mois et cout total pour l'employeur, au centime. */
export function coutEmployeur(brut: number, s: Pick<PayrollSettings, "mutualiteRate" | "accidentFactor">, p: LuPayrollParams = PARAMS_2026): EmployerCost {
  const b = cents(Math.max(0, brut));
  const plafonne = Math.min(b, p.plafondMensuel);
  const pension = cents(plafonne * p.pensionEmployeur);
  const maladie = cents(plafonne * p.maladieEmployeur);
  const accident = cents(plafonne * p.accidentEmployeur * s.accidentFactor);
  const santeTravail = cents(plafonne * p.santeTravailEmployeur);
  const mutualite = cents((plafonne * s.mutualiteRate) / 100);
  const charges = cents(pension + maladie + accident + santeTravail + mutualite);
  return { brut: b, pension, maladie, accident, santeTravail, mutualite, charges, coutTotal: cents(b + charges) };
}

/** Cout total mensuel disponible vers le plus grand brut qu'il couvre (au centime). */
export function brutDepuisCoutTotal(coutTotal: number, s: Pick<PayrollSettings, "mutualiteRate" | "accidentFactor">, p: LuPayrollParams = PARAMS_2026): EmployerCost {
  const target = cents(Math.max(0, coutTotal));
  let lo = 0;
  let hi = Math.min(MAX_BRUT_CENTS, Math.round(target * 100));
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (coutEmployeur(mid / 100, s, p).coutTotal <= target) lo = mid;
    else hi = mid - 1;
  }
  return coutEmployeur(lo / 100, s, p);
}

export type Class2Estimate = {
  /** Revenu imposable annuel de l'agent (methode du calcul mensuel). */
  revenuImposableAgent: number;
  /** Revenu imposable commun du foyer (agent + partenaire). */
  revenuImposableFoyer: number;
  /** Impot annuel estime du foyer en classe 2. */
  impotClasse2: number;
  /** Impot retenu sur l'annee sur le salaire de l'agent, en classe 1. */
  impotRetenuClasse1: number;
  /** Impot deja retenu sur les revenus du partenaire (saisi), null si non saisi. */
  impotRetenuPartenaire: number | null;
  /**
   * Impot de la classe 2 moins (impot retenu de l'agent + impot retenu du
   * partenaire) : positif = supplement estime, negatif = remboursement estime.
   * Impot du partenaire non saisi : compte pour 0, difference incomplete.
   */
  difference: number;
  differenceComplete: boolean;
};

/**
 * Estimation annuelle en classe 2 (imposition collective) : revenu imposable
 * de l'agent (brut annuel, memes deductions que la retenue) plus revenu
 * imposable annuel du partenaire, impot de la classe 2 sur le total,
 * compare a l'impot deja retenu : celui de l'agent en classe 1 et, s'il est
 * saisi, celui du partenaire. Le revenu et l'impot du partenaire ne sont
 * jamais enregistres (parametres seulement).
 */
export function estimationAnnuelleClasse2(
  brutAnnuelAgent: number,
  revenuImposablePartenaire: number,
  impotRetenuPartenaire: number | null,
  s: Pick<PayrollSettings, "travelDeduction">,
  p: LuPayrollParams = PARAMS_2026,
): Class2Estimate {
  const { revenuImposable: agent } = revenuImposableAnnuel(brutAnnuelAgent, s.travelDeduction, p);
  const foyer = cents(agent + Math.max(0, revenuImposablePartenaire));
  const impotClasse2 = impotAnnuel(foyer, 2, p);
  const impotRetenuClasse1 = impotAnnuel(agent, 1, p);
  const partenaire = impotRetenuPartenaire === null || !Number.isFinite(impotRetenuPartenaire) ? null : cents(Math.max(0, impotRetenuPartenaire));
  return {
    revenuImposableAgent: agent,
    revenuImposableFoyer: foyer,
    impotClasse2,
    impotRetenuClasse1,
    impotRetenuPartenaire: partenaire,
    difference: cents(impotClasse2 - (impotRetenuClasse1 + (partenaire ?? 0))),
    differenceComplete: partenaire !== null,
  };
}
