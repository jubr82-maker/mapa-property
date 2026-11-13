// Controle quotidien du SITE (nov. 2026). Toutes les adresses des sitemaps,
// les pages cles et les anciennes adresses (OLD_SITE_PAGES), 8 requetes en
// parallele au plus, SANS en-tete identifiant (ni User-Agent personnalise,
// ni nom, ni e-mail). Arret propre au bout du budget de temps (270 s pour
// la tache planifiee) avec point de reprise dans controle_runs.cursor.
// Reprend la logique de scripts/seo/crawl-maillage.mjs (liens entrants
// entre pages indexables, canonical comparee par chemin).
import {
  duplicates,
  internalPagePath,
  nonReciprocal,
  pageFindings,
  parsePage,
  pathOf,
  runWithBudget,
  type Finding,
} from "@/lib/pilotage/controle-core";
import {
  CONTROLE_MIN_INBOUND_LINKS,
  CONTROLE_PUBLIC_ORIGIN,
  CONTROLE_SITE_CONCURRENCY,
  CONTROLE_TITLE_LENGTH,
} from "@/lib/pilotage/config";
import { LOCALES, OLD_EXACT_PAGES, OLD_SITE_PAGES } from "@/lib/legacy-redirects";
import { STATIC_PATHS } from "@/lib/sitemaps";

/** Adresse controlee : CONTROLE_SITE_BASE, sinon le domaine public. */
export function controleBase(): string {
  return (process.env.CONTROLE_SITE_BASE?.trim() || CONTROLE_PUBLIC_ORIGIN).replace(/\/$/, "");
}

type Source = "s" | "k" | "l"; // sitemap, page cle, ancienne adresse
export type SiteCursor = {
  phase: "init" | "pages" | "links" | "final";
  base: string;
  urls: { p: string; t: Source }[];
  i: number;
  titles: Record<string, string | null>;
  descs: Record<string, string | null>;
  hreflang: Record<string, Record<string, string>>;
  indexable: string[];
  inbound: Record<string, number>;
  linkFrom: Record<string, string>;
  fetched: string[];
  links: string[];
  li: number;
  counts: { pages: number; findings: number; aCorriger: number };
};

export type Fetched = { status: number; hops: string[]; finalUrl: string; html: string | null; robotsHeader?: string | null; error?: string };

/** Requete sans en-tete identifiant, redirections suivies a la main. */
export async function fetchFollow(url: string, maxHops = 5, fetcher: typeof fetch = fetch, until = Infinity): Promise<Fetched> {
  const hops: string[] = [];
  let current = url;
  for (let n = 0; n <= maxHops; n++) {
    let res: Response;
    try {
      // Jamais au-dela de `until` (limite de 300 s de Vercel), 20 s au plus.
      const ms = Math.max(1000, Math.min(20_000, until - Date.now()));
      res = await fetcher(current, { redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(ms) });
    } catch (e) {
      return { status: 0, hops, finalUrl: current, html: null, error: e instanceof Error ? e.message.slice(0, 80) : "fetch" };
    }
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).toString();
      hops.push(current);
      continue;
    }
    const html = (res.headers.get("content-type") ?? "").includes("text/html") ? await res.text() : null;
    if (html === null) await res.body?.cancel().catch(() => undefined);
    return { status: res.status, hops, finalUrl: current, html, robotsHeader: res.headers.get("x-robots-tag") };
  }
  return { status: 0, hops, finalUrl: current, html: null, error: "too_many_redirects" };
}

/** Adresses des sitemaps declares dans robots.txt (index compris). */
export async function collectSitemapUrls(base: string, robotsTxt: string | null, fetcher: typeof fetch = fetch): Promise<{ sitemaps: string[]; urls: string[] }> {
  const rebase = (u: string) => {
    const p = pathOf(u);
    return p ? `${base}${p}` : null;
  };
  const declared = [...(robotsTxt ?? "").matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => rebase(m[1])).filter((u): u is string => Boolean(u));
  const queue = declared.length ? declared : [`${base}/sitemap.xml`];
  const sitemaps: string[] = [];
  const urls = new Set<string>();
  const seen = new Set<string>();
  while (queue.length && seen.size < 50) {
    const sm = queue.shift() as string;
    if (seen.has(sm)) continue;
    seen.add(sm);
    let xml = "";
    try {
      const r = await fetcher(sm, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      if (!r.ok) continue;
      xml = await r.text();
    } catch {
      continue;
    }
    sitemaps.push(sm);
    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    if (/<sitemapindex/i.test(xml)) for (const l of locs) {
      const r = rebase(l);
      if (r) queue.push(r);
    }
    else for (const l of locs) {
      const p = pathOf(l);
      if (p) urls.add(p);
    }
  }
  return { sitemaps, urls: [...urls] };
}

/** Pages cles (accueils et pages fixes en francais). */
export function keyPaths(): string[] {
  return [...LOCALES.map((l) => `/${l}`), ...STATIC_PATHS.filter(Boolean).map((p) => `/fr${p}`)];
}

/** Anciennes adresses (pages de l'ancien site, dans chaque langue). */
export function legacyPaths(): string[] {
  return [...LOCALES.flatMap((l) => Object.keys(OLD_SITE_PAGES).map((seg) => `/${l}/${seg}`)), ...Object.keys(OLD_EXACT_PAGES)];
}

export function newSiteCursor(base: string): SiteCursor {
  return { phase: "init", base, urls: [], i: 0, titles: {}, descs: {}, hreflang: {}, indexable: [], inbound: {}, linkFrom: {}, fetched: [], links: [], li: 0, counts: { pages: 0, findings: 0, aCorriger: 0 } };
}

export type SiteStep = {
  cursor: SiteCursor;
  findings: Finding[];
  done: boolean;
  stoppedBy: "time" | null;
  progress: { done: number; total: number };
};

const MAX_LINK_CHECKS = 400;

/**
 * Une etape du controle du site, jusqu'a `deadline`. Les constats sont
 * renvoyes au fil de l'eau par `onFindings` (enregistres lot par lot).
 */
export async function stepSite(
  cursorIn: SiteCursor,
  deadline: number,
  onFindings: (f: Finding[]) => Promise<void>,
  fetcher: typeof fetch = fetch,
  checkpoint?: (c: SiteCursor) => Promise<void>,
): Promise<Omit<SiteStep, "findings">> {
  const c = cursorIn;
  const base = c.base;
  // Requetes coupees 20 s apres l'echeance : un lot lance a 269 s finit
  // avant la limite de 300 s de Vercel.
  const until = deadline + 20_000;
  const baseOrigin = new URL(base).origin;
  const origins = [...new Set([baseOrigin, CONTROLE_PUBLIC_ORIGIN, "https://beta.mapaproperty.lu"])];
  // Canonical : sur le domaine controle (domaine public), ou, sur un autre
  // serveur (localhost), sur le domaine public ou beta.
  const canonicalOrigins = baseOrigin === CONTROLE_PUBLIC_ORIGIN ? [CONTROLE_PUBLIC_ORIGIN] : origins;
  const emit = async (f: Finding[]) => {
    if (!f.length) return;
    c.counts.findings += f.length;
    await onFindings(f);
  };

  if (c.phase === "init") {
    const init: Finding[] = [];
    // robots.txt joignable et qui declare le sitemap.
    let robots: string | null = null;
    try {
      const r = await fetcher(`${base}/robots.txt`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
      robots = r.ok ? await r.text() : null;
    } catch {
      robots = null;
    }
    if (robots === null) init.push({ url: `${base}/robots.txt`, key: "robots_unreachable" });
    else if (!/^\s*sitemap:/im.test(robots)) init.push({ url: `${base}/robots.txt`, key: "robots_no_sitemap" });
    else init.push({ url: `${base}/robots.txt`, key: "robots_ok" });
    const { urls } = await collectSitemapUrls(base, robots, fetcher);
    const list = new Map<string, Source>();
    for (const p of urls) list.set(p, "s");
    for (const p of keyPaths()) if (!list.has(p)) list.set(p, "k");
    for (const p of legacyPaths()) if (!list.has(p)) list.set(p, "l");
    c.urls = [...list].map(([p, t]) => ({ p, t }));
    // Une adresse inexistante doit repondre 404.
    const missing = await fetchFollow(`${base}/fr/controle-adresse-inexistante-${Date.now().toString(36)}`, 5, fetcher);
    init.push({ url: `${base}/fr/controle-adresse-inexistante`, key: missing.status === 404 ? "notfound_ok" : "notfound_wrong", params: { status: missing.status } });
    // www et http vers https://mapaproperty.lu (domaine public seulement).
    if (new URL(base).origin === CONTROLE_PUBLIC_ORIGIN) {
      for (const from of ["https://www.mapaproperty.lu/fr?controle=1", "http://mapaproperty.lu/fr?controle=1"]) {
        const r = await fetchFollow(from, 5, fetcher);
        const ok = r.hops.length === 1 && r.hops[0] === `${CONTROLE_PUBLIC_ORIGIN}/fr?controle=1`;
        init.push({ url: from, key: ok ? "host_redirect_ok" : "host_redirect_bad", params: { hops: r.hops.length, to: r.hops.at(-1) ?? r.finalUrl }, details: { hops: r.hops, status: r.status } });
      }
    } else {
      init.push({ url: base, key: "host_not_checkable" });
    }
    c.phase = "pages";
    await emit(init);
  }

  if (c.phase === "pages") {
    const r = await runWithBudget(c.urls, c.i, async ({ p, t }) => {
      const url = `${base}${p}`;
      const res = await fetchFollow(url, 5, fetcher, until);
      const out: Finding[] = [];
      c.counts.pages++;
      if (t === "l") {
        const finalOk = res.status >= 200 && res.status < 300;
        if (!finalOk) out.push({ url, key: "legacy_broken", params: { status: res.status }, details: { hops: res.hops } });
        else if (res.hops.length > 1) out.push({ url, key: "legacy_chain", params: { hops: res.hops.length }, details: { hops: res.hops } });
        else out.push({ url, key: "legacy_ok", params: { to: pathOf(res.finalUrl) ?? res.finalUrl } });
        await emit(out);
        return;
      }
      if (res.status === 0) out.push({ url, key: "fetch_failed", params: { error: res.error ?? "" } });
      else if (res.status >= 400) out.push({ url, key: "http_error", params: { status: res.status } });
      if (res.hops.length > 1) out.push({ url, key: "redirect_chain", params: { hops: res.hops.length }, details: { hops: res.hops } });
      else if (res.hops.length === 1 && t === "s") out.push({ url, key: "sitemap_redirect", params: { to: pathOf(res.hops[0]) ?? res.hops[0] } });
      if (res.status === 200 && res.html && res.hops.length === 0) {
        const facts = parsePage(res.html);
        // noindex aussi par l'en-tete X-Robots-Tag.
        if (/noindex/i.test(res.robotsHeader ?? "")) facts.noindex = true;
        out.push(...pageFindings(url, p, facts, t === "s", CONTROLE_TITLE_LENGTH, canonicalOrigins));
        c.fetched.push(p);
        const canon = facts.canonical && canonicalOrigins.includes(new URL(facts.canonical, url).origin) ? pathOf(facts.canonical) : null;
        if (!facts.noindex && canon === p) {
          c.indexable.push(p);
          c.titles[p] = facts.title;
          c.descs[p] = facts.description;
          c.hreflang[p] = facts.hreflang;
        }
        const targets = new Set<string>();
        for (const href of facts.links) {
          const to = internalPagePath(href, url, origins);
          if (to && to !== p) targets.add(to);
        }
        for (const to of targets) {
          c.inbound[to] = (c.inbound[to] ?? 0) + 1;
          if (!(to in c.linkFrom)) c.linkFrom[to] = p;
        }
      } else if (res.status > 0) {
        c.fetched.push(p);
      }
      if (out.length === 0) out.push({ url, key: "page_ok" });
      await emit(out);
    }, { concurrency: CONTROLE_SITE_CONCURRENCY, deadline, afterBatch: async (next) => { c.i = next; await checkpoint?.(c); } });
    c.i = r.next;
    if (!r.done) return { cursor: c, done: false, stoppedBy: "time", progress: { done: c.i, total: c.urls.length } };
    const fetched = new Set(c.fetched);
    const listed = new Set(c.urls.map((u) => u.p));
    c.links = Object.keys(c.linkFrom).filter((to) => !fetched.has(to) && !listed.has(to) && !/\?(?!transaction=)/.test(to)).slice(0, MAX_LINK_CHECKS);
    c.phase = "links";
  }

  if (c.phase === "links") {
    const r = await runWithBudget(c.links, c.li, async (to) => {
      const res = await fetchFollow(`${base}${to}`, 5, fetcher, until);
      if (res.status === 0 || res.status >= 400) {
        await emit([{ url: `${base}${c.linkFrom[to]}`, key: "broken_link", params: { target: to, status: res.status } }]);
      }
    }, { concurrency: CONTROLE_SITE_CONCURRENCY, deadline, afterBatch: async (next) => { c.li = next; await checkpoint?.(c); } });
    c.li = r.next;
    if (!r.done) return { cursor: c, done: false, stoppedBy: "time", progress: { done: c.urls.length + c.li, total: c.urls.length + c.links.length } };
    c.phase = "final";
  }

  // Controles croises : doublons, hreflang reciproques, liens entrants.
  const final: Finding[] = [];
  for (const [, paths] of duplicates(c.titles)) for (const p of paths) final.push({ url: `${base}${p}`, key: "title_duplicate", params: { n: paths.length - 1, other: paths.find((x) => x !== p) ?? "" } });
  for (const [, paths] of duplicates(c.descs)) for (const p of paths) final.push({ url: `${base}${p}`, key: "description_duplicate", params: { n: paths.length - 1, other: paths.find((x) => x !== p) ?? "" } });
  for (const { path, target } of nonReciprocal(c.hreflang)) final.push({ url: `${base}${path}`, key: "hreflang_not_reciprocal", params: { target } });
  for (const p of c.indexable) {
    const n = c.inbound[p] ?? 0;
    if (n < CONTROLE_MIN_INBOUND_LINKS) final.push({ url: `${base}${p}`, key: "weak_inbound", params: { n, min: CONTROLE_MIN_INBOUND_LINKS } });
  }
  await emit(final);
  const total = c.urls.length + c.links.length;
  return { cursor: c, done: true, stoppedBy: null, progress: { done: total, total } };
}
