import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export const dynamic = "force-dynamic";
export const revalidate = 600;

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

const TARGET_PATHS = ["/fr", "/fr/biens", "/fr/services/estimer"] as const;
const STRATEGIES = ["mobile", "desktop"] as const;

type Strategy = (typeof STRATEGIES)[number];

type Scores = {
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
  bestPractices: number | null;
};

type WebVitals = {
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
};

type PsiResult = {
  url: string;
  strategy: Strategy;
  scores: Scores;
  webVitals: WebVitals;
  error?: string;
};

type AuthResult = { ok: true } | { ok: false; status: number; body: { ok: false; reason: string } };

async function requireAdmin(): Promise<AuthResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { ok: false, status: 401, body: { ok: false, reason: "unauthorized" } };
    }
    return { ok: true };
  } catch {
    return { ok: false, status: 401, body: { ok: false, reason: "unauthorized" } };
  }
}

function baseUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.trim().length > 0) {
    return env.replace(/\/$/, "");
  }
  return "https://mapa-property-liard.vercel.app";
}

function categoryScore(audit: Record<string, unknown> | undefined): number | null {
  if (!audit) return null;
  const raw = (audit as { score?: number | null }).score;
  if (raw === null || raw === undefined) return null;
  return Math.round(raw * 100);
}

function auditValue(
  audits: Record<string, { numericValue?: number | null }> | undefined,
  key: string,
): number | null {
  const node = audits?.[key];
  if (!node) return null;
  const v = node.numericValue;
  return typeof v === "number" ? v : null;
}

async function fetchPsi(targetUrl: string, strategy: Strategy): Promise<PsiResult> {
  const params = new URLSearchParams();
  params.set("url", targetUrl);
  params.set("strategy", strategy);
  params.append("category", "performance");
  params.append("category", "accessibility");
  params.append("category", "seo");
  params.append("category", "best-practices");
  const apiKey = process.env.PSI_API_KEY;
  if (apiKey) params.set("key", apiKey);

  const endpoint = `${PSI_ENDPOINT}?${params.toString()}`;

  try {
    const res = await fetch(endpoint, {
      // PSI peut être lent (40s+) — on laisse Next gérer le timeout par défaut.
      next: { revalidate: 600 },
    });
    if (!res.ok) {
      return {
        url: targetUrl,
        strategy,
        scores: { performance: null, accessibility: null, seo: null, bestPractices: null },
        webVitals: { lcp: null, fid: null, cls: null, fcp: null, ttfb: null },
        error: `psi_http_${res.status}`,
      };
    }
    const json = (await res.json()) as {
      lighthouseResult?: {
        categories?: {
          performance?: { score?: number | null };
          accessibility?: { score?: number | null };
          seo?: { score?: number | null };
          "best-practices"?: { score?: number | null };
        };
        audits?: Record<string, { numericValue?: number | null }>;
      };
    };
    const cats = json.lighthouseResult?.categories;
    const audits = json.lighthouseResult?.audits;

    return {
      url: targetUrl,
      strategy,
      scores: {
        performance: categoryScore(cats?.performance),
        accessibility: categoryScore(cats?.accessibility),
        seo: categoryScore(cats?.seo),
        bestPractices: categoryScore(cats?.["best-practices"]),
      },
      webVitals: {
        lcp: auditValue(audits, "largest-contentful-paint"),
        // PSI ne renvoie plus FID — on tente max-potential-fid comme proxy.
        fid: auditValue(audits, "max-potential-fid"),
        cls: auditValue(audits, "cumulative-layout-shift"),
        fcp: auditValue(audits, "first-contentful-paint"),
        ttfb: auditValue(audits, "server-response-time"),
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return {
      url: targetUrl,
      strategy,
      scores: { performance: null, accessibility: null, seo: null, bestPractices: null },
      webVitals: { lcp: null, fid: null, cls: null, fcp: null, ttfb: null },
      error: message,
    };
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const root = baseUrl();
  const tasks: Promise<PsiResult>[] = [];
  for (const path of TARGET_PATHS) {
    const url = `${root}${path}`;
    for (const strategy of STRATEGIES) {
      tasks.push(fetchPsi(url, strategy));
    }
  }

  const results = await Promise.all(tasks);

  return NextResponse.json({
    ok: true,
    fetchedAt: new Date().toISOString(),
    keyConfigured: Boolean(process.env.PSI_API_KEY),
    results,
  });
}
