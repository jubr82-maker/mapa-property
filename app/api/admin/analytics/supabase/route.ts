import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export const dynamic = "force-dynamic";
export const revalidate = 300;

function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "42P01" || code === "PGRST205";
}

type ViewRow = { property_id: string; viewed_at: string };
type LeadDailyRow = { created_at: string };
type PropertyMini = {
  id: string;
  slug: string | null;
  title_fr?: string | null;
  title_en?: string | null;
  title_de?: string | null;
};
type OffmarketMini = { id: string; reference: string | null; title: string | null };

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // --- leads count 30j + daily breakdown ----------------------------------
  const [leadsCountR, leadsDailyR, viewsR, searchLogsR] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("leads")
      .select("created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true }),
    supabase
      .from("property_views")
      .select("property_id, viewed_at")
      .gte("viewed_at", ninetyDaysAgo.toISOString())
      .limit(50_000),
    // Table optionnelle — graceful si absente
    supabase
      .from("chatbot_logs")
      .select("query")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .limit(1000),
  ]);

  const leadsCount30d = leadsCountR.count ?? 0;

  // --- conversion daily (leads / jour) ------------------------------------
  const dayMap: Record<string, number> = {};
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dayMap[key] = 0;
  }
  for (const row of (leadsDailyR.data ?? []) as LeadDailyRow[]) {
    const key = row.created_at.slice(0, 10);
    if (key in dayMap) dayMap[key] += 1;
  }
  const conversionDaily = Object.entries(dayMap).map(([date, count]) => ({
    date,
    count,
  }));

  // --- top properties par vues 90j ----------------------------------------
  const viewsAvailable = !isMissingTable(viewsR.error);
  const counts: Record<string, number> = {};
  if (viewsAvailable) {
    for (const v of (viewsR.data ?? []) as ViewRow[]) {
      counts[v.property_id] = (counts[v.property_id] ?? 0) + 1;
    }
  }
  const topEntries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topIds = topEntries.map(([id]) => id);

  const propsMap = new Map<string, PropertyMini>();
  const offMap = new Map<string, OffmarketMini>();
  if (topIds.length > 0) {
    const [apimoRes, offRes] = await Promise.all([
      supabase
        .from("properties")
        .select("id,slug,title_fr,title_en,title_de")
        .in("id", topIds),
      supabase
        .from("properties_offmarket")
        .select("id,reference,title")
        .in("id", topIds),
    ]);
    for (const row of (apimoRes.data ?? []) as PropertyMini[]) propsMap.set(row.id, row);
    for (const row of (offRes.data ?? []) as OffmarketMini[]) offMap.set(row.id, row);
  }

  const topProperties = topEntries.map(([id, count]) => {
    const apimo = propsMap.get(id);
    const off = offMap.get(id);
    const label = apimo
      ? apimo.title_fr || apimo.title_en || apimo.title_de || apimo.slug || id.slice(0, 8)
      : off
        ? `${off.reference ?? "OM"} · ${off.title ?? "Off-Market"}`
        : id.slice(0, 8);
    const href = apimo?.slug ? `/fr/biens/${apimo.slug}` : off ? `/fr/off-market/${off.id}` : null;
    return { id, label, count, href };
  });

  // --- top search terms (optionnel) ---------------------------------------
  let topSearchTerms: { key: string; value: number }[] = [];
  const searchAvailable = !isMissingTable(searchLogsR.error);
  if (searchAvailable && Array.isArray(searchLogsR.data)) {
    const termCounts: Record<string, number> = {};
    for (const row of searchLogsR.data as { query?: string }[]) {
      const q = (row.query ?? "").trim().toLowerCase();
      if (!q || q.length < 3) continue;
      termCounts[q] = (termCounts[q] ?? 0) + 1;
    }
    topSearchTerms = Object.entries(termCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, value]) => ({ key, value }));
  }

  return NextResponse.json({
    ok: true,
    leadsCount30d,
    conversionDaily,
    topProperties,
    topSearchTerms,
    viewsAvailable,
    searchLogsAvailable: searchAvailable,
  });
}
