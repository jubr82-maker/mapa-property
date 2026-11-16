// Compteur de consommation Claude (nov. 2026), serveur seulement, avec la
// session admin (RLS : public.is_mapa_admin(), SQL 40). Tant que le SQL 40
// n'est pas execute, rien ne plante : ready = false ("base pas encore
// prete") et la traduction continue de fonctionner.
import type { SupabaseClient } from "@supabase/supabase-js";
import { CLAUDE_MODEL, claudeCostUsd, remainingCreditUsd, usdToEur } from "@/lib/claude/pricing";

export type ClaudeUsageSummary = {
  ready: boolean;
  usdPerEur: number | null;
  last: { usd: number; at: string } | null;
  todayUsd: number;
  monthUsd: number;
  monthCount: number;
  credit: { amountUsd: number; loadedOn: string } | null;
  remainingUsd: number | null;
};

const TZ = "Europe/Luxembourg";
const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export function missingTable(error: { code?: string } | null | undefined): boolean {
  return !!error && (error.code === "42P01" || error.code === "PGRST205");
}

type Row = { created_at: string; cost_usd: number | string | null; request_id: string | null };

/** Totaux a partir des lignes d'appel (pur, teste). */
export function summarize(rows: Row[], credit: { amountUsd: number; loadedOn: string } | null, now: Date, usdPerEur: number | null): ClaudeUsageSummary {
  const today = dayKey(now);
  const month = today.slice(0, 7);
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const usd = (r: Row) => Number(r.cost_usd) || 0;
  let todayUsd = 0;
  let monthUsd = 0;
  let sinceCredit = 0;
  const monthRequests = new Set<string>();
  for (const r of sorted) {
    const k = dayKey(new Date(r.created_at));
    const id = r.request_id ?? r.created_at;
    if (k === today) todayUsd += usd(r);
    if (k.startsWith(month)) {
      monthUsd += usd(r);
      monthRequests.add(id);
    }
    if (credit && k >= credit.loadedOn) sinceCredit += usd(r);
  }
  // Derniere traduction : tous les appels du meme clic.
  const lastId = sorted[0] ? (sorted[0].request_id ?? sorted[0].created_at) : null;
  const last = lastId ? { usd: sorted.filter((r) => (r.request_id ?? r.created_at) === lastId).reduce((n, r) => n + usd(r), 0), at: sorted[0].created_at } : null;
  return {
    ready: true,
    usdPerEur,
    last,
    todayUsd,
    monthUsd,
    monthCount: monthRequests.size,
    credit,
    remainingUsd: credit ? remainingCreditUsd(credit.amountUsd, sinceCredit) : null,
  };
}

export const EMPTY_SUMMARY = (usdPerEur: number | null): ClaudeUsageSummary => ({
  ready: false,
  usdPerEur,
  last: null,
  todayUsd: 0,
  monthUsd: 0,
  monthCount: 0,
  credit: null,
  remainingUsd: null,
});

export async function loadClaudeUsage(supabase: SupabaseClient, usdPerEur: number | null, now = new Date()): Promise<ClaudeUsageSummary> {
  try {
    const creditRes = await supabase.from("claude_credit").select("amount_usd, loaded_on").eq("id", 1).maybeSingle();
    if (missingTable(creditRes.error)) return EMPTY_SUMMARY(usdPerEur);
    const c = creditRes.data as { amount_usd: number | string; loaded_on: string } | null;
    const credit = c ? { amountUsd: Number(c.amount_usd) || 0, loadedOn: String(c.loaded_on).slice(0, 10) } : null;
    // Depuis le debut du mois (marge d'un jour pour le fuseau) ou depuis le
    // chargement du credit, le plus ancien des deux.
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) - 86_400_000);
    const from = credit && new Date(`${credit.loadedOn}T00:00:00Z`).getTime() - 86_400_000 < monthStart.getTime() ? new Date(new Date(`${credit.loadedOn}T00:00:00Z`).getTime() - 86_400_000) : monthStart;
    const rowsRes = await supabase.from("claude_usage").select("created_at, cost_usd, request_id").gte("created_at", from.toISOString()).order("created_at", { ascending: false }).limit(10000);
    if (missingTable(rowsRes.error)) return EMPTY_SUMMARY(usdPerEur);
    if (rowsRes.error) {
      console.error("[claude/usage] lecture", { code: rowsRes.error.code });
      return EMPTY_SUMMARY(usdPerEur);
    }
    return summarize((rowsRes.data ?? []) as Row[], credit, now, usdPerEur);
  } catch {
    return EMPTY_SUMMARY(usdPerEur);
  }
}

/** Enregistrement d'un appel ; false si la base n'est pas prete. */
export async function recordClaudeCall(
  supabase: SupabaseClient,
  row: { usage: string; inputTokens: number; outputTokens: number; usdPerEur: number | null; propertyId: string | null; requestId: string },
): Promise<boolean> {
  const costUsd = claudeCostUsd(row.inputTokens, row.outputTokens);
  const costEur = usdToEur(costUsd, row.usdPerEur);
  const { error } = await supabase.from("claude_usage").insert({
    usage: row.usage,
    model: CLAUDE_MODEL,
    input_tokens: row.inputTokens,
    output_tokens: row.outputTokens,
    cost_usd: Math.round(costUsd * 1e6) / 1e6,
    cost_eur: costEur == null ? null : Math.round(costEur * 1e6) / 1e6,
    usd_per_eur: row.usdPerEur,
    property_id: row.propertyId,
    request_id: row.requestId,
  });
  if (error && !missingTable(error)) console.error("[claude/usage] enregistrement", { code: error.code });
  return !error;
}
