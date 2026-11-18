// Budget mensuel Claude (nov. 2026) : 200 $ par defaut, modifiable dans la
// carte « Consommation Claude ». Bandeau discret a 80 %, rouge a 100 % ; a
// 100 %, le bouton de traduction demande une confirmation avant d'appeler
// Claude. Module pur (ecran, serveur, tests).

export const DEFAULT_MONTHLY_BUDGET_USD = 200;
export const BUDGET_NEAR_RATIO = 0.8;
export const MAX_MONTHLY_BUDGET_USD = 100000;

export type BudgetLevel = "near" | "over";

/** null sous 80 % ; "near" de 80 a 100 % ; "over" a partir de 100 %. */
export function budgetLevel(monthUsd: number, budgetUsd: number): BudgetLevel | null {
  if (!(budgetUsd > 0)) return null;
  if (monthUsd >= budgetUsd) return "over";
  if (monthUsd >= budgetUsd * BUDGET_NEAR_RATIO) return "near";
  return null;
}

export function budgetPercent(monthUsd: number, budgetUsd: number): number {
  return budgetUsd > 0 ? Math.floor((monthUsd / budgetUsd) * 100) : 0;
}

type UsageRow = { cost_usd: number | string | null; request_id: string | null; created_at?: string; usage?: string | null };

/**
 * Cout moyen d'une traduction sur les traductions reelles deja faites : un
 * clic (request_id) = une traduction, anglais et allemand ensemble.
 */
export function averageTranslation(rows: UsageRow[]): { avgUsd: number | null; count: number } {
  const byClick = new Map<string, number>();
  for (const r of rows) {
    if (r.usage && !r.usage.startsWith("traduction")) continue;
    const id = r.request_id ?? r.created_at ?? "";
    if (!id) continue;
    byClick.set(id, (byClick.get(id) ?? 0) + (Number(r.cost_usd) || 0));
  }
  const count = byClick.size;
  if (!count) return { avgUsd: null, count: 0 };
  const total = [...byClick.values()].reduce((a, b) => a + b, 0);
  return { avgUsd: total / count, count };
}

/** « 200 $ », « 12,34 $ » (symbole court, comme dans la carte). */
export function formatUsd(v: number, locale = "fr-LU"): string {
  const whole = Number.isInteger(Math.round(v * 100) / 100);
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", currencyDisplay: "narrowSymbol", minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(v);
}
