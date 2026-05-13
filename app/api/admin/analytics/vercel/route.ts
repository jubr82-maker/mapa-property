import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const CONFIG_URL = "https://vercel.com/account/tokens";
const INSTRUCTIONS =
  "Créer un token Vercel (Account Settings → Tokens), scope 'Full Account'. Récupérer aussi l'ID du projet depuis vercel.com/[team]/[project]/settings (champ 'Project ID'). Définir VERCEL_API_TOKEN, VERCEL_PROJECT_ID et optionnellement VERCEL_TEAM_ID dans Vercel env vars.";

async function requireAdmin() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    return true;
  } catch {
    return false;
  }
}

type VitalEntry = { p75?: number; value?: number };

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return NextResponse.json({
      ok: false,
      reason: "missing_token",
      configUrl: CONFIG_URL,
      instructions: INSTRUCTIONS,
    });
  }

  const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const until = Date.now();

  try {
    const headers = { Authorization: `Bearer ${token}` };

    // L'API Web Insights est partiellement non documentée publiquement.
    // On essaie plusieurs endpoints, et on dégrade gracieusement si l'API change.
    const [vitalsRes, viewsRes, referrersRes, topPagesRes] = await Promise.all([
      fetch(
        `https://vercel.com/api/web/insights/${projectId}/vitals${teamQuery}${teamQuery ? "&" : "?"}from=${since}&to=${until}`,
        { headers, cache: "no-store" },
      ).catch(() => null),
      fetch(
        `https://vercel.com/api/web/insights/${projectId}/views${teamQuery}${teamQuery ? "&" : "?"}from=${since}&to=${until}`,
        { headers, cache: "no-store" },
      ).catch(() => null),
      fetch(
        `https://vercel.com/api/web/insights/${projectId}/referrers${teamQuery}${teamQuery ? "&" : "?"}from=${since}&to=${until}&limit=10`,
        { headers, cache: "no-store" },
      ).catch(() => null),
      fetch(
        `https://vercel.com/api/web/insights/${projectId}/paths${teamQuery}${teamQuery ? "&" : "?"}from=${since}&to=${until}&limit=10`,
        { headers, cache: "no-store" },
      ).catch(() => null),
    ]);

    const safeJson = async (r: Response | null) => {
      if (!r || !r.ok) return null;
      try {
        return await r.json();
      } catch {
        return null;
      }
    };

    const vitals = await safeJson(vitalsRes);
    const views = await safeJson(viewsRes);
    const referrers = await safeJson(referrersRes);
    const topPages = await safeJson(topPagesRes);

    const pickVital = (key: string): number | null => {
      if (!vitals || typeof vitals !== "object") return null;
      const v = (vitals as Record<string, VitalEntry | undefined>)[key];
      if (!v) return null;
      return v.p75 ?? v.value ?? null;
    };

    const lcp = pickVital("LCP");
    const fid = pickVital("FID");
    const cls = pickVital("CLS");
    const inp = pickVital("INP");

    const totalViews =
      (views && typeof views === "object" && "total" in views
        ? Number((views as { total?: number }).total ?? 0)
        : 0) || 0;

    const topReferrers =
      Array.isArray((referrers as { data?: unknown[] })?.data)
        ? ((referrers as { data: { referrer?: string; count?: number }[] }).data ?? []).map((r) => ({
            key: r.referrer ?? "—",
            value: Number(r.count ?? 0),
          }))
        : [];

    const pages =
      Array.isArray((topPages as { data?: unknown[] })?.data)
        ? ((topPages as { data: { path?: string; count?: number }[] }).data ?? []).map((p) => ({
            key: p.path ?? "—",
            value: Number(p.count ?? 0),
          }))
        : [];

    // Si tout est null/vide → l'API a changé, on signale gracieusement
    if (lcp === null && fid === null && cls === null && totalViews === 0 && pages.length === 0) {
      return NextResponse.json({
        ok: false,
        reason: "api_error",
        message:
          "L'API Vercel Web Insights ne renvoie pas les données attendues (endpoint non public). Consulter le dashboard Vercel directement.",
      });
    }

    return NextResponse.json({
      ok: true,
      webVitals: { lcp, fid, cls, inp },
      totalViews,
      topReferrers,
      topPages: pages,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({ ok: false, reason: "api_error", message });
  }
}
