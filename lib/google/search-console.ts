// Google Search Console (oct. 2026) : API Search Analytics, lecture seule.
// Propriete de domaine sc-domain:mapaproperty.lu (lib/pilotage/config).
import { googleAccessToken, readServiceAccount, SCOPE_SEARCH_CONSOLE } from "@/lib/google/service-account";
import { SEARCH_CONSOLE_SITE } from "@/lib/pilotage/config";

export type QueryRow = { query: string; clicks: number; impressions: number; ctr: number; position: number };

export function searchConsoleConfigured(): boolean {
  return Boolean(readServiceAccount());
}

/** Requetes (dimension query) entre deux dates incluses, format AAAA-MM-JJ. */
export async function fetchQueries(startDate: string, endDate: string, rowLimit = 1000): Promise<QueryRow[]> {
  const token = await googleAccessToken(SCOPE_SEARCH_CONSOLE);
  if (!token) throw new Error("search_console_not_configured");
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SEARCH_CONSOLE_SITE)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions: ["query"], rowLimit }),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`search_console_http_${res.status}`);
  const json = (await res.json()) as { rows?: { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }[] };
  return (json.rows ?? []).map((r) => ({
    query: r.keys?.[0] ?? "",
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}
