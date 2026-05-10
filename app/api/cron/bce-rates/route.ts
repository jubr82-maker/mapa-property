import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface SDWPayload {
  dataSets?: Array<{
    series?: Record<string, { observations?: Record<string, number[]> }>;
  }>;
}

function extractRate(data: SDWPayload): number | null {
  try {
    const series = data.dataSets?.[0]?.series;
    if (!series) return null;
    const firstKey = Object.keys(series)[0];
    if (!firstKey) return null;
    const obs = series[firstKey].observations;
    if (!obs) return null;
    const obsKey = Object.keys(obs)[0];
    if (!obsKey) return null;
    const value = obs[obsKey][0];
    return typeof value === "number" ? value : null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url =
    "https://sdw-wsrest.ecb.europa.eu/service/data/MIR/M.LU.B.A2C.AM.R.A.2240.EUR.N?lastNObservations=1&format=jsondata";
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    return NextResponse.json({ error: "ECB fetch failed", status: res.status }, { status: 502 });
  }

  const data = (await res.json()) as SDWPayload;
  const rate = extractRate(data);
  if (rate === null) {
    return NextResponse.json({ error: "Parse failed" }, { status: 502 });
  }

  // Stub si pas de service role key (Julien doit fournir SUPABASE_SERVICE_ROLE_KEY)
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("[cron/bce-rates] stubbed (no service role key) — rate:", rate);
    return NextResponse.json({ ok: true, stubbed: true, rate });
  }

  // Insert via service role bypass RLS
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { error } = await sb.from("interest_rates").insert({
      source: "BCE",
      series: "MIR.M.LU.B.A2C.AM.R.A.2240.EUR.N",
      rate,
      captured_at: new Date().toISOString(),
    } as never);
    if (error) {
      console.error("[cron/bce-rates] insert", error.message);
      return NextResponse.json({ ok: false, rate, error: error.message }, { status: 500 });
    }
  } catch (e) {
    console.error("[cron/bce-rates] insert caught", e);
    return NextResponse.json({ ok: false, rate, error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rate });
}
