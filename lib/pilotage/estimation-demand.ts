// Demande revelee par l'estimation (oct. 2026).
//  - Refus hors couverture (pays different du Luxembourg, lieu inconnu ou
//    approximatif) : enregistres dans public.estimation_refusals SANS
//    donnee personnelle (lieu ou pays saisi, type de bien, langue).
//  - Estimations par commune : lues dans estimation_requests.inputs
//    (instantane des saisies, colonne existante).
import { supabaseService } from "@/lib/supabase-service";

export type RefusalReason = "country" | "place_unknown" | "place_approximate";

function clean(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max);
  return t.length ? t : null;
}

export async function recordEstimationRefusal(entry: {
  reason: RefusalReason;
  country?: unknown;
  place?: unknown;
  propertyType?: unknown;
  locale?: unknown;
}): Promise<void> {
  try {
    const { error } = await supabaseService().from("estimation_refusals").insert({
      reason: entry.reason,
      country: clean(entry.country, 60),
      place: clean(entry.place, 80),
      property_type: clean(entry.propertyType, 40),
      locale: clean(entry.locale, 5),
    });
    if (error) console.warn("[estimation-refusal] insertion impossible", { code: error.code });
  } catch {
    console.warn("[estimation-refusal] journal indisponible");
  }
}

export type CountItem = { key: string; value: number };

export type EstimationDemand = {
  available: boolean;
  total: number;
  byCommune: CountItem[];
  refusalsAvailable: boolean;
  refusalsTotal: number;
  refusalsByPlace: CountItem[];
  refusalsByReason: CountItem[];
  recentRefusals: { createdAt: string; reason: string; place: string | null; country: string | null; propertyType: string | null }[];
};

function topCounts(values: (string | null | undefined)[], limit = 15): CountItem[] {
  const m = new Map<string, { label: string; n: number }>();
  for (const v of values) {
    if (!v) continue;
    const label = v.trim();
    const key = label.toLowerCase();
    const cur = m.get(key);
    m.set(key, { label: cur?.label ?? label, n: (cur?.n ?? 0) + 1 });
  }
  return Array.from(m.values())
    .map(({ label, n }) => ({ key: label, value: n }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

export async function loadEstimationDemand(days = 365): Promise<EstimationDemand> {
  const svc = supabaseService();
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const [est, ref] = await Promise.all([
    svc.from("estimation_requests").select("inputs,created_at").gte("created_at", since).limit(5000),
    svc
      .from("estimation_refusals")
      .select("created_at,reason,place,country,property_type")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);
  const estRows = (est.data ?? []) as { inputs: Record<string, unknown> | null }[];
  const refRows = (ref.data ?? []) as {
    created_at: string;
    reason: string;
    place: string | null;
    country: string | null;
    property_type: string | null;
  }[];
  const communeOf = (i: Record<string, unknown> | null) =>
    i && typeof i.commune === "string" ? i.commune : i && typeof i.locality === "string" ? i.locality : null;
  return {
    available: !est.error,
    total: estRows.length,
    byCommune: topCounts(estRows.map((r) => communeOf(r.inputs))),
    refusalsAvailable: !ref.error,
    refusalsTotal: refRows.length,
    refusalsByPlace: topCounts(refRows.map((r) => r.place ?? r.country)),
    refusalsByReason: topCounts(refRows.map((r) => r.reason)),
    recentRefusals: refRows.slice(0, 20).map((r) => ({
      createdAt: r.created_at,
      reason: r.reason,
      place: r.place,
      country: r.country,
      propertyType: r.property_type,
    })),
  };
}
