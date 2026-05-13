import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const CONFIG_URL = "https://console.cloud.google.com/iam-admin/serviceaccounts";
const INSTRUCTIONS =
  "Créer un Service Account avec rôle 'Viewer' sur la propriété GA4, télécharger la clé JSON, et la coller en une seule ligne dans la variable GA4_SERVICE_ACCOUNT_KEY (Vercel env). Renseigner aussi GA4_PROPERTY_ID (chiffres uniquement, depuis l'admin GA4 → Property settings).";

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

type GaRow = { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] };

function rowsToList(rows: GaRow[] | undefined) {
  return (rows ?? []).map((r) => ({
    key: r.dimensionValues?.[0]?.value ?? "—",
    value: Number(r.metricValues?.[0]?.value ?? 0),
  }));
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const propertyId = process.env.GA4_PROPERTY_ID;
  const rawKey = process.env.GA4_SERVICE_ACCOUNT_KEY;

  if (!propertyId || !rawKey) {
    return NextResponse.json({
      ok: false,
      reason: "missing_token",
      configUrl: CONFIG_URL,
      instructions: INSTRUCTIONS,
    });
  }

  try {
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(rawKey);
    } catch {
      // Support des clés base64-encodées
      const decoded = Buffer.from(rawKey, "base64").toString("utf-8");
      credentials = JSON.parse(decoded);
    }

    // Import dynamique → ne casse pas le build si le package vient à disparaître
    const mod = await import("@google-analytics/data").catch(() => null);
    if (!mod) {
      return NextResponse.json({
        ok: false,
        reason: "package_missing",
        message: "@google-analytics/data n'est pas installé.",
      });
    }
    const { BetaAnalyticsDataClient } = mod;
    const client = new BetaAnalyticsDataClient({ credentials });

    const property = `properties/${propertyId}`;

    const [sessions7d, sessions30d, topPages, topCountries, deviceSplit, conversionDaily] =
      await Promise.all([
        client.runReport({
          property,
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          metrics: [{ name: "sessions" }],
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          metrics: [{ name: "sessions" }],
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "pagePath" }],
          metrics: [{ name: "screenPageViews" }],
          orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
          limit: 10,
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "country" }],
          metrics: [{ name: "sessions" }],
          orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
          limit: 10,
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "deviceCategory" }],
          metrics: [{ name: "sessions" }],
        }),
        client.runReport({
          property,
          dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "conversions" }],
          orderBys: [{ dimension: { dimensionName: "date" } }],
        }),
      ]);

    const totalSessions7d = Number(sessions7d[0]?.rows?.[0]?.metricValues?.[0]?.value ?? 0);
    const totalSessions30d = Number(sessions30d[0]?.rows?.[0]?.metricValues?.[0]?.value ?? 0);

    const deviceRows = rowsToList(deviceSplit[0]?.rows as GaRow[] | undefined);
    let mobile = 0;
    let desktop = 0;
    let tablet = 0;
    for (const r of deviceRows) {
      const k = r.key.toLowerCase();
      if (k === "mobile") mobile += r.value;
      else if (k === "desktop") desktop += r.value;
      else if (k === "tablet") tablet += r.value;
    }

    return NextResponse.json({
      ok: true,
      sessions7d: totalSessions7d,
      sessions30d: totalSessions30d,
      topPages: rowsToList(topPages[0]?.rows as GaRow[] | undefined),
      topCountries: rowsToList(topCountries[0]?.rows as GaRow[] | undefined),
      mobileVsDesktop: { mobile, desktop, tablet },
      conversionDaily: rowsToList(conversionDaily[0]?.rows as GaRow[] | undefined),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_error";
    return NextResponse.json({
      ok: false,
      reason: "api_error",
      message,
    });
  }
}
