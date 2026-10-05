// Positions Google hebdomadaires des requetes cibles (oct. 2026).
// Semaine de reference : la derniere semaine complete (lundi a dimanche)
// terminee depuis au moins 3 jours (delai de consolidation des donnees
// Search Console). Enregistrement idempotent dans public.seo_positions.
import { supabaseService } from "@/lib/supabase-service";
import { fetchQueries, searchConsoleConfigured } from "@/lib/google/search-console";
import { isTargetQuery } from "@/lib/pilotage/seo-targets";

const DAY = 86400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Lundi et dimanche (UTC) de la derniere semaine complete exploitable. */
export function referenceWeek(now = new Date()): { start: string; end: string } {
  const limit = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 3 * DAY);
  const dow = limit.getUTCDay(); // 0 = dimanche
  const sunday = new Date(limit.getTime() - dow * DAY);
  const monday = new Date(sunday.getTime() - 6 * DAY);
  return { start: iso(monday), end: iso(sunday) };
}

/** Releve de la semaine de reference s'il n'existe pas deja. */
export async function snapshotWeeklyPositions(): Promise<{ ok: boolean; detail: string }> {
  if (!searchConsoleConfigured()) return { ok: false, detail: "not_configured" };
  const week = referenceWeek();
  const svc = supabaseService();
  const { count, error: cErr } = await svc
    .from("seo_positions")
    .select("id", { count: "exact", head: true })
    .eq("week_start", week.start);
  if (cErr) return { ok: false, detail: `db_${cErr.code ?? "error"}` };
  if ((count ?? 0) > 0) return { ok: true, detail: `deja_releve_${week.start}` };
  const rows = (await fetchQueries(week.start, week.end, 5000)).filter((r) => isTargetQuery(r.query));
  if (rows.length === 0) {
    // Marqueur de semaine sans requete cible, pour ne pas reinterroger.
    const { error } = await svc.from("seo_positions").upsert(
      [{ week_start: week.start, query: "", clicks: 0, impressions: 0, ctr: null, position: null }],
      { onConflict: "week_start,query" },
    );
    return { ok: !error, detail: `aucune_requete_${week.start}` };
  }
  const { error } = await svc.from("seo_positions").upsert(
    rows.map((r) => ({
      week_start: week.start,
      query: r.query.slice(0, 200),
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: Math.round(r.position * 10) / 10,
    })),
    { onConflict: "week_start,query" },
  );
  return { ok: !error, detail: error ? `db_${error.code ?? "error"}` : `${rows.length}_requetes_${week.start}` };
}

export type PositionTrend = {
  query: string;
  current: number | null;
  previous: number | null;
  clicks: number;
  impressions: number;
};

export type SeoHistory = {
  available: boolean;
  weeks: string[];
  trends: PositionTrend[];
  /** Position moyenne ponderee par les impressions, par semaine. */
  averageByWeek: { date: string; value: number }[];
};

export async function loadSeoHistory(maxWeeks = 26): Promise<SeoHistory> {
  const { data, error } = await supabaseService()
    .from("seo_positions")
    .select("week_start,query,clicks,impressions,position")
    .order("week_start", { ascending: false })
    .limit(10_000);
  if (error) return { available: false, weeks: [], trends: [], averageByWeek: [] };
  const rows = ((data ?? []) as { week_start: string; query: string; clicks: number; impressions: number; position: number | null }[]).filter(
    (r) => r.query !== "",
  );
  const weeks = Array.from(new Set(((data ?? []) as { week_start: string }[]).map((r) => r.week_start))).sort().reverse().slice(0, maxWeeks);
  const [cur, prev] = weeks;
  const byQuery = new Map<string, PositionTrend>();
  for (const r of rows) {
    if (r.week_start !== cur && r.week_start !== prev) continue;
    const t = byQuery.get(r.query) ?? { query: r.query, current: null, previous: null, clicks: 0, impressions: 0 };
    if (r.week_start === cur) {
      t.current = r.position;
      t.clicks = r.clicks;
      t.impressions = r.impressions;
    } else {
      t.previous = r.position;
    }
    byQuery.set(r.query, t);
  }
  const averageByWeek = weeks
    .slice()
    .reverse()
    .map((w) => {
      const ws = rows.filter((r) => r.week_start === w && r.position !== null);
      const imp = ws.reduce((a, r) => a + r.impressions, 0);
      const avg = imp > 0 ? ws.reduce((a, r) => a + (r.position ?? 0) * r.impressions, 0) / imp : 0;
      return { date: w, value: Math.round(avg * 10) / 10 };
    })
    .filter((p) => p.value > 0);
  return {
    available: true,
    weeks,
    trends: Array.from(byQuery.values()).sort((a, b) => b.impressions - a.impressions).slice(0, 50),
    averageByWeek,
  };
}
