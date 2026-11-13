// Page admin "Controle Google" (nov. 2026) : lecture seule des resultats
// enregistres par les passages (aucun appel a Google a l'ouverture).
import { CATEGORIES, sortForSubmission, type Category, type CheckKey } from "@/lib/pilotage/controle-core";
import { controleDbReady, googleQuotaUsed, loadResults, loadRuns, lockHeld, type ResultRow, type RunRow } from "@/lib/pilotage/controle-store";
import { googleConfigured, googleQuotaDay, type GoogleAnalytics } from "@/lib/pilotage/controle-google";
import { loadDailyPositions, type DailyPositions } from "@/lib/pilotage/seo";
import { luxDay } from "@/lib/pilotage/health";

export type Group = { key: CheckKey; count: number; items: { url: string; explanation: string }[] };
export type ControleView =
  | { ready: false; keyConfigured: boolean }
  | {
      ready: true;
      keyConfigured: boolean;
      running: boolean;
      lastSite: RunRow | null;
      lastGoogle: RunRow | null;
      openRuns: RunRow[];
      lastCheckAt: string | null;
      zones: Record<Category, Group[]>;
      counts: Record<Category, number>;
      toSubmit: { url: string; key: CheckKey }[];
      indexHistory: { date: string; value: number }[];
      clicksHistory: { date: string; value: number }[];
      impressionsHistory: { date: string; value: number }[];
      analytics: GoogleAnalytics | null;
      positions: DailyPositions;
      quotaUsed: number;
    };

/** Attente de Google qui justifie une demande d'indexation. */
const SUBMIT_KEYS = new Set<CheckKey>(["g_pending_discovered", "g_pending_crawled", "g_pending_unknown", "g_pending_other"]);
const MAX_ITEMS = 40;

export function groupResults(rows: ResultRow[]): { zones: Record<Category, Group[]>; counts: Record<Category, number> } {
  const zones = Object.fromEntries(CATEGORIES.map((c) => [c, [] as Group[]])) as Record<Category, Group[]>;
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
  const by = new Map<string, Group & { category: Category }>();
  for (const r of rows) {
    const category = r.category as Category;
    if (!CATEGORIES.includes(category)) continue;
    counts[category]++;
    const g = by.get(r.check_key) ?? { key: r.check_key, category, count: 0, items: [] };
    g.count++;
    if (g.items.length < MAX_ITEMS) g.items.push({ url: r.url, explanation: r.explanation });
    by.set(r.check_key, g);
  }
  for (const g of by.values()) zones[g.category].push({ key: g.key, count: g.count, items: g.items });
  for (const c of CATEGORIES) zones[c].sort((a, b) => b.count - a.count);
  return { zones, counts };
}

export async function loadControleView(): Promise<ControleView> {
  const keyConfigured = googleConfigured();
  if (!(await controleDbReady())) return { ready: false, keyConfigured };
  const [siteRuns, googleRuns, running, positions, quotaUsed] = await Promise.all([
    loadRuns("site", 90),
    loadRuns("google", 90),
    lockHeld(),
    loadDailyPositions(30),
    googleQuotaUsed(googleQuotaDay()),
  ]);
  const lastSite = siteRuns.find((r) => r.state === "done") ?? null;
  const lastGoogle = googleRuns.find((r) => r.state === "done") ?? null;
  const openRuns = [...siteRuns, ...googleRuns].filter((r) => r.state === "running" || r.state === "paused" || r.state === "quota");
  const rows = [...(lastSite ? await loadResults(lastSite.id) : []), ...(lastGoogle ? await loadResults(lastGoogle.id) : [])];
  const { zones, counts } = groupResults(rows);
  const toSubmit = sortForSubmission(rows.filter((r) => SUBMIT_KEYS.has(r.check_key)).map((r) => ({ url: r.url, key: r.check_key })));
  const doneGoogle = googleRuns.filter((r) => r.state === "done").reverse();
  const perDay = <T,>(runs: RunRow[], pick: (r: RunRow) => T | null) => {
    const m = new Map<string, T>();
    for (const r of runs) {
      const v = pick(r);
      if (v !== null) m.set(luxDay(r.started_at), v);
    }
    return [...m].map(([date, value]) => ({ date, value }));
  };
  const analyticsOf = (r: RunRow) => (r.summary?.analytics as GoogleAnalytics | null | undefined) ?? null;
  const lastCheckAt = [lastSite?.finished_at, lastGoogle?.finished_at].filter((d): d is string => Boolean(d)).sort().at(-1) ?? null;
  return {
    ready: true,
    keyConfigured,
    running,
    lastSite,
    lastGoogle,
    openRuns,
    lastCheckAt,
    zones,
    counts,
    toSubmit,
    indexHistory: perDay(doneGoogle, (r) => (typeof r.summary?.indexed === "number" ? (r.summary.indexed as number) : null)),
    clicksHistory: perDay(doneGoogle, (r) => analyticsOf(r)?.totals.clicks ?? null),
    impressionsHistory: perDay(doneGoogle, (r) => analyticsOf(r)?.totals.impressions ?? null),
    analytics: lastGoogle ? analyticsOf(lastGoogle) : null,
    positions,
    quotaUsed,
  };
}
