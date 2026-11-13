// Google Search Console (oct. 2026) : API Search Analytics, lecture seule.
// Propriete de domaine sc-domain:mapaproperty.lu (lib/pilotage/config).
import { googleAccessToken, readServiceAccount, SCOPE_SEARCH_CONSOLE } from "@/lib/google/service-account";
import { SEARCH_CONSOLE_SITE } from "@/lib/pilotage/config";

export type QueryRow = { query: string; clicks: number; impressions: number; ctr: number; position: number };

export function searchConsoleConfigured(): boolean {
  return Boolean(readServiceAccount());
}

type AnalyticsRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

/** Search Analytics entre deux dates incluses (AAAA-MM-JJ), dimensions au choix. */
export async function fetchSearchAnalytics(startDate: string, endDate: string, dimensions: string[], rowLimit = 1000): Promise<AnalyticsRow[]> {
  const token = await googleAccessToken(SCOPE_SEARCH_CONSOLE);
  if (!token) throw new Error("search_console_not_configured");
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SEARCH_CONSOLE_SITE)}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit }),
      cache: "no-store",
    },
  );
  if (!res.ok) throw new Error(`search_console_http_${res.status}`);
  const json = (await res.json()) as { rows?: { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }[] };
  return (json.rows ?? []).map((r) => ({
    keys: r.keys ?? [],
    clicks: r.clicks ?? 0,
    impressions: r.impressions ?? 0,
    ctr: r.ctr ?? 0,
    position: r.position ?? 0,
  }));
}

/** Requetes (dimension query) entre deux dates incluses, format AAAA-MM-JJ. */
export async function fetchQueries(startDate: string, endDate: string, rowLimit = 1000): Promise<QueryRow[]> {
  return (await fetchSearchAnalytics(startDate, endDate, ["query"], rowLimit)).map((r) => ({
    query: r.keys[0] ?? "",
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));
}

// Controle quotidien (nov. 2026). Portee webmasters.readonly suffisante,
// verifie le 13/11/2026 dans la documentation Google
// (developers.google.com/webmaster-tools : urlInspection.index.inspect et
// sitemaps.list acceptent webmasters.readonly). Lecture seule.

export type InspectionResult = {
  indexStatusResult?: {
    verdict?: string;
    coverageState?: string;
    robotsTxtState?: string;
    indexingState?: string;
    lastCrawlTime?: string;
    pageFetchState?: string;
    googleCanonical?: string;
    userCanonical?: string;
    sitemap?: string[];
  };
  richResultsResult?: { verdict?: string; detectedItems?: { richResultType?: string }[] };
};

/** Inspection d'une adresse (limites Google : 2 000 par jour, 600 par minute). */
export async function inspectUrl(url: string): Promise<InspectionResult> {
  const token = await googleAccessToken(SCOPE_SEARCH_CONSOLE);
  if (!token) throw new Error("search_console_not_configured");
  const res = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    // Messages en anglais : textes stables, traduits par le site.
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SEARCH_CONSOLE_SITE, languageCode: "en-US" }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`inspection_http_${res.status}`);
  const json = (await res.json()) as { inspectionResult?: InspectionResult };
  return json.inspectionResult ?? {};
}

export type SitemapState = {
  path: string;
  lastSubmitted: string | null;
  lastDownloaded: string | null;
  isPending: boolean;
  errors: number;
  warnings: number;
};

/** Sitemaps connus de Google pour la propriete. */
export async function fetchSitemaps(): Promise<SitemapState[]> {
  const token = await googleAccessToken(SCOPE_SEARCH_CONSOLE);
  if (!token) throw new Error("search_console_not_configured");
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SEARCH_CONSOLE_SITE)}/sitemaps`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`sitemaps_http_${res.status}`);
  const json = (await res.json()) as { sitemap?: { path?: string; lastSubmitted?: string; lastDownloaded?: string; isPending?: boolean; errors?: string | number; warnings?: string | number }[] };
  return (json.sitemap ?? []).map((s) => ({
    path: s.path ?? "",
    lastSubmitted: s.lastSubmitted ?? null,
    lastDownloaded: s.lastDownloaded ?? null,
    isPending: Boolean(s.isPending),
    errors: Number(s.errors ?? 0) || 0,
    warnings: Number(s.warnings ?? 0) || 0,
  }));
}
