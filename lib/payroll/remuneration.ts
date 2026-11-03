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

export type ReserveView = {
  /** Cumul des parts de l'agent depuis le debut du suivi. */
  cumulAgentHt: number;
  months: number;
  /** Cout mensuel du salaire actuel pris sur la part de l'agent. */
  monthlyCost: number;
  salary: SalaryView;
  balance: number;
  /** Mois couverts au net actuel (une decimale, arrondi vers le bas), null si cout nul. */
  monthsCovered: number | null;
  /** La reserve ne couvre plus un mois. */
  short: boolean;
};

/**
 * Compte de reserve : cumul des parts de l'agent depuis le debut du suivi,
 * moins le cout mensuel de son salaire actuel pour chaque mois ecoule.
 */
export function reserveAccount(cumulAgentHt: number, months: number, currentNet: number, agent: RemunerationAgent, employer: RemunerationEmployer, p: LuPayrollParams = PARAMS_2026): ReserveView {
  const salary = salaryFromNet(currentNet, agent, employer, p);
  const monthlyCost = costOnAgentShare(salary.employer, agent);
  const m = Math.max(0, Math.round(months));
  const balance = cents(cumulAgentHt - monthlyCost * m);
  const monthsCovered = monthlyCost > 0 ? Math.floor((balance / monthlyCost) * 10) / 10 : null;
  return { cumulAgentHt: cents(cumulAgentHt), months: m, monthlyCost, salary, balance, monthsCovered, short: monthlyCost > 0 && balance < monthlyCost };
}
