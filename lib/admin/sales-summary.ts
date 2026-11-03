// Totaux des commissions des ventes realisees (nov. 2026) : periode filtree,
// totaux HT, TVA, TTC et recapitulatif par agent avec sa part. Module pur,
// partage par la liste des ventes et l'ecran de remuneration.
//
// Ventes sans commission : comptees dans le nombre de ventes, pas dans les
// montants, et comptees a part ("Non renseignee").

import { commissionAmounts, roundCents, storedCommission } from "@/lib/admin/sale-commission";
import { DEFAULT_AGENT, saleAgentKey, type SalesAgent } from "@/lib/admin/remuneration-reglages";
import { lastDayOfMonth as monthEnd, salariesPaid, salariesThroughMonthOf, type SalarySchedule } from "@/lib/payroll/remuneration";

export const PERIODS = ["mois", "annee", "annee_precedente", "tout", "dates"] as const;
export type PeriodKey = (typeof PERIODS)[number];

export type Period = { key: PeriodKey; from: string | null; to: string | null };

const ISO_DAY = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function validDay(v: string | undefined | null): string | null {
  if (!v || !ISO_DAY.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return d.toISOString().slice(0, 10) === v ? v : null;
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  return d.toISOString().slice(0, 10);
}

/** Jour du calendrier a Luxembourg (AAAA-MM-JJ). */
export function luxembourgToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Luxembourg", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * Periode demandee vers bornes incluses. Inconnue : "tout". De date a date :
 * bornes invalides ignorees, inversees si besoin.
 */
export function resolvePeriod(key: string | undefined, fromRaw: string | undefined, toRaw: string | undefined, today: string): Period {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  switch (key) {
    case "mois":
      return { key, from: `${today.slice(0, 7)}-01`, to: lastDayOfMonth(y, m) };
    case "annee":
      return { key, from: `${y}-01-01`, to: `${y}-12-31` };
    case "annee_precedente":
      return { key, from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    case "dates": {
      let from = validDay(fromRaw);
      let to = validDay(toRaw);
      if (from && to && from > to) [from, to] = [to, from];
      return from || to ? { key, from, to } : { key: "tout", from: null, to: null };
    }
    default:
      return { key: "tout", from: null, to: null };
  }
}

/** Nombre de mois civils touches par la periode (au moins 1), pour un equivalent mensuel. */
export function monthsInPeriod(from: string, to: string): number {
  const a = Number(from.slice(0, 4)) * 12 + Number(from.slice(5, 7));
  const b = Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7));
  return Math.max(1, b - a + 1);
}

export type SaleForSummary = { agent: string } & Record<string, unknown>;

export type CommissionTotals = { count: number; notProvided: number; ht: number; tva: number; ttc: number };

export type AgentSummary = CommissionTotals & { key: string; sharePct: number; agentHt: number; mapaHt: number };

/** Part de l'agent et part MAPA Property d'un total HT, au centime (la somme retombe sur le total). */
export function splitCommission(ht: number, sharePct: number): { agentHt: number; mapaHt: number } {
  const agentHt = roundCents((ht * sharePct) / 100);
  return { agentHt, mapaHt: roundCents(ht - agentHt) };
}

function emptyTotals(): CommissionTotals {
  return { count: 0, notProvided: 0, ht: 0, tva: 0, ttc: 0 };
}

function add(t: CommissionTotals, sale: SaleForSummary): void {
  t.count++;
  const c = storedCommission(sale);
  if (!c) {
    t.notProvided++;
    return;
  }
  const a = commissionAmounts(c.ht, c.vat);
  t.ht = roundCents(t.ht + a.ht);
  t.tva = roundCents(t.tva + a.tva);
  t.ttc = roundCents(t.ttc + a.ttc);
}

/** Totaux des ventes donnees : HT, TVA, TTC (somme des montants de chaque vente, au centime). */
export function commissionTotals(sales: readonly SaleForSummary[]): CommissionTotals {
  const t = emptyTotals();
  for (const s of sales) add(t, s);
  return t;
}

/**
 * Recapitulatif par agent, dans l'ordre des reglages ; un agent sans vente
 * apparait avec des zeros. Une vente d'un agent absent des reglages
 * (impossible aujourd'hui) prend la part par defaut de l'agent par defaut.
 */
export function summaryByAgent(sales: readonly SaleForSummary[], agents: readonly SalesAgent[], fallbackSharePct: number): AgentSummary[] {
  const byKey = new Map<string, CommissionTotals>();
  for (const a of agents) byKey.set(a.key, emptyTotals());
  const keys = agents.map((a) => a.key);
  for (const s of sales) {
    const k = saleAgentKey(s.agent, keys);
    if (!byKey.has(k)) byKey.set(k, emptyTotals());
    add(byKey.get(k)!, s);
  }
  return Array.from(byKey.entries()).map(([key, t]) => {
    const sharePct = agents.find((a) => a.key === key)?.sharePct ?? fallbackSharePct;
    return { key, ...t, sharePct, ...splitCommission(t.ht, sharePct) };
  });
}

/** Vente a venir : date de l'acte posterieure a aujourd'hui (Luxembourg). Jamais refusee. */
export function isUpcomingSale(dateActe: string, today: string): boolean {
  return dateActe.slice(0, 10) > today;
}

/** Ventes realisees (date de l'acte jusqu'a aujourd'hui) et ventes a venir. */
export function splitBySaleDate<T extends { date_acte: string }>(sales: readonly T[], today: string): { realized: T[]; upcoming: T[] } {
  const realized: T[] = [];
  const upcoming: T[] = [];
  for (const s of sales) (isUpcomingSale(s.date_acte, today) ? upcoming : realized).push(s);
  return { realized, upcoming };
}

/**
 * Duree d'une periode en mois entiers, pour tout calcul "par mois" :
 * mois en cours 1, annee en cours 12, annee precedente 12, de date a date
 * les mois du calendrier couverts (borne absente : mois de la premiere
 * vente, mois en cours), tout du mois de la premiere vente au mois en cours
 * inclus. Toujours au moins 1.
 */
export function periodMonths(period: Period, firstSaleDate: string | null, today: string): number {
  switch (period.key) {
    case "mois":
      return 1;
    case "annee":
    case "annee_precedente":
      return 12;
    case "dates": {
      const from = period.from ?? firstSaleDate ?? today;
      const to = period.to ?? today;
      return from <= to ? monthsInPeriod(from, to) : monthsInPeriod(to, from);
    }
    default: {
      const first = firstSaleDate && firstSaleDate <= today ? firstSaleDate : today;
      return monthsInPeriod(first, today);
    }
  }
}

export type ReserveData = {
  start: string;
  startBalance: number;
  /** Parts de l'agent des ventes realisees datees de la date de debut ou apres. */
  cumulAgentHt: number;
  sales: number;
  paid: SalarySchedule;
  /** Ventes a venir (acte apres aujourd'hui, a partir de la date de debut), null si aucune. */
  forecast: { cumulAgentHt: number; sales: number; lastDate: string; endDate: string; salaries: number } | null;
};

/**
 * Donnees du compte de reserve d'un agent : solde de depart a la date de
 * debut ; s'y ajoutent les ventes datees de la date de debut ou apres (les
 * ventes anterieures sont deja comprises dans le solde). Realise : jusqu'a
 * aujourd'hui ; previsionnel : ventes a venir, jusqu'a la fin du mois de la
 * derniere. Salaires : verses le dernier jour de chaque mois.
 */
export function reserveData(
  sales: readonly SaleForSummary[],
  agent: Pick<SalesAgent, "key" | "sharePct" | "reserveStart" | "startBalance">,
  today: string,
): ReserveData | null {
  const start = agent.reserveStart;
  if (!start) return null;
  const since = (sales as (SaleForSummary & { date_acte: string })[]).filter((s) => s.date_acte.slice(0, 10) >= start);
  const { realized, upcoming } = splitBySaleDate(since, today);
  const asAgent = [{ ...DEFAULT_AGENT, key: agent.key, sharePct: agent.sharePct }];
  const [r] = summaryByAgent(realized, asAgent, agent.sharePct);
  const [u] = summaryByAgent(upcoming, asAgent, agent.sharePct);
  const lastDate = upcoming.map((s) => s.date_acte.slice(0, 10)).sort().at(-1) ?? null;
  return {
    start,
    startBalance: agent.startBalance,
    cumulAgentHt: r.agentHt,
    sales: r.count,
    paid: salariesPaid(start, today),
    forecast: lastDate ? { cumulAgentHt: u.agentHt, sales: u.count, lastDate, endDate: monthEnd(lastDate), salaries: salariesThroughMonthOf(start, lastDate) } : null,
  };
}
