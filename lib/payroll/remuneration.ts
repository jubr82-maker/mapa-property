// Ecran "Remuneration" (nov. 2026) : ce que les commissions d'un agent
// permettent et compte de reserve. Fonctions pures (lib/payroll/lu-salaire.ts),
// partagees par l'ecran et les tests ; aucune donnee enregistree ici.
//
// Part de l'agent : si l'agent paie aussi les charges patronales, elle couvre
// le cout total (brut + charges patronales) ; sinon elle couvre le brut seul
// et les charges patronales sont prises sur la part de MAPA Property.

import { PARAMS_2026, type LuPayrollParams } from "@/lib/payroll/lu-parametres-2026";
import { brutDepuisCoutTotal, brutVersNet, cents, coutEmployeur, netVersBrut, type EmployerCost, type NetResult, type PayrollSettings } from "@/lib/payroll/lu-salaire";

export type RemunerationAgent = {
  sharePct: number;
  paysEmployerCharges: boolean;
  taxClass: 1 | 2;
  travelDeduction: number;
  ssmLevel: "non_qualifie" | "qualifie";
};

export type RemunerationEmployer = { mutualiteRate: number; accidentFactor: number };

export function payrollSettings(agent: RemunerationAgent, employer: RemunerationEmployer): PayrollSettings {
  return { taxClass: agent.taxClass, travelDeduction: agent.travelDeduction, mutualiteRate: employer.mutualiteRate, accidentFactor: employer.accidentFactor };
}

/** Salaire social minimum mensuel applicable a l'agent. */
export function ssmFor(agent: Pick<RemunerationAgent, "ssmLevel">, p: LuPayrollParams = PARAMS_2026): number {
  return agent.ssmLevel === "qualifie" ? p.ssmQualifie : p.ssmNonQualifie;
}

/** Brut sous le salaire social minimum (un brut nul n'alerte pas). */
export function belowSsm(brut: number, agent: Pick<RemunerationAgent, "ssmLevel">, p: LuPayrollParams = PARAMS_2026): boolean {
  return brut > 0 && brut < ssmFor(agent, p);
}

/** Cout mensuel d'un brut pris sur la part de l'agent : cout total ou brut seul. */
export function costOnAgentShare(employer: EmployerCost, agent: Pick<RemunerationAgent, "paysEmployerCharges">): number {
  return agent.paysEmployerCharges ? employer.coutTotal : employer.brut;
}

export type SalaryView = { net: NetResult; employer: EmployerCost; belowSsm: boolean };

/** Detail d'un salaire mensuel a partir du brut. */
export function salaryFromBrut(brut: number, agent: RemunerationAgent, employer: RemunerationEmployer, p: LuPayrollParams = PARAMS_2026): SalaryView {
  const s = payrollSettings(agent, employer);
  const net = brutVersNet(brut, s, p);
  return { net, employer: coutEmployeur(net.brut, s, p), belowSsm: belowSsm(net.brut, agent, p) };
}

/** Detail d'un salaire mensuel a partir du net souhaite. */
export function salaryFromNet(net: number, agent: RemunerationAgent, employer: RemunerationEmployer, p: LuPayrollParams = PARAMS_2026): SalaryView {
  const s = payrollSettings(agent, employer);
  return salaryFromBrut(netVersBrut(net, s, p).brut, agent, employer, p);
}

export type PeriodPossibility = {
  months: number;
  /** Part de l'agent par mois. */
  monthlyBudget: number;
  /** Salaire mensuel que la part permet. */
  salary: SalaryView;
  /** Cout total pour l'employeur sur la periode (brut + charges, tous les mois). */
  totalCostPeriod: number;
  /** Charges patronales sur la periode. */
  chargesPeriod: number;
  /** Charges patronales prises sur la part de MAPA Property (0 si l'agent les paie). */
  chargesOnMapa: number;
  /** Ce qu'il reste reellement a MAPA Property. */
  mapaRemaining: number;
};

/**
 * Ce que la part de l'agent sur la periode permet, en salaire mensuel
 * constant sur le nombre de mois de la periode.
 */
export function possibilityFromShare(agentHt: number, mapaHt: number, months: number, agent: RemunerationAgent, employer: RemunerationEmployer, p: LuPayrollParams = PARAMS_2026): PeriodPossibility {
  const m = Math.max(1, Math.round(months));
  const monthlyBudget = cents(Math.max(0, agentHt) / m);
  const s = payrollSettings(agent, employer);
  const emp = agent.paysEmployerCharges ? brutDepuisCoutTotal(monthlyBudget, s, p) : coutEmployeur(monthlyBudget, s, p);
  const salary = salaryFromBrut(emp.brut, agent, employer, p);
  const chargesPeriod = cents(salary.employer.charges * m);
  const chargesOnMapa = agent.paysEmployerCharges ? 0 : chargesPeriod;
  return {
    months: m,
    monthlyBudget,
    salary,
    totalCostPeriod: cents(salary.employer.coutTotal * m),
    chargesPeriod,
    chargesOnMapa,
    mapaRemaining: cents(mapaHt - chargesOnMapa),
  };
}

// Calendrier des salaires : le salaire d'un mois est verse le DERNIER JOUR
// de ce mois (decembre 2025 le 31/12/2025, janvier 2026 le 31/01/2026). La
// reserve ne deduit que les salaires dont ce jour est passe ou atteint
// (jour du calendrier a Luxembourg), a partir du mois de la date de debut.

const monthIndex = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
const monthOf = (i: number) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;

/** Dernier jour du mois d'une date (AAAA-MM ou AAAA-MM-JJ), en AAAA-MM-JJ. */
export function lastDayOfMonth(date: string): string {
  const i = monthIndex(date);
  return new Date(Date.UTC(Math.floor(i / 12), (i % 12) + 1, 0)).toISOString().slice(0, 10);
}

export type SalarySchedule = {
  /** Salaires deja verses depuis le mois de la date de debut. */
  count: number;
  /** Premier et dernier mois verses (AAAA-MM), null si aucun. */
  firstMonth: string | null;
  lastMonth: string | null;
  /** Prochain salaire deduit (dernier jour du mois suivant le dernier verse). */
  nextPaymentDate: string;
};

/** Salaires verses entre la date de debut et aujourd'hui (inclus). */
export function salariesPaid(start: string, today: string): SalarySchedule {
  const first = monthIndex(start);
  const current = monthIndex(today);
  const paidThrough = lastDayOfMonth(today) <= today ? current : current - 1;
  const count = Math.max(0, paidThrough - first + 1);
  return {
    count,
    firstMonth: count > 0 ? monthOf(first) : null,
    lastMonth: count > 0 ? monthOf(first + count - 1) : null,
    nextPaymentDate: lastDayOfMonth(monthOf(first + count)),
  };
}

/** Salaires verses du mois de la date de debut a la fin du mois d'une date donnee (inclus). */
export function salariesThroughMonthOf(start: string, date: string): number {
  return Math.max(0, monthIndex(date) - monthIndex(start) + 1);
}

export type ReserveView = {
  startBalance: number;
  /** Parts de l'agent des ventes ajoutees au solde de depart. */
  cumulAgentHt: number;
  /** Salaires deduits. */
  salaries: number;
  /** Cout mensuel du salaire actuel pris sur la part de l'agent. */
  monthlyCost: number;
  salary: SalaryView;
  balance: number;
  /** Solde divise par le cout mensuel, 1 decimale ; null si cout nul. */
  monthsCovered: number | null;
  /** La reserve ne couvre plus un mois. */
  short: boolean;
};

/**
 * Compte de reserve : solde de depart a la date de debut, plus les parts de
 * l'agent des ventes datees de la date de debut ou apres (les ventes
 * anterieures sont deja comprises dans le solde de depart), moins le cout
 * mensuel du salaire actuel pour chaque salaire deduit.
 */
export function reserveAccount(
  input: { startBalance: number; cumulAgentHt: number; salaries: number; currentNet: number },
  agent: RemunerationAgent,
  employer: RemunerationEmployer,
  p: LuPayrollParams = PARAMS_2026,
): ReserveView {
  const salary = salaryFromNet(input.currentNet, agent, employer, p);
  const monthlyCost = costOnAgentShare(salary.employer, agent);
  const salaries = Math.max(0, Math.round(input.salaries));
  const balance = cents(input.startBalance + input.cumulAgentHt - monthlyCost * salaries);
  const monthsCovered = monthlyCost > 0 ? Math.round((balance / monthlyCost) * 10) / 10 : null;
  return {
    startBalance: cents(input.startBalance),
    cumulAgentHt: cents(input.cumulAgentHt),
    salaries,
    monthlyCost,
    salary,
    balance,
    monthsCovered,
    short: monthlyCost > 0 && balance < monthlyCost,
  };
}
