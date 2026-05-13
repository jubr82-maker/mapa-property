import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export const dynamic = "force-dynamic";
export const revalidate = 300;

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

const SIGNUP_URL = "https://sentry.io/signup/";
const SETUP_INSTRUCTIONS =
  "Créer un projet sentry.io (Next.js), puis ajouter SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, SENTRY_AUTH_TOKEN (Settings → Auth Tokens, scopes project:read + event:read), SENTRY_ORG (slug) et SENTRY_PROJECT (slug) dans Vercel env vars.";

type SentryIssue = {
  id: string;
  title: string;
  shortId?: string;
  count?: string;
  userCount?: number;
  level?: string;
  permalink?: string;
  lastSeen?: string;
  status?: string;
};

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const token = process.env.SENTRY_AUTH_TOKEN;
  const org = process.env.SENTRY_ORG;
  const project = process.env.SENTRY_PROJECT;

  if (!token || !org || !project) {
    return NextResponse.json({
      ok: false,
      reason: "not_configured",
      signupUrl: SIGNUP_URL,
      instructions: SETUP_INSTRUCTIONS,
      missing: {
        token: !token,
        org: !org,
        project: !project,
      },
    });
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  try {
    const now = Math.floor(Date.now() / 1000);
    const since = now - 24 * 60 * 60;

    // Stats v2 — événements reçus 24h
    const statsUrl = `https://sentry.io/api/0/projects/${org}/${project}/stats_v2/?stat=received&since=${since}&until=${now}&interval=1h`;

    // Issues non résolues, triées par fréquence
    const issuesUrl = `https://sentry.io/api/0/projects/${org}/${project}/issues/?query=is:unresolved&sort=freq&limit=10`;

    const [statsRes, issuesRes] = await Promise.all([
      fetch(statsUrl, { headers, next: { revalidate: 300 } }),
      fetch(issuesUrl, { headers, next: { revalidate: 300 } }),
    ]);

    if (statsRes.status === 401 || issuesRes.status === 401) {
      return NextResponse.json({
        ok: false,
        reason: "invalid_token",
        signupUrl: SIGNUP_URL,
        instructions: SETUP_INSTRUCTIONS,
      });
    }

    let last24h = 0;
    let errorsCount = 0;
    if (statsRes.ok) {
      type StatsResponse = { groups?: { totals?: { "sum(quantity)"?: number } }[] };
      const statsJson = (await statsRes.json()) as StatsResponse;
      const totals = statsJson.groups?.[0]?.totals;
      const sum = totals?.["sum(quantity)"];
      if (typeof sum === "number") {
        last24h = sum;
        errorsCount = sum;
      }
    }

    let topIssues: SentryIssue[] = [];
    let unresolvedCount = 0;
    if (issuesRes.ok) {
      const issuesJson = (await issuesRes.json()) as SentryIssue[];
      topIssues = (Array.isArray(issuesJson) ? issuesJson : []).slice(0, 10).map((i) => ({
        id: i.id,
        title: i.title,
        shortId: i.shortId,
        count: i.count,
        userCount: i.userCount,
        level: i.level,
        permalink: i.permalink,
        lastSeen: i.lastSeen,
        status: i.status,
      }));
      unresolvedCount = topIssues.length;
      // Header X-Hits indique le total des résultats si présent
      const xHits = issuesRes.headers.get("x-hits");
      if (xHits) {
        const parsed = Number(xHits);
        if (Number.isFinite(parsed)) unresolvedCount = parsed;
      }
    }

    return NextResponse.json({
      ok: true,
      fetchedAt: new Date().toISOString(),
      errorsCount,
      last24h,
      topIssues,
      unresolvedCount,
      org,
      project,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({
      ok: false,
      reason: "api_error",
      message,
      signupUrl: SIGNUP_URL,
    });
  }
}
