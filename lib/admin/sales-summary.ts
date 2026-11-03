// Totaux des commissions des ventes realisees (nov. 2026) : periode filtree,
// totaux HT, TVA, TTC et recapitulatif par agent avec sa part. Module pur,
// partage par la liste des ventes et l'ecran de remuneration.
//
// Ventes sans commission : comptees dans le nombre de ventes, pas dans les
// montants, et comptees a part ("Non renseignee").

import { commissionAmounts, roundCents, storedCommission } from "@/lib/admin/sale-commission";
import { saleAgentKey, type SalesAgent } from "@/lib/admin/remuneration-reglages";

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
