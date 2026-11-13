// Controle quotidien GOOGLE (nov. 2026), en lecture seule (portee
// webmasters.readonly du compte de service existant) :
//   - inspection d'URL de chaque adresse des sitemaps, 5 en parallele au
//     plus, rythme limite a 500 par minute (limite Google : 600), compteur
//     du jour en base avec arret net a 1 950 (limite Google : 2 000) ;
//   - etat des sitemaps (lus par Google, date, erreurs) ;
//   - Search Analytics : clics, impressions, position par page, 7 jours
//     compares aux 7 precedents, et releve quotidien des recherches cibles.
// Jamais l'Indexing API (reservee aux offres d'emploi et videos en direct).
// Sans cle Google : arret propre (etat no_key), le controle du site
// fonctionne quand meme.
import { fetchSearchAnalytics, fetchSitemaps, inspectUrl, searchConsoleConfigured } from "@/lib/google/search-console";
import { snapshotDailyPositions } from "@/lib/pilotage/seo";
import {
  droppedFromIndex,
  googleStatusKey,
  isIndexedKey,
  minIntervalMs,
  pathOf,
  runWithBudget,
  type CheckKey,
  type Finding,
} from "@/lib/pilotage/controle-core";
import {
  CONTROLE_GOOGLE_CONCURRENCY,
  CONTROLE_PUBLIC_ORIGIN,
  GOOGLE_INSPECTION_DAILY_STOP,
  GOOGLE_INSPECTION_PER_MINUTE,
} from "@/lib/pilotage/config";
import { collectSitemapUrls } from "@/lib/pilotage/controle-site";

export type PageTraffic = { page: string; clicks: number; impressions: number; position: number; prevClicks: number; prevImpressions: number; prevPosition: number | null };
export type GoogleAnalytics = {
  period: { start: string; end: string; prevStart: string; prevEnd: string };
  totals: { clicks: number; impressions: number; prevClicks: number; prevImpressions: number };
  pages: PageTraffic[];
};

export type GoogleCursor = {
  phase: "init" | "inspect" | "final";
  urls: string[];
  i: number;
  keys: Record<string, CheckKey>;
  analytics: GoogleAnalytics | null;
  counts: { inspected: number; indexed: number; notIndexed: number; failed: number };
};

export const newGoogleCursor = (): GoogleCursor => ({ phase: "init", urls: [], i: 0, keys: {}, analytics: null, counts: { inspected: 0, indexed: 0, notIndexed: 0, failed: 0 } });

/** Jour du compteur Google : minuit heure du Pacifique (remise a zero des quotas Google). */
export function googleQuotaDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);
}

const DAY = 86400_000;
const iso = (d: Date) => d.toISOString().slice(0, 10); // comme lib/pilotage/seo.ts

/** 7 derniers jours consolides (fin a J-3) et les 7 precedents. */
export function analyticsPeriods(now = new Date()) {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 3 * DAY);
  const start = new Date(end.getTime() - 6 * DAY);
  const prevEnd = new Date(start.getTime() - DAY);
  const prevStart = new Date(prevEnd.getTime() - 6 * DAY);
  return { start: iso(start), end: iso(end), prevStart: iso(prevStart), prevEnd: iso(prevEnd) };
}

async function loadAnalytics(): Promise<GoogleAnalytics> {
  const period = analyticsPeriods();
  const [cur, prev] = await Promise.all([
    fetchSearchAnalytics(period.start, period.end, ["page"], 1000),
    fetchSearchAnalytics(period.prevStart, period.prevEnd, ["page"], 1000),
  ]);
  const prevBy = new Map(prev.map((r) => [r.keys[0], r]));
  const pages = cur.map((r) => {
    const p = prevBy.get(r.keys[0]);
    return { page: r.keys[0] ?? "", clicks: r.clicks, impressions: r.impressions, position: Math.round(r.position * 10) / 10, prevClicks: p?.clicks ?? 0, prevImpressions: p?.impressions ?? 0, prevPosition: p ? Math.round(p.position * 10) / 10 : null };
  });
  const sum = (rows: { clicks: number; impressions: number }[]) => rows.reduce((a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions }), { clicks: 0, impressions: 0 });
  const a = sum(cur);
  const b = sum(prev);
  return { period, totals: { clicks: a.clicks, impressions: a.impressions, prevClicks: b.clicks, prevImpressions: b.impressions }, pages: pages.sort((x, y) => y.impressions - x.impressions).slice(0, 100) };
}

export type GoogleDeps = {
  takeQuota: (want: number) => Promise<number>;
  previousKeys: () => Promise<Map<string, CheckKey>>;
  inspect?: typeof inspectUrl;
  fetcher?: typeof fetch;
};

export function googleConfigured(): boolean {
  return searchConsoleConfigured();
}

/** Une etape du controle Google, jusqu'a `deadline`. */
export async function stepGoogle(
  c: GoogleCursor,
  deadline: number,
  onFindings: (f: Finding[]) => Promise<void>,
  deps: GoogleDeps & { checkpoint?: (c: GoogleCursor) => Promise<void> },
): Promise<{ cursor: GoogleCursor; done: boolean; stoppedBy: "time" | "limit" | null; progress: { done: number; total: number } }> {
  const inspect = deps.inspect ?? inspectUrl;
  // Releve quotidien des positions a chaque passage (idempotent, jours
  // manquants rattrapes), meme quand l'inspection reprend un autre jour.
  if (!deps.inspect) {
    try {
      await snapshotDailyPositions();
    } catch {
      // releve indisponible : reessaye au prochain passage
    }
  }
  if (c.phase === "init") {
    const init: Finding[] = [];
    // Etat des sitemaps vus par Google.
    try {
      const maps = await fetchSitemaps();
      if (!maps.some((m) => pathOf(m.path) === "/sitemap.xml")) init.push({ url: `${CONTROLE_PUBLIC_ORIGIN}/sitemap.xml`, key: "g_sitemap_missing" });
      for (const m of maps) {
        const key: CheckKey = m.errors > 0 ? "g_sitemap_errors" : m.isPending || !m.lastDownloaded ? "g_sitemap_pending" : "g_sitemap_ok";
        init.push({ url: m.path, key, params: { errors: m.errors, warnings: m.warnings, date: (m.lastDownloaded ?? "").slice(0, 10) }, details: { ...m } });
      }
    } catch (e) {
      init.push({ url: `${CONTROLE_PUBLIC_ORIGIN}/sitemap.xml`, key: "g_inspect_failed", params: { error: e instanceof Error ? e.message.slice(0, 60) : "sitemaps" } });
    }
    // Clics, impressions et positions (une erreur n'arrete pas l'inspection).
    try {
      c.analytics = await loadAnalytics();
    } catch {
      c.analytics = null;
    }
    // Adresses des sitemaps du domaine public.
    let robots: string | null = null;
    try {
      const r = await (deps.fetcher ?? fetch)(`${CONTROLE_PUBLIC_ORIGIN}/robots.txt`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      robots = r.ok ? await r.text() : null;
    } catch {
      robots = null;
    }
    const { urls } = await collectSitemapUrls(CONTROLE_PUBLIC_ORIGIN, robots, deps.fetcher);
    c.urls = urls.map((p) => `${CONTROLE_PUBLIC_ORIGIN}${p}`);
    c.phase = "inspect";
    await onFindings(init);
  }

  if (c.phase === "inspect") {
    // Rythme : une inspection au plus toutes les 120 ms (500 par minute).
    const interval = minIntervalMs(GOOGLE_INSPECTION_PER_MINUTE);
    let nextSlot = Date.now();
    const r = await runWithBudget(
      c.urls,
      c.i,
      async (url) => {
        const wait = nextSlot - Date.now();
        nextSlot = Math.max(nextSlot, Date.now()) + interval;
        if (wait > 0) await new Promise((res) => setTimeout(res, wait));
        let f: Finding;
        try {
          const result = await inspect(url);
          const s = result.indexStatusResult ?? {};
          const key = googleStatusKey(s);
          const rich = (result.richResultsResult?.detectedItems ?? []).map((d) => d.richResultType).filter((x): x is string => Boolean(x));
          f = {
            url,
            key,
            params: {
              coverage: s.coverageState ?? "",
              lastCrawl: (s.lastCrawlTime ?? "").slice(0, 10),
              googleCanonical: s.googleCanonical ? (pathOf(s.googleCanonical) ?? s.googleCanonical) : "",
              ourCanonical: s.userCanonical ? (pathOf(s.userCanonical) ?? s.userCanonical) : "",
            },
            details: { ...s, richResults: rich, richVerdict: result.richResultsResult?.verdict ?? null },
          };
          c.counts.inspected++;
          if (isIndexedKey(key)) c.counts.indexed++;
          else c.counts.notIndexed++;
        } catch (e) {
          c.counts.failed++;
          f = { url, key: "g_inspect_failed", params: { error: e instanceof Error ? e.message.slice(0, 60) : "inspection" } };
        }
        c.keys[url] = f.key;
        await onFindings([f]);
      },
      { concurrency: CONTROLE_GOOGLE_CONCURRENCY, deadline, beforeBatch: (n) => deps.takeQuota(n), afterBatch: async (next) => { c.i = next; await deps.checkpoint?.(c); } },
    );
    c.i = r.next;
    if (!r.done) return { cursor: c, done: false, stoppedBy: r.stoppedBy, progress: { done: c.i, total: c.urls.length } };
    c.phase = "final";
  }

  // Pages sorties de l'index depuis le passage precedent.
  const prev = await deps.previousKeys();
  const dropped = droppedFromIndex(prev, new Map(Object.entries(c.keys)));
  await onFindings(dropped.map((url) => ({ url, key: "g_dropped" as const })));
  return { cursor: c, done: true, stoppedBy: null, progress: { done: c.urls.length, total: c.urls.length } };
}

export const GOOGLE_DAILY_STOP = GOOGLE_INSPECTION_DAILY_STOP;
