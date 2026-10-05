// Taux BCE mensuel (deplace depuis app/api/cron/bce-rates, oct. 2026) :
// meme source, meme serie, meme insertion dans interest_rates. Appele par
// la tache quotidienne le 1er du mois et par l'ancienne route.
import { supabaseService } from "@/lib/supabase-service";

const ECB_URL =
  "https://sdw-wsrest.ecb.europa.eu/service/data/MIR/M.LU.B.A2C.AM.R.A.2240.EUR.N?lastNObservations=1&format=jsondata";

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

export async function refreshBceRate(): Promise<{ ok: boolean; detail: string; rate?: number }> {
  const res = await fetch(ECB_URL, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (!res.ok) return { ok: false, detail: `ecb_http_${res.status}` };
  const rate = extractRate((await res.json()) as SDWPayload);
  if (rate === null) return { ok: false, detail: "parse_failed" };
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: true, detail: "stubbed", rate };
  const { error } = await supabaseService().from("interest_rates").insert({
    source: "BCE",
    series: "MIR.M.LU.B.A2C.AM.R.A.2240.EUR.N",
    rate,
    captured_at: new Date().toISOString(),
  } as never);
  if (error) {
    console.error("[bce] insertion", { code: error.code });
    return { ok: false, detail: "db_error", rate };
  }
  return { ok: true, detail: "inserted", rate };
}
