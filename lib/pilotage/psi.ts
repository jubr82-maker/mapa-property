// Mesures PageSpeed Insights (oct. 2026). JAMAIS lancees a l'ouverture
// d'une page : une fois par jour par la tache planifiee, et a la demande
// par un bouton (action admin). Cle dediee PAGESPEED_API_KEY obligatoire :
// sans cle, aucune mesure (le quota anonyme renvoie 429). Resultats dates
// dans public.psi_runs. INP remplace FID : donnee terrain (CrUX) quand
// Google en dispose, sinon Total Blocking Time en laboratoire.
import { supabaseService } from "@/lib/supabase-service";
import { PSI_PATHS, PSI_STRATEGIES } from "@/lib/pilotage/config";
import { extractLcpDiagnosis, type LcpDiagnosis } from "@/lib/pilotage/lcp-diagnosis";

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export type PsiTrigger = "cron" | "manual";

export type PsiRow = {
  created_at: string;
  trigger: string;
  url: string;
  strategy: string;
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
  best_practices: number | null;
  lcp_ms: number | null;
  cls: number | null;
  tbt_ms: number | null;
  fcp_ms: number | null;
  ttfb_ms: number | null;
  field_lcp_ms: number | null;
  field_inp_ms: number | null;
  field_cls: number | null;
  /** Cause du LCP (SQL 19 : colonne lcp_diagnosis), absente avant. */
  lcp_diagnosis?: LcpDiagnosis | null;
  error: string | null;
};

export function psiConfigured(): boolean {
  return Boolean(process.env.PAGESPEED_API_KEY?.trim());
}

function siteRoot(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (env && env.length > 0 ? env : "https://beta.mapaproperty.lu").replace(/\/$/, "");
}

type PsiJson = {
  lighthouseResult?: {
    categories?: Record<string, { score?: number | null } | undefined>;
    audits?: Record<string, { numericValue?: number | null } | undefined>;
  };
  loadingExperience?: { metrics?: Record<string, { percentile?: number } | undefined> };
};

const score = (c?: { score?: number | null }) => (typeof c?.score === "number" ? Math.round(c.score * 100) : null);
const audit = (j: PsiJson, k: string) => {
  const v = j.lighthouseResult?.audits?.[k]?.numericValue;
  return typeof v === "number" ? v : null;
};
const field = (j: PsiJson, k: string) => {
  const v = j.loadingExperience?.metrics?.[k]?.percentile;
  return typeof v === "number" ? v : null;
};

async function measure(url: string, strategy: string, trigger: PsiTrigger): Promise<Omit<PsiRow, "created_at">> {
  const params = new URLSearchParams({ url, strategy, key: process.env.PAGESPEED_API_KEY!.trim() });
  for (const c of ["performance", "accessibility", "seo", "best-practices"]) params.append("category", c);
  // Titres des pistes d'amelioration en francais (affiches dans Sante du site).
  params.append("locale", "fr");
  const base = { trigger, url, strategy };
  const empty = {
    performance: null, accessibility: null, seo: null, best_practices: null,
    lcp_ms: null, cls: null, tbt_ms: null, fcp_ms: null, ttfb_ms: null,
    field_lcp_ms: null, field_inp_ms: null, field_cls: null,
  };
  try {
    const res = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return { ...base, ...empty, error: `psi_http_${res.status}` };
    const j = (await res.json()) as PsiJson;
    const cats = j.lighthouseResult?.categories ?? {};
    const fieldCls = field(j, "CUMULATIVE_LAYOUT_SHIFT_SCORE");
    return {
      ...base,
      performance: score(cats.performance),
      accessibility: score(cats.accessibility),
      seo: score(cats.seo),
      best_practices: score(cats["best-practices"]),
      lcp_ms: audit(j, "largest-contentful-paint"),
      cls: audit(j, "cumulative-layout-shift"),
      tbt_ms: audit(j, "total-blocking-time"),
      fcp_ms: audit(j, "first-contentful-paint"),
      ttfb_ms: audit(j, "server-response-time"),
      field_lcp_ms: field(j, "LARGEST_CONTENTFUL_PAINT_MS"),
      field_inp_ms: field(j, "INTERACTION_TO_NEXT_PAINT"),
      field_cls: fieldCls === null ? null : fieldCls / 100,
      lcp_diagnosis: extractLcpDiagnosis(j),
      error: null,
    };
  } catch (e) {
    return { ...base, ...empty, error: e instanceof Error ? e.message.slice(0, 80) : "unknown_error" };
  }
}

/** Lance les mesures (pages x strategies) et les enregistre. */
export async function runPsiMeasurements(trigger: PsiTrigger): Promise<{ ok: boolean; detail: string }> {
  if (!psiConfigured()) return { ok: false, detail: "not_configured" };
  const root = siteRoot();
  const rows = await Promise.all(
    PSI_PATHS.flatMap((p) => PSI_STRATEGIES.map((s) => measure(`${root}${p}`, s, trigger))),
  );
  let { error } = await supabaseService().from("psi_runs").insert(rows);
  // Colonne lcp_diagnosis absente (SQL 19 pas encore execute) : mesures
  // enregistrees sans la cause du LCP plutot que perdues.
  if (error && (error.code === "PGRST204" || error.code === "42703")) {
    ({ error } = await supabaseService().from("psi_runs").insert(rows.map((r) => {
      const copy: Omit<PsiRow, "created_at"> = { ...r };
      delete copy.lcp_diagnosis;
      return copy;
    })));
  }
  if (error) return { ok: false, detail: `db_${error.code ?? "error"}` };
  const failed = rows.filter((r) => r.error).length;
  return { ok: failed === 0, detail: `${rows.length - failed}/${rows.length}` };
}

export async function loadPsiHistory(days = 90): Promise<{ available: boolean; rows: PsiRow[] }> {
  const { data, error } = await supabaseService()
    .from("psi_runs")
    .select("*")
    .gte("created_at", new Date(Date.now() - days * 86400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(1000);
  return { available: !error, rows: (data ?? []) as PsiRow[] };
}

export async function lastManualRunAt(): Promise<string | null> {
  const { data } = await supabaseService()
    .from("psi_runs")
    .select("created_at")
    .eq("trigger", "manual")
    .order("created_at", { ascending: false })
    .limit(1);
  return (data?.[0] as { created_at?: string } | undefined)?.created_at ?? null;
}
