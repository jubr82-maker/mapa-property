// Controle quotidien du site et de Google (nov. 2026) : logique pure, sans
// base ni reseau, partagee par lib/pilotage/controle-site.ts,
// controle-google.ts, la page admin "Controle Google" et les tests
// (scripts/test-controle.mts). Aucun texte affiche ici : chaque constat
// porte une cle (check_key) et des parametres ; la phrase en francais
// simple vient des traductions (namespace admin_controle, "check_<cle>").

export type Category = "a_corriger" | "attente_google" | "normal";
export const CATEGORIES: readonly Category[] = ["a_corriger", "attente_google", "normal"];

export type Finding = {
  url: string;
  key: CheckKey;
  params?: Record<string, string | number>;
  details?: Record<string, unknown>;
};

/** Cle de constat -> categorie (source unique du classement en trois zones). */
export const CHECK_CATEGORY = {
  // Site
  page_ok: "normal",
  http_error: "a_corriger",
  redirect_chain: "a_corriger",
  sitemap_redirect: "a_corriger",
  legacy_ok: "normal",
  legacy_broken: "a_corriger",
  legacy_chain: "a_corriger",
  canonical_missing: "a_corriger",
  canonical_other: "a_corriger",
  noindex_in_sitemap: "a_corriger",
  hreflang_missing: "a_corriger",
  hreflang_not_reciprocal: "a_corriger",
  title_missing: "a_corriger",
  title_duplicate: "a_corriger",
  title_length: "a_corriger",
  description_missing: "a_corriger",
  description_duplicate: "a_corriger",
  h1_count: "a_corriger",
  img_no_alt: "a_corriger",
  jsonld_invalid: "a_corriger",
  jsonld_no_type: "a_corriger",
  broken_link: "a_corriger",
  weak_inbound: "a_corriger",
  robots_ok: "normal",
  robots_unreachable: "a_corriger",
  robots_no_sitemap: "a_corriger",
  notfound_ok: "normal",
  notfound_wrong: "a_corriger",
  host_redirect_ok: "normal",
  host_redirect_bad: "a_corriger",
  host_not_checkable: "normal",
  fetch_failed: "a_corriger",
  // Google
  g_indexed: "normal",
  g_alternate: "normal",
  g_pending_discovered: "attente_google",
  g_pending_crawled: "attente_google",
  g_pending_unknown: "attente_google",
  g_pending_other: "attente_google",
  g_canonical_other: "a_corriger",
  g_noindex: "a_corriger",
  g_robots: "a_corriger",
  g_not_found: "a_corriger",
  g_soft404: "a_corriger",
  g_server_error: "a_corriger",
  g_redirect: "a_corriger",
  g_access: "a_corriger",
  g_dropped: "a_corriger",
  g_inspect_failed: "attente_google",
  g_sitemap_ok: "normal",
  g_sitemap_pending: "attente_google",
  g_sitemap_errors: "a_corriger",
  g_sitemap_missing: "a_corriger",
} as const satisfies Record<string, Category>;
export type CheckKey = keyof typeof CHECK_CATEGORY;

export function categoryOf(key: CheckKey): Category {
  return CHECK_CATEGORY[key];
}

// --- Lecture d'une page HTML ---------------------------------------------

export type PageFacts = {
  title: string | null;
  description: string | null;
  noindex: boolean;
  canonical: string | null;
  hreflang: Record<string, string>;
  h1: number;
  imgNoAlt: number;
  jsonld: { valid: number; invalid: number; noType: number };
  links: string[];
};

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
const attr = (tag: string, name: string) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"));
  return m ? decode(m[2] ?? m[3] ?? "") : null;
};

export function parsePage(html: string): PageFacts {
  const head = html;
  const title = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  let description: string | null = null;
  let noindex = false;
  let canonical: string | null = null;
  const hreflang: Record<string, string> = {};
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const name = attr(m[0], "name")?.toLowerCase();
    if (name === "description") description = attr(m[0], "content");
    if (name === "robots" && /noindex/i.test(attr(m[0], "content") ?? "")) noindex = true;
  }
  for (const m of head.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attr(m[0], "rel")?.toLowerCase();
    if (rel === "canonical") canonical = attr(m[0], "href");
    if (rel === "alternate") {
      const lang = attr(m[0], "hreflang");
      const href = attr(m[0], "href");
      if (lang && href) hreflang[lang.toLowerCase()] = href;
    }
  }
  const h1 = (html.match(/<h1\b/gi) ?? []).length;
  let imgNoAlt = 0;
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) if (attr(m[0], "alt") === null) imgNoAlt++;
  const jsonld = { valid: 0, invalid: 0, noType: 0 };
  for (const m of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]) as unknown;
      const nodes = Array.isArray(data) ? data : (data as { "@graph"?: unknown[] })?.["@graph"] ?? [data];
      const typed = (nodes as unknown[]).every((n) => typeof n === "object" && n !== null && "@type" in n);
      if (typed) jsonld.valid++;
      else jsonld.noType++;
    } catch {
      jsonld.invalid++;
    }
  }
  const links = [...html.matchAll(/<a\b[^>]*\bhref\s*=\s*"([^"#]+)"/gi)].map((m) => decode(m[1]));
  return { title: title !== undefined ? decode(title.replace(/<[^>]+>/g, "")) : null, description, noindex, canonical, hreflang, h1, imgNoAlt, jsonld, links };
}

/** Chemin + parametres d'une adresse (domaine ignore), sans barre finale. */
export function pathOf(href: string, base = "https://mapaproperty.lu"): string | null {
  try {
    const u = new URL(href, base);
    return (u.pathname.replace(/\/$/, "") || "/") + u.search;
  } catch {
    return null;
  }
}

/** Lien interne vers une page (ni fichier, ni API, ni admin), sinon null. */
export function internalPagePath(href: string, from: string, origins: string[]): string | null {
  try {
    const u = new URL(href, from);
    if (!origins.includes(u.origin)) return null;
    if (/\.(jpg|jpeg|png|webp|avif|svg|gif|pdf|xml|txt|ico|webmanifest|mp4|css|js|json)$/i.test(u.pathname)) return null;
    if (/^\/(api|_next|admin)(\/|$)/.test(u.pathname)) return null;
    return (u.pathname.replace(/\/$/, "") || "/") + u.search;
  } catch {
    return null;
  }
}

/** Constats propres a une page (hors controles croises). */
export function pageFindings(url: string, path: string, facts: PageFacts, inSitemap: boolean, titleLen: { min: number; max: number }, canonicalOrigins?: string[]): Finding[] {
  const out: Finding[] = [];
  let canonOrigin: string | null = null;
  try {
    canonOrigin = facts.canonical ? new URL(facts.canonical, url).origin : null;
  } catch {
    canonOrigin = null;
  }
  // Canonical vers un autre domaine (www., beta., ancien site) : pas elle-meme.
  const foreign = Boolean(canonOrigin && canonicalOrigins && !canonicalOrigins.includes(canonOrigin));
  const canon = facts.canonical && !foreign ? pathOf(facts.canonical) : null;
  if (inSitemap && facts.noindex) out.push({ url, key: "noindex_in_sitemap" });
  if (!facts.noindex) {
    if (!facts.canonical) out.push({ url, key: "canonical_missing" });
    else if (canon !== path) out.push({ url, key: "canonical_other", params: { target: foreign ? (facts.canonical as string) : (canon ?? facts.canonical) } });
  }
  const indexable = !facts.noindex && canon === path;
  if (indexable) {
    const missing = ["fr", "en", "de", "x-default"].filter((l) => !facts.hreflang[l]);
    if (missing.length) out.push({ url, key: "hreflang_missing", params: { langs: missing.join(", ") } });
    if (!facts.title) out.push({ url, key: "title_missing" });
    else if (facts.title.length < titleLen.min || facts.title.length > titleLen.max) out.push({ url, key: "title_length", params: { n: facts.title.length } });
    if (!facts.description) out.push({ url, key: "description_missing" });
  }
  if (facts.h1 !== 1) out.push({ url, key: "h1_count", params: { n: facts.h1 } });
  if (facts.imgNoAlt > 0) out.push({ url, key: "img_no_alt", params: { n: facts.imgNoAlt } });
  if (facts.jsonld.invalid > 0) out.push({ url, key: "jsonld_invalid", params: { n: facts.jsonld.invalid } });
  if (facts.jsonld.noType > 0) out.push({ url, key: "jsonld_no_type", params: { n: facts.jsonld.noType } });
  return out;
}

/** Valeurs en double (title ou description) entre pages indexables. */
export function duplicates(values: Record<string, string | null>): Map<string, string[]> {
  const by = new Map<string, string[]>();
  for (const [path, v] of Object.entries(values)) {
    if (!v) continue;
    const k = v.trim().toLowerCase();
    by.set(k, [...(by.get(k) ?? []), path]);
  }
  return new Map([...by].filter(([, paths]) => paths.length > 1));
}

/** Hreflang non reciproques : A -> B (langue l) sans B -> A. */
export function nonReciprocal(hreflangByPath: Record<string, Record<string, string>>): { path: string; target: string }[] {
  const out: { path: string; target: string }[] = [];
  for (const [path, map] of Object.entries(hreflangByPath)) {
    for (const [lang, href] of Object.entries(map)) {
      if (lang === "x-default") continue;
      const target = pathOf(href);
      if (!target || target === path || !(target in hreflangByPath)) continue;
      const back = Object.entries(hreflangByPath[target]).some(([l, h]) => l !== "x-default" && pathOf(h) === path);
      if (!back) out.push({ path, target });
    }
  }
  return out;
}

// --- Google : traduction des statuts d'inspection -------------------------

export type IndexStatus = {
  verdict?: string;
  coverageState?: string;
  robotsTxtState?: string;
  indexingState?: string;
  pageFetchState?: string;
  lastCrawlTime?: string;
  googleCanonical?: string;
  userCanonical?: string;
};

/**
 * Statut Google -> constat. Enumerations de l'API (verdict, indexingState,
 * pageFetchState) en priorite ; coverageState (texte anglais, languageCode
 * en-US) seulement pour distinguer les pages en attente.
 */
export function googleStatusKey(s: IndexStatus): CheckKey {
  const fetch = s.pageFetchState ?? "";
  if (s.indexingState === "BLOCKED_BY_META_TAG" || s.indexingState === "BLOCKED_BY_HTTP_HEADER") return "g_noindex";
  if (s.indexingState === "BLOCKED_BY_ROBOTS_TXT" || s.robotsTxtState === "DISALLOWED" || fetch === "BLOCKED_ROBOTS_TXT") return "g_robots";
  if (fetch === "NOT_FOUND") return "g_not_found";
  if (fetch === "SOFT_404") return "g_soft404";
  if (fetch === "SERVER_ERROR" || fetch === "INTERNAL_CRAWL_ERROR") return "g_server_error";
  if (fetch === "REDIRECT_ERROR") return "g_redirect";
  if (fetch === "ACCESS_DENIED" || fetch === "ACCESS_FORBIDDEN" || fetch === "BLOCKED_4XX") return "g_access";
  const cov = (s.coverageState ?? "").toLowerCase();
  const canonDiffers = Boolean(s.googleCanonical && s.userCanonical && pathOf(s.googleCanonical) !== pathOf(s.userCanonical));
  if (s.verdict === "PASS") return canonDiffers ? "g_canonical_other" : "g_indexed";
  if (/alternate page with proper canonical/.test(cov)) return "g_alternate";
  if (/redirect/.test(cov)) return "g_redirect";
  if (canonDiffers || /duplicate/.test(cov)) return "g_canonical_other";
  if (/noindex/.test(cov)) return "g_noindex";
  if (/discovered/.test(cov)) return "g_pending_discovered";
  if (/crawled/.test(cov)) return "g_pending_crawled";
  if (/unknown to google/.test(cov)) return "g_pending_unknown";
  return "g_pending_other";
}

export const isIndexedKey = (k: CheckKey) => k === "g_indexed" || k === "g_canonical_other";

/** Pages a soumettre : importance (0 = la plus haute) d'un chemin. */
export function importanceOf(path: string): number {
  const p = path.replace(/^\/(fr|en|de)(?=\/|$)/, "") || "/";
  const main = new Set(["/", "/biens", "/biens?transaction=sale", "/biens?transaction=rent", "/off-market", "/agence-immobiliere-luxembourg", "/qui-sommes-nous", "/contact", "/blog", "/recherches", "/faq"]);
  if (main.has(p)) return 0;
  if (/^\/(services|mandats)(\/|$)/.test(p)) return 1;
  if (/^\/villes\//.test(p)) return 2;
  if (/^\/biens\//.test(p)) return 3;
  return 4;
}

export function sortForSubmission<T extends { url: string }>(rows: T[]): T[] {
  const lang = (u: string) => (/\/fr(\/|$|\?)/.test(u) ? 0 : /\/en(\/|$|\?)/.test(u) ? 1 : 2);
  return [...rows].sort((a, b) => importanceOf(pathOf(a.url) ?? "") - importanceOf(pathOf(b.url) ?? "") || lang(a.url) - lang(b.url) || a.url.localeCompare(b.url));
}

// --- Reprise, verrou, compteur Google -------------------------------------

/**
 * Traite items[from..] par lots de `concurrency`, et s'arrete proprement
 * des que le budget de temps est consomme (aucun nouveau lot lance apres
 * deadline). Renvoie le point de reprise.
 */
export async function runWithBudget<T>(
  items: readonly T[],
  from: number,
  worker: (item: T, index: number) => Promise<void>,
  opts: { concurrency: number; deadline: number; now?: () => number; beforeBatch?: (size: number) => Promise<number>; afterBatch?: (next: number) => Promise<void> },
): Promise<{ next: number; done: boolean; stoppedBy: "time" | "limit" | null }> {
  const now = opts.now ?? Date.now;
  let i = from;
  while (i < items.length) {
    if (now() >= opts.deadline) return { next: i, done: false, stoppedBy: "time" };
    let size = Math.min(opts.concurrency, items.length - i);
    if (opts.beforeBatch) {
      size = Math.min(size, await opts.beforeBatch(size));
      if (size <= 0) return { next: i, done: false, stoppedBy: "limit" };
    }
    const batch = items.slice(i, i + size);
    await Promise.all(batch.map((it, k) => worker(it, i + k)));
    i += size;
    if (opts.afterBatch) await opts.afterBatch(i);
  }
  return { next: i, done: true, stoppedBy: null };
}

/** Inspections accordees sous la limite du jour (arret net avant la limite). */
export function quotaGrant(used: number, want: number, stopAt: number): number {
  return Math.max(0, Math.min(want, stopAt - used));
}

/** Verrou libre (absent, expire, ou deja tenu par ce passage). */
export function lockAvailable(lock: { holder: string; lockedUntil: string } | null, holder: string, now = Date.now()): boolean {
  return !lock || lock.holder === holder || new Date(lock.lockedUntil).getTime() < now;
}

/** Espacement minimal entre deux inspections pour rester sous le rythme par minute. */
export const minIntervalMs = (perMinute: number) => Math.ceil(60_000 / perMinute);

/** Pages sorties de l'index depuis le passage precedent. */
export function droppedFromIndex(previous: Map<string, CheckKey>, current: Map<string, CheckKey>): string[] {
  // Une inspection en echec (reseau, Google) ne dit rien de l'index.
  return [...current].filter(([url, k]) => k !== "g_inspect_failed" && !isIndexedKey(k) && previous.has(url) && isIndexedKey(previous.get(url) as CheckKey)).map(([url]) => url);
}

/** Code d'erreur Supabase/PostgREST d'une table ou fonction absente. */
export function isMissingRelation(code: string | undefined | null): boolean {
  return code === "42P01" || code === "PGRST205" || code === "PGRST202" || code === "42883";
}
