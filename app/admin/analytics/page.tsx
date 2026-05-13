import { headers } from "next/headers";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Building2,
  Cloud,
  Eye,
  FileSignature,
  Flame,
  Gauge,
  Globe,
  Heart,
  LineChart,
  Mail,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { AnalyticsHealthPill } from "@/components/admin/AnalyticsHealthPill";
import { KpiCard } from "@/components/admin/analytics/KpiCard";
import { TokenMissingCard } from "@/components/admin/analytics/TokenMissingCard";
import { TopList } from "@/components/admin/analytics/TopList";
import { PieChart } from "@/components/admin/analytics/PieChart";
import { LineChart as AnalyticsLineChart } from "@/components/admin/analytics/LineChart";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types renvoyés par les routes API
// ---------------------------------------------------------------------------

type GaMissing = {
  ok: false;
  reason: "missing_token" | "api_error" | "package_missing" | "unauthorized";
  configUrl?: string;
  instructions?: string;
  message?: string;
};

type GaOk = {
  ok: true;
  sessions7d: number;
  sessions30d: number;
  topPages: { key: string; value: number }[];
  topCountries: { key: string; value: number }[];
  mobileVsDesktop: { mobile: number; desktop: number; tablet: number };
  conversionDaily: { key: string; value: number }[];
};

type VercelOk = {
  ok: true;
  webVitals: { lcp: number | null; fid: number | null; cls: number | null; inp: number | null };
  totalViews: number;
  topReferrers: { key: string; value: number }[];
  topPages: { key: string; value: number }[];
};

type CloudflareOk = {
  ok: true;
  requests: number;
  bandwidth: number;
  cacheHit: number;
  threats: number;
  daily: { date: string; requests: number; threats: number }[];
};

type SupabaseAnalyticsOk = {
  ok: true;
  leadsCount30d: number;
  conversionDaily: { date: string; count: number }[];
  topProperties: { id: string; label: string; count: number; href: string | null }[];
  topSearchTerms: { key: string; value: number }[];
  viewsAvailable: boolean;
  searchLogsAvailable: boolean;
};

type ApiResponse<TOk> = TOk | GaMissing;

async function fetchInternal<T>(path: string): Promise<T | null> {
  try {
    const h = await headers();
    const host = h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const cookie = h.get("cookie") ?? "";
    const res = await fetch(`${proto}://${host}${path}`, {
      headers: { cookie },
      cache: "no-store",
    });
    if (!res.ok && res.status !== 200) {
      // 401/etc → on continue, on traite côté caller
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function loadExternalAnalytics() {
  const [ga4, vercel, cloudflare, supa] = await Promise.all([
    fetchInternal<ApiResponse<GaOk>>("/api/admin/analytics/ga4"),
    fetchInternal<ApiResponse<VercelOk>>("/api/admin/analytics/vercel"),
    fetchInternal<ApiResponse<CloudflareOk>>("/api/admin/analytics/cloudflare"),
    fetchInternal<ApiResponse<SupabaseAnalyticsOk>>("/api/admin/analytics/supabase"),
  ]);
  return { ga4, vercel, cloudflare, supa };
}

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  if (b < 1024 ** 4) return `${(b / 1024 ** 3).toFixed(2)} GB`;
  return `${(b / 1024 ** 4).toFixed(2)} TB`;
}

// Seuils Google Core Web Vitals
function vitalColor(metric: "lcp" | "fid" | "cls" | "inp", value: number | null): string {
  if (value === null) return "text-[#3D4F63]/50";
  const thresholds: Record<typeof metric, [number, number]> = {
    lcp: [2500, 4000],
    fid: [100, 300],
    cls: [0.1, 0.25],
    inp: [200, 500],
  };
  const [good, poor] = thresholds[metric];
  if (value <= good) return "text-[#3F8F62]";
  if (value <= poor) return "text-[#B8865A]";
  return "text-[#C2604B]";
}

function vitalUnit(metric: "lcp" | "fid" | "cls" | "inp"): string {
  return metric === "cls" ? "" : "ms";
}

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------

type Counter = { value: number | null; available: boolean };

const ok = (value: number | null | undefined): Counter => ({
  value: value ?? 0,
  available: true,
});
const unavailable = (): Counter => ({ value: null, available: false });

function isMissingTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "42P01" || code === "PGRST205";
}

type LeadRow = {
  id: string;
  created_at: string;
  status: string | null;
  type: string | null;
};

type ViewRow = { property_id: string };

type PropertyMini = {
  id: string;
  slug: string | null;
  title_fr?: string | null;
  title_en?: string | null;
  title_de?: string | null;
  city?: string | null;
  country?: string | null;
};

type OffmarketMini = {
  id: string;
  reference: string | null;
  title: string | null;
  city_label: string | null;
};

// ---------------------------------------------------------------------------
// Data loader — toutes les requêtes tolèrent l'absence de table
// ---------------------------------------------------------------------------

async function loadAnalytics() {
  const supabase = await createSupabaseServerClient();

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // --- Pipeline ----------------------------------------------------------
  const leadsMonthQ = supabase
    .from("leads")
    .select("id", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo.toISOString());

  const mandatesQ = supabase
    .from("mandats_recherche")
    .select("id", { count: "exact", head: true })
    .in("status", ["signed", "active"]);

  const arcovaQ = supabase
    .from("arcova_waitlist")
    .select("id", { count: "exact", head: true });

  const offmarketRequestsQ = supabase
    .from("offmarket_requests")
    .select("id", { count: "exact", head: true });

  const estimationsQ = supabase
    .from("estimations")
    .select("id", { count: "exact", head: true });

  // --- Biens -------------------------------------------------------------
  const propertiesOnlineQ = supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  const offmarketOnlineQ = supabase
    .from("properties_offmarket")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true);

  const coupsDeCoeurApimoQ = supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .eq("is_featured", true);

  const coupsDeCoeurOffmarketQ = supabase
    .from("properties_offmarket")
    .select("id", { count: "exact", head: true })
    .eq("is_published", true)
    .eq("is_coup_de_coeur", true);

  // --- Pipeline détails leads (status + 12 mois) -------------------------
  const leadsByStatusQ = supabase
    .from("leads")
    .select("id,created_at,status,type")
    .gte("created_at", new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  // --- Vues biens --------------------------------------------------------
  const viewsQ = supabase
    .from("property_views")
    .select("property_id")
    .gte("viewed_at", new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .limit(50_000);

  const [
    leadsMonthR,
    mandatesR,
    arcovaR,
    offmarketRequestsR,
    estimationsR,
    propertiesOnlineR,
    offmarketOnlineR,
    coupsApimoR,
    coupsOffR,
    leadsListR,
    viewsR,
  ] = await Promise.all([
    leadsMonthQ,
    mandatesQ,
    arcovaQ,
    offmarketRequestsQ,
    estimationsQ,
    propertiesOnlineQ,
    offmarketOnlineQ,
    coupsDeCoeurApimoQ,
    coupsDeCoeurOffmarketQ,
    leadsByStatusQ,
    viewsQ,
  ]);

  const leadsMonth = isMissingTable(leadsMonthR.error) ? unavailable() : ok(leadsMonthR.count);
  const mandates = isMissingTable(mandatesR.error) ? unavailable() : ok(mandatesR.count);
  const arcova = isMissingTable(arcovaR.error) ? unavailable() : ok(arcovaR.count);
  const offmarketRequests = isMissingTable(offmarketRequestsR.error)
    ? unavailable()
    : ok(offmarketRequestsR.count);
  const estimations = isMissingTable(estimationsR.error) ? unavailable() : ok(estimationsR.count);

  const propertiesOnline = isMissingTable(propertiesOnlineR.error)
    ? unavailable()
    : ok(propertiesOnlineR.count);
  const offmarketOnline = isMissingTable(offmarketOnlineR.error)
    ? unavailable()
    : ok(offmarketOnlineR.count);
  const coupsApimo = isMissingTable(coupsApimoR.error) ? unavailable() : ok(coupsApimoR.count);
  const coupsOff = isMissingTable(coupsOffR.error) ? unavailable() : ok(coupsOffR.count);

  // --- Aggrégat leads par status ----------------------------------------
  const leadsByStatus: Record<string, number> = {};
  const leadsByMonth: Record<string, number> = {};
  const leadsAvailable = !isMissingTable(leadsListR.error);
  const leadsRows = (leadsListR.data ?? []) as LeadRow[];
  for (const row of leadsRows) {
    const status = (row.status ?? "new").toLowerCase();
    leadsByStatus[status] = (leadsByStatus[status] ?? 0) + 1;
    const d = new Date(row.created_at);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    leadsByMonth[key] = (leadsByMonth[key] ?? 0) + 1;
  }

  // --- Top biens vus -----------------------------------------------------
  const viewsAvailable = !isMissingTable(viewsR.error);
  const viewsTotal = viewsAvailable ? (viewsR.data?.length ?? 0) : 0;
  const counts: Record<string, number> = {};
  if (viewsAvailable) {
    for (const v of (viewsR.data ?? []) as ViewRow[]) {
      counts[v.property_id] = (counts[v.property_id] ?? 0) + 1;
    }
  }
  const topEntries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Hydrater les titres (Apimo puis Off-Market en fallback)
  const topIds = topEntries.map(([id]) => id);
  let propsMap = new Map<string, PropertyMini>();
  let offMap = new Map<string, OffmarketMini>();
  if (topIds.length > 0) {
    const [apimoRes, offRes] = await Promise.all([
      supabase
        .from("properties")
        .select("id,slug,title_fr,title_en,title_de,city,country")
        .in("id", topIds),
      supabase
        .from("properties_offmarket")
        .select("id,reference,title,city_label")
        .in("id", topIds),
    ]);
    for (const row of (apimoRes.data ?? []) as PropertyMini[]) {
      propsMap.set(row.id, row);
    }
    for (const row of (offRes.data ?? []) as OffmarketMini[]) {
      offMap.set(row.id, row);
    }
  }

  const topProperties = topEntries.map(([id, count]) => {
    const apimo = propsMap.get(id);
    const off = offMap.get(id);
    const label = apimo
      ? apimo.title_fr || apimo.title_en || apimo.title_de || apimo.slug || id.slice(0, 8)
      : off
        ? `${off.reference ?? "OM"} · ${off.title ?? off.city_label ?? "Off-Market"}`
        : id.slice(0, 8);
    const href = apimo?.slug ? `/fr/biens/${apimo.slug}` : off ? `/fr/off-market/${off.id}` : null;
    return { id, label, count, href };
  });

  return {
    pipeline: {
      leadsMonth,
      mandates,
      arcova,
      offmarketRequests,
      estimations,
    },
    biens: {
      propertiesOnline,
      offmarketOnline,
      coupsApimo,
      coupsOff,
      topProperties,
      viewsTotal,
      viewsAvailable,
    },
    leads: {
      available: leadsAvailable,
      byStatus: leadsByStatus,
      byMonth: leadsByMonth,
      total: leadsRows.length,
    },
  };
}

// ---------------------------------------------------------------------------
// Sub-components (Server)
// ---------------------------------------------------------------------------

function formatCount(c: Counter): string {
  if (!c.available) return "—";
  return new Intl.NumberFormat("fr-FR").format(c.value ?? 0);
}

function StatCard({
  label,
  counter,
  Icon,
  hint,
  href,
}: {
  label: string;
  counter: Counter;
  Icon: typeof Mail;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
            {label}
          </p>
          <p className="mt-3 font-display text-4xl font-bold text-[#3D4F63]">
            {formatCount(counter)}
          </p>
        </div>
        <Icon className="size-5 text-[#B8865A]" />
      </div>
      {!counter.available ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
          Table absente
        </p>
      ) : hint ? (
        <p className="mt-3 text-xs text-[#3D4F63]/60">{hint}</p>
      ) : null}
    </>
  );

  const cls =
    "rounded-2xl border border-[#3D4F63]/15 bg-white p-5 transition-colors hover:border-[#B8865A]";

  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  Icon,
}: {
  eyebrow: string;
  title: string;
  Icon: typeof BarChart3;
}) {
  return (
    <header className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-[#3D4F63]/10 text-[#3D4F63]">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#B8865A]">
          {eyebrow}
        </p>
        <h2 className="font-display text-2xl font-bold text-[#3D4F63]">{title}</h2>
      </div>
    </header>
  );
}

const STATUS_PALETTE: Record<string, string> = {
  new: "#3D4F63",
  pending: "#B8865A",
  contacted: "#5B7B9E",
  qualified: "#A88B5F",
  won: "#3F8F62",
  lost: "#C2604B",
  archived: "#8A8A8A",
};

function statusColor(status: string): string {
  return STATUS_PALETTE[status] ?? "#8A8A8A";
}

function LeadsDonut({ data, total }: { data: Record<string, number>; total: number }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  if (total === 0) {
    return (
      <p className="text-sm text-[#3D4F63]/60">
        Pas encore de leads sur les 12 derniers mois.
      </p>
    );
  }

  const R = 56;
  const C = 2 * Math.PI * R;
  let cursor = 0;
  const segments = entries.map(([key, count]) => {
    const frac = count / total;
    const length = frac * C;
    const seg = {
      key,
      count,
      frac,
      dashArray: `${length} ${C - length}`,
      dashOffset: -cursor,
      color: statusColor(key),
    };
    cursor += length;
    return seg;
  });

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160" className="shrink-0">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#3D4F63" strokeOpacity="0.08" strokeWidth="20" />
        {segments.map((s) => (
          <circle
            key={s.key}
            cx="80"
            cy="80"
            r={R}
            fill="none"
            stroke={s.color}
            strokeWidth="20"
            strokeDasharray={s.dashArray}
            strokeDashoffset={s.dashOffset}
            transform="rotate(-90 80 80)"
          />
        ))}
        <text
          x="80"
          y="78"
          textAnchor="middle"
          fontFamily="var(--font-display, serif)"
          fontSize="28"
          fontWeight="700"
          fill="#3D4F63"
        >
          {total}
        </text>
        <text
          x="80"
          y="98"
          textAnchor="middle"
          fontFamily="var(--font-mono, monospace)"
          fontSize="9"
          letterSpacing="2"
          fill="#3D4F63"
          opacity="0.6"
        >
          LEADS
        </text>
      </svg>
      <ul className="flex-1 min-w-[200px] space-y-2">
        {entries.map(([key, count]) => (
          <li key={key} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: statusColor(key) }}
              />
              <span className="capitalize text-[#1A1F2A]">{key}</span>
            </span>
            <span className="font-mono text-xs text-[#3D4F63]/70">
              {count} · {Math.round((count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Leads12mLine({ byMonth }: { byMonth: Record<string, number> }) {
  // Calcule les 12 derniers mois (clé YYYY-MM) en chronologique
  const now = new Date();
  const months: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  const values = months.map((m) => byMonth[m] ?? 0);
  const max = Math.max(1, ...values);

  const W = 520;
  const H = 140;
  const PAD_L = 32;
  const PAD_R = 12;
  const PAD_T = 12;
  const PAD_B = 26;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;

  const pts = values.map((v, i) => {
    const x = PAD_L + (values.length === 1 ? innerW / 2 : (i * innerW) / (values.length - 1));
    const y = PAD_T + innerH - (v / max) * innerH;
    return { x, y, v, m: months[i] };
  });

  const polyline = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[420px]" role="img" aria-label="Évolution leads 12 mois">
        {/* Grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={PAD_L}
            x2={W - PAD_R}
            y1={PAD_T + innerH * t}
            y2={PAD_T + innerH * t}
            stroke="#3D4F63"
            strokeOpacity="0.08"
            strokeDasharray={t === 1 ? undefined : "2 4"}
          />
        ))}
        {/* Y axis labels (max & 0) */}
        <text x={PAD_L - 6} y={PAD_T + 4} textAnchor="end" fontFamily="var(--font-mono, monospace)" fontSize="9" fill="#3D4F63" opacity="0.6">
          {max}
        </text>
        <text x={PAD_L - 6} y={PAD_T + innerH + 3} textAnchor="end" fontFamily="var(--font-mono, monospace)" fontSize="9" fill="#3D4F63" opacity="0.6">
          0
        </text>
        {/* Polyline */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#B8865A"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Points */}
        {pts.map((p) => (
          <g key={p.m}>
            <circle cx={p.x} cy={p.y} r="3" fill="#B8865A" />
            <title>{`${p.m}: ${p.v} lead${p.v > 1 ? "s" : ""}`}</title>
          </g>
        ))}
        {/* X axis labels (mois court) */}
        {pts.map((p, i) => {
          if (i % 2 !== 0 && pts.length > 6) return null;
          const [, mm] = p.m.split("-");
          const label = new Date(Date.UTC(2024, Number(mm) - 1, 1)).toLocaleDateString("fr-FR", { month: "short" });
          return (
            <text
              key={p.m}
              x={p.x}
              y={H - 8}
              textAnchor="middle"
              fontFamily="var(--font-mono, monospace)"
              fontSize="9"
              fill="#3D4F63"
              opacity="0.6"
            >
              {label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminAnalyticsPage() {
  const [data, ext] = await Promise.all([loadAnalytics(), loadExternalAnalytics()]);
  const { ga4, vercel, cloudflare, supa } = ext;

  const ga4Ok = ga4 && ga4.ok === true ? (ga4 as GaOk) : null;
  const ga4Missing = ga4 && ga4.ok === false ? (ga4 as GaMissing) : null;
  const vercelOk = vercel && vercel.ok === true ? (vercel as VercelOk) : null;
  const vercelMissing = vercel && vercel.ok === false ? (vercel as GaMissing) : null;
  const cfOk = cloudflare && cloudflare.ok === true ? (cloudflare as CloudflareOk) : null;
  const cfMissing = cloudflare && cloudflare.ok === false ? (cloudflare as GaMissing) : null;
  const supaOk = supa && supa.ok === true ? (supa as SupabaseAnalyticsOk) : null;

  return (
    <div className="space-y-12">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
          Console MAPA
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          Analytics
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[#3D4F63]/70">
          Vue d&apos;ensemble : trafic, pipeline commercial, biens et performance technique.
          Données rafraîchies à chaque visite.
        </p>
      </header>

      {/* ===================================================== KPIs PRINCIPAUX */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Sessions · 30 j (GA4)"
          value={ga4Ok ? ga4Ok.sessions30d : null}
          Icon={Globe}
          hint={ga4Ok ? undefined : "Configurer GA4_PROPERTY_ID"}
        />
        <KpiCard
          label="Conversions · 30 j"
          value={supaOk ? supaOk.leadsCount30d : null}
          Icon={Mail}
          hint="Leads Supabase"
        />
        <KpiCard
          label="Requêtes · 30 j (CF)"
          value={cfOk ? cfOk.requests : null}
          Icon={Cloud}
          hint={cfOk ? undefined : "Configurer Cloudflare"}
        />
        <KpiCard
          label="LCP médian (Vercel)"
          value={vercelOk?.webVitals.lcp ?? null}
          Icon={Zap}
          unit="ms"
          hint={vercelOk ? undefined : "Configurer Vercel API"}
        />
      </section>

      {/* ------------------------------------------------------ A. Trafic */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section A" title="Trafic site" Icon={BarChart3} />
        <div className="grid gap-4 md:grid-cols-2">
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer noopener"
            className="group rounded-2xl border border-[#3D4F63]/15 bg-white p-6 transition-colors hover:border-[#B8865A]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  Vercel Web Analytics
                </p>
                <p className="mt-3 font-display text-xl font-bold text-[#3D4F63]">
                  Visiteurs · Pages vues · Sources
                </p>
                <p className="mt-2 text-sm text-[#3D4F63]/70">
                  Données en temps réel disponibles sur Vercel Dashboard.
                </p>
              </div>
              <ArrowUpRight className="size-5 shrink-0 text-[#B8865A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#B8865A]">
              Ouvrir le dashboard Vercel →
            </p>
          </a>

          <a
            href="https://vercel.com/dashboard/usage"
            target="_blank"
            rel="noreferrer noopener"
            className="group rounded-2xl border border-[#3D4F63]/15 bg-white p-6 transition-colors hover:border-[#B8865A]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  Cloudflare WAF
                </p>
                <p className="mt-3 font-display text-xl font-bold text-[#3D4F63]">
                  Sécurité · Bot mitigation
                </p>
                <p className="mt-2 text-sm text-[#3D4F63]/70">
                  Logs WAF, Turnstile et règles de filtrage accessibles côté Cloudflare.
                </p>
              </div>
              <ArrowUpRight className="size-5 shrink-0 text-[#B8865A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#B8865A]">
              Ouvrir Cloudflare →
            </p>
          </a>
        </div>
      </section>

      {/* ---------------------------------------------- B. Pipeline commercial */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section B" title="Pipeline commercial" Icon={Activity} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard
            label="Leads (30 j)"
            counter={data.pipeline.leadsMonth}
            Icon={Mail}
            href="/admin/leads"
          />
          <StatCard
            label="Mandats actifs"
            counter={data.pipeline.mandates}
            Icon={FileSignature}
            hint="signed + active"
            href="/admin/mandats-recherche"
          />
          <StatCard
            label="ARCOVA inscrits"
            counter={data.pipeline.arcova}
            Icon={Users}
            href="/admin/arcova"
          />
          <StatCard
            label="Off-Market demandes"
            counter={data.pipeline.offmarketRequests}
            Icon={ShieldCheck}
            href="/admin/offmarket/requests"
          />
          <StatCard
            label="Estimations"
            counter={data.pipeline.estimations}
            Icon={Sparkles}
            hint={data.pipeline.estimations.available ? "soumissions" : undefined}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
            <header className="mb-6 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  Pipeline leads · 12 mois
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-[#3D4F63]">
                  Répartition par statut
                </h3>
              </div>
              <PieIcon />
            </header>
            {data.leads.available ? (
              <LeadsDonut data={data.leads.byStatus} total={data.leads.total} />
            ) : (
              <p className="text-sm text-[#3D4F63]/60">Table absente — données indisponibles.</p>
            )}
          </article>

          <article className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
            <header className="mb-6 flex items-center justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  Évolution · 12 mois
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-[#3D4F63]">
                  Leads par mois
                </h3>
              </div>
              <LineChart className="size-5 text-[#B8865A]" />
            </header>
            {data.leads.available ? (
              <Leads12mLine byMonth={data.leads.byMonth} />
            ) : (
              <p className="text-sm text-[#3D4F63]/60">Table absente — données indisponibles.</p>
            )}
          </article>
        </div>
      </section>

      {/* ----------------------------------------------------- C. Biens */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section C" title="Biens" Icon={Building2} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Biens Apimo en ligne"
            counter={data.biens.propertiesOnline}
            Icon={Building2}
            href="/admin/properties"
          />
          <StatCard
            label="Off-Market en ligne"
            counter={data.biens.offmarketOnline}
            Icon={ShieldCheck}
            href="/admin/offmarket"
          />
          <StatCard
            label="Coups de cœur Apimo"
            counter={data.biens.coupsApimo}
            Icon={Heart}
            hint="is_featured"
          />
          <StatCard
            label="Coups de cœur Off-Market"
            counter={data.biens.coupsOff}
            Icon={Flame}
            hint="is_coup_de_coeur"
          />
        </div>

        <article className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
          <header className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Top 10 · 90 derniers jours
              </p>
              <h3 className="mt-1 font-display text-lg font-bold text-[#3D4F63]">
                Biens les plus consultés
              </h3>
              {data.biens.viewsAvailable && (
                <p className="mt-1 text-xs text-[#3D4F63]/60">
                  {data.biens.viewsTotal.toLocaleString("fr-FR")} vues totales tracked
                </p>
              )}
            </div>
            <Eye className="size-5 text-[#B8865A]" />
          </header>

          {!data.biens.viewsAvailable ? (
            <p className="rounded-xl border border-dashed border-[#3D4F63]/20 bg-[#F5EFE1] p-6 text-sm text-[#3D4F63]/70">
              Données disponibles après migration <code className="font-mono text-xs">20260512_property_views.sql</code>.
              À appliquer dans Supabase SQL Editor.
            </p>
          ) : data.biens.topProperties.length === 0 ? (
            <p className="text-sm text-[#3D4F63]/60">
              Aucune vue enregistrée pour le moment.
            </p>
          ) : (
            <ol className="divide-y divide-[#3D4F63]/10">
              {data.biens.topProperties.map((p, i) => (
                <li key={p.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63]/50 w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      {p.href ? (
                        <Link
                          href={p.href}
                          className="block truncate font-sans text-sm text-[#1A1F2A] hover:text-[#B8865A]"
                        >
                          {p.label}
                        </Link>
                      ) : (
                        <span className="block truncate font-sans text-sm text-[#1A1F2A]">
                          {p.label}
                        </span>
                      )}
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
                        {p.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                  <span className="font-display text-xl font-bold text-[#3D4F63]">
                    {p.count}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>

      {/* ------------------------------------------------- D. Performance */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section D" title="Performance" Icon={Gauge} />

        <div className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              Statut API
            </p>
            <h3 className="mt-1 mb-4 font-display text-lg font-bold text-[#3D4F63]">
              /api/health en temps réel
            </h3>
            <AnalyticsHealthPill />
            <p className="mt-4 text-xs text-[#3D4F63]/60">
              Polling toutes les 30 s. Vert = OK, ambre = DB partielle, rouge = erreur.
            </p>
          </article>

          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer noopener"
            className="group rounded-2xl border border-[#3D4F63]/15 bg-white p-6 transition-colors hover:border-[#B8865A]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  Web Vitals
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-[#3D4F63]">
                  Vercel Speed Insights
                </h3>
                <p className="mt-2 text-sm text-[#3D4F63]/70">
                  LCP, INP, CLS et FID réels mesurés en production.
                </p>
              </div>
              <ArrowUpRight className="size-5 shrink-0 text-[#B8865A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </div>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#B8865A]">
              Ouvrir Speed Insights →
            </p>
          </a>

          <article className="rounded-2xl border border-dashed border-[#3D4F63]/25 bg-[#F5EFE1] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              Erreurs 4xx / 5xx · 24 h
            </p>
            <h3 className="mt-1 font-display text-lg font-bold text-[#3D4F63]">
              Compteur erreurs
            </h3>
            <p className="mt-3 text-sm text-[#3D4F63]/70">
              Disponible une fois Sentry actif (phase B).
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
              À venir
            </p>
          </article>
        </div>
      </section>

      {/* =================================================== E. Google Analytics 4 */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section E" title="Trafic GA4" Icon={Globe} />

        {ga4Missing && ga4Missing.reason === "missing_token" ? (
          <TokenMissingCard
            title="Google Analytics 4 Data API"
            envVars={["GA4_PROPERTY_ID", "GA4_SERVICE_ACCOUNT_KEY"]}
            configUrl={ga4Missing.configUrl ?? "https://console.cloud.google.com/iam-admin/serviceaccounts"}
            instructions={ga4Missing.instructions}
          />
        ) : ga4Missing ? (
          <div className="rounded-lg border border-[#C2604B]/30 bg-white p-6 text-sm text-[#C2604B]">
            Erreur GA4 : {ga4Missing.message ?? ga4Missing.reason}
          </div>
        ) : ga4Ok ? (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard label="Sessions · 7 j" value={ga4Ok.sessions7d} Icon={Activity} />
              <KpiCard label="Sessions · 30 j" value={ga4Ok.sessions30d} Icon={Globe} />
              <KpiCard
                label="Mobile · 30 j"
                value={ga4Ok.mobileVsDesktop.mobile}
                Icon={Smartphone}
              />
              <KpiCard
                label="Desktop · 30 j"
                value={ga4Ok.mobileVsDesktop.desktop}
                Icon={BarChart3}
              />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
                <h3 className="mb-4 font-display text-lg font-bold text-[#3D4F63]">Top pages</h3>
                <TopList items={ga4Ok.topPages.slice(0, 10)} unit="vues" />
              </article>
              <article className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
                <h3 className="mb-4 font-display text-lg font-bold text-[#3D4F63]">Top pays</h3>
                <TopList items={ga4Ok.topCountries.slice(0, 10)} unit="sessions" />
              </article>
            </div>
            <article className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
              <h3 className="mb-4 font-display text-lg font-bold text-[#3D4F63]">
                Mobile vs Desktop · 30 j
              </h3>
              <PieChart
                slices={[
                  { key: "mobile", value: ga4Ok.mobileVsDesktop.mobile, color: "#B8865A" },
                  { key: "desktop", value: ga4Ok.mobileVsDesktop.desktop, color: "#3D4F63" },
                  { key: "tablet", value: ga4Ok.mobileVsDesktop.tablet, color: "#5B7B9E" },
                ]}
                totalLabel="Sessions"
              />
            </article>
          </>
        ) : (
          <p className="text-sm text-[#3D4F63]/60">Chargement GA4…</p>
        )}
      </section>

      {/* =================================================== F. Vercel Web Vitals */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section F" title="Web Vitals (Vercel)" Icon={Zap} />

        {vercelMissing && vercelMissing.reason === "missing_token" ? (
          <TokenMissingCard
            title="Vercel REST API · Web Insights"
            envVars={["VERCEL_API_TOKEN", "VERCEL_PROJECT_ID"]}
            configUrl={vercelMissing.configUrl ?? "https://vercel.com/account/tokens"}
            instructions={vercelMissing.instructions}
          />
        ) : vercelMissing ? (
          <div className="rounded-lg border border-[#B8865A]/40 bg-white p-6 text-sm text-[#3D4F63]/70">
            API Vercel indisponible : {vercelMissing.message ?? vercelMissing.reason}. Consulter
            le dashboard Vercel directement.
          </div>
        ) : vercelOk ? (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  LCP (p75)
                </p>
                <p
                  className={`mt-3 font-display text-4xl font-bold ${vitalColor("lcp", vercelOk.webVitals.lcp)}`}
                >
                  {vercelOk.webVitals.lcp ?? "—"}
                  <span className="ml-1 text-base font-normal">{vitalUnit("lcp")}</span>
                </p>
                <p className="mt-2 text-xs text-[#3D4F63]/60">≤ 2500 ms = bon</p>
              </div>
              <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  FID (p75)
                </p>
                <p
                  className={`mt-3 font-display text-4xl font-bold ${vitalColor("fid", vercelOk.webVitals.fid)}`}
                >
                  {vercelOk.webVitals.fid ?? "—"}
                  <span className="ml-1 text-base font-normal">{vitalUnit("fid")}</span>
                </p>
                <p className="mt-2 text-xs text-[#3D4F63]/60">≤ 100 ms = bon</p>
              </div>
              <div className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  CLS (p75)
                </p>
                <p
                  className={`mt-3 font-display text-4xl font-bold ${vitalColor("cls", vercelOk.webVitals.cls)}`}
                >
                  {vercelOk.webVitals.cls ?? "—"}
                </p>
                <p className="mt-2 text-xs text-[#3D4F63]/60">≤ 0.1 = bon</p>
              </div>
              <KpiCard
                label="Pages vues · 30 j"
                value={vercelOk.totalViews}
                Icon={Eye}
              />
            </div>
            {vercelOk.topReferrers.length > 0 || vercelOk.topPages.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {vercelOk.topReferrers.length > 0 ? (
                  <article className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
                    <h3 className="mb-4 font-display text-lg font-bold text-[#3D4F63]">
                      Top referrers
                    </h3>
                    <TopList items={vercelOk.topReferrers} unit="visites" />
                  </article>
                ) : null}
                {vercelOk.topPages.length > 0 ? (
                  <article className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
                    <h3 className="mb-4 font-display text-lg font-bold text-[#3D4F63]">
                      Top pages (Vercel)
                    </h3>
                    <TopList items={vercelOk.topPages} unit="vues" />
                  </article>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-[#3D4F63]/60">Chargement Vercel…</p>
        )}
      </section>

      {/* =================================================== G. Cloudflare */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section G" title="Cloudflare · 30 j" Icon={Cloud} />

        {cfMissing && cfMissing.reason === "missing_token" ? (
          <TokenMissingCard
            title="Cloudflare GraphQL Analytics"
            envVars={["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_ZONE_ID"]}
            configUrl={cfMissing.configUrl ?? "https://dash.cloudflare.com/profile/api-tokens"}
            instructions={cfMissing.instructions}
          />
        ) : cfMissing ? (
          <div className="rounded-lg border border-[#C2604B]/30 bg-white p-6 text-sm text-[#C2604B]">
            Erreur Cloudflare : {cfMissing.message ?? cfMissing.reason}
          </div>
        ) : cfOk ? (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <KpiCard label="Requêtes · 30 j" value={cfOk.requests} Icon={Activity} />
              <KpiCard
                label="Bande passante"
                value={formatBytes(cfOk.bandwidth)}
                Icon={Cloud}
              />
              <KpiCard
                label="Cache hit"
                value={cfOk.cacheHit}
                Icon={Zap}
                unit="%"
              />
              <KpiCard
                label="Menaces bloquées"
                value={cfOk.threats}
                Icon={ShieldCheck}
              />
            </div>
            {cfOk.daily.length > 0 ? (
              <article className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
                <h3 className="mb-4 font-display text-lg font-bold text-[#3D4F63]">
                  Requêtes journalières
                </h3>
                <AnalyticsLineChart
                  data={cfOk.daily.map((d) => ({ date: d.date, value: d.requests }))}
                  label="requêtes"
                />
              </article>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-[#3D4F63]/60">Chargement Cloudflare…</p>
        )}
      </section>

      {/* =================================================== H. Supabase · agrégats */}
      <section className="space-y-6">
        <SectionHeader eyebrow="Section H" title="Conversion & recherches" Icon={Search} />

        {supaOk ? (
          <>
            <article className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
              <header className="mb-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                  Conversion daily · 30 j
                </p>
                <h3 className="mt-1 font-display text-lg font-bold text-[#3D4F63]">
                  Leads par jour
                </h3>
              </header>
              <AnalyticsLineChart
                data={supaOk.conversionDaily.map((d) => ({ date: d.date, value: d.count }))}
                label="leads"
              />
            </article>

            <article className="rounded-lg border border-[#3D4F63]/15 bg-white p-6">
              <header className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg font-bold text-[#3D4F63]">
                  Top recherches IA
                </h3>
                <Search className="size-5 text-[#B8865A]" />
              </header>
              {supaOk.searchLogsAvailable ? (
                <TopList
                  items={supaOk.topSearchTerms}
                  unit="requêtes"
                  emptyLabel="Aucune recherche enregistrée."
                />
              ) : (
                <p className="rounded-md border border-dashed border-[#3D4F63]/20 bg-[#F5EFE1] p-4 text-sm text-[#3D4F63]/70">
                  Table <code className="font-mono text-xs">chatbot_logs</code> absente.
                  Activer en créant la table dans Supabase pour suivre les requêtes
                  utilisateur du chatbot Eléna.
                </p>
              )}
            </article>
          </>
        ) : (
          <p className="text-sm text-[#3D4F63]/60">Chargement Supabase…</p>
        )}
      </section>
    </div>
  );
}

// Petit picto donut inline pour éviter un import en plus
function PieIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#B8865A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-9-9v9z" />
      <path d="M21 12A9 9 0 0 0 12 3v9z" />
    </svg>
  );
}
