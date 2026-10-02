// Suite seo-onpage (SEO oct. 2026). Echoue si, sur le build de production
// local, dans les trois langues :
//  1. un lien interne contient un double prefixe de langue ;
//  2. un lien interne ou un document lie ne repond pas 200 ;
//  3. deux pages indexables partagent un title ou une meta description ;
//  4. un title contient "Mapa" ou deux fois "MAPA Property" ;
//  5. une meta description contient "<" ou une entite HTML ;
//  6. un H1 contient une ponctuation directement suivie d'une lettre ;
//  7. un hreflang (pages ou sitemap) utilise un code regional.
//
// Documents externes (PDF Supabase...) : verifies par une vraie requete
// reseau. SEO_OFFLINE=1 les liste sans les verifier (environnement sans
// reseau sortant) ; le rapport le signale explicitement.

import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { startServerProcess } from "./server-client";

const LOCALES = ["fr", "en", "de"] as const;
const MAX_PAGES = Number(process.env.SEO_MAX_PAGES ?? 600);
const OFFLINE = process.env.SEO_OFFLINE === "1";
const REPORT_DIR = path.resolve(__dirname, "../../qa-reports/seo-onpage");

const DOUBLE_PREFIX = /^\/(fr|en|de)\/(fr|en|de)(\/|$|\?|#)/;
const ALLOWED_HREFLANG = new Set(["fr", "en", "de", "x-default"]);
const ENTITY = /&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i;
const H1_GLUED = /[,.;:!?…]\p{L}/u;
const SKIP_PATH = /^\/(api|admin|_next|og)(\/|$)/;
// Routes dont le contenu vient de Supabase (biens, articles, fiches
// off-market). Hors ligne (SEO_OFFLINE=1) elles ne peuvent pas repondre :
// listees comme NON VERIFIEES dans le rapport, jamais comptees comme OK.
const DATA_ROUTE = /^\/(fr|en|de)\/(biens(\/|$|\?)|biens$|blog\/[^/?]+|journal\/[^/?]+|off-market\/(?!arcova)[^/?]+)/;

interface PageFacts {
  url: string;
  status: number;
  title: string;
  description: string | null;
  h1: string[];
  hreflang: string[];
  noindex: boolean;
  links: string[];
  documents: string[];
}

// Extraction depuis le HTML rendu par le serveur, sans navigateur (le bac a
// sable macOS de l'environnement d'execution interdit le lancement de
// Chromium). React rend des attributs toujours entre guillemets doubles.
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decode(s: string): string {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => ENTITIES[n]);
}
/** Equivalent de textContent : balises et commentaires retires, SANS
 *  ajouter d'espace (un H1 colle doit rester colle). */
function textContent(html: string): string {
  return decode(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}
function attrOf(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`\\s${name}="([^"]*)"`, "i"));
  return m ? decode(m[1]) : null;
}

function extract(html: string) {
  const head = html.split(/<body[\s>]/i)[0];
  const tags = (re: RegExp, src = html) => src.match(re) ?? [];
  const metas = tags(/<meta\b[^>]*>/gi, head);
  const meta = (n: string) => metas.find((m) => attrOf(m, "name") === n);
  const descTag = meta("description");
  const robots = (meta("robots") ? attrOf(meta("robots")!, "content") : "")?.toLowerCase() ?? "";
  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return {
    title: titleMatch ? textContent(titleMatch[1]) : "",
    description: descTag ? attrOf(descTag, "content") : null,
    h1: [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => textContent(m[1])),
    hreflang: tags(/<link\b[^>]*>/gi, head)
      .filter((l) => attrOf(l, "rel") === "alternate" && attrOf(l, "hreflang") !== null)
      .map((l) => attrOf(l, "hreflang")!),
    noindex: robots.includes("noindex"),
    hrefs: tags(/<a\b[^>]*>/gi).map((a) => attrOf(a, "href") ?? ""),
  };
}

function classify(href: string): { internal?: string; document?: string } {
  if (!href || href.startsWith("#") || /^(mailto|tel|sms|javascript):/i.test(href)) return {};
  let u: URL;
  try {
    u = new URL(href, "https://mapaproperty.lu");
  } catch {
    return {};
  }
  const sameSite = /(^|\.)mapaproperty\.lu$/.test(u.hostname);
  if (/\.pdf$/i.test(u.pathname) || /\/storage\/v1\/object\//.test(u.pathname)) {
    return { document: sameSite ? u.pathname + u.search : u.href };
  }
  if (!sameSite) return {};
  return { internal: u.pathname + u.search };
}

test("seo-onpage : liens, titles, descriptions, H1, hreflang (fr, en, de)", async ({ request }) => {
  const server = await startServerProcess();
  const failures: string[] = [];
  const facts = new Map<string, PageFacts>();
  const linkSources = new Map<string, Set<string>>();
  const documents = new Map<string, Set<string>>();
  const statusCache = new Map<string, number>();

  async function finalStatus(url: string): Promise<{ status: number; html?: string }> {
    let current = url;
    for (let hop = 0; hop < 5; hop++) {
      const r = await server.request(current);
      if (r.status >= 300 && r.status < 400 && r.headers.location) {
        current = new URL(r.headers.location, "https://mapaproperty.lu").pathname;
        continue;
      }
      return { status: r.status, html: r.headers["content-type"]?.includes("text/html") ? r.body : undefined };
    }
    return { status: 310 };
  }

  const queue: string[] = LOCALES.map((l) => `/${l}`);
  const seen = new Set(queue);
  while (queue.length && facts.size < MAX_PAGES) {
    const url = queue.shift()!;
    if (facts.size % 25 === 0) console.log(`crawl : ${facts.size} pages, ${queue.length} en file`);
    const t0 = Date.now();
    const { status, html } = await finalStatus(url);
    if (process.env.SEO_DEBUG) console.log(`GET ${url} ${status} ${Date.now() - t0} ms`);
    statusCache.set(url, status);
    if (!html) {
      facts.set(url, { url, status, title: "", description: null, h1: [], hreflang: [], noindex: true, links: [], documents: [] });
      continue;
    }
    const t1 = Date.now();
    const x = extract(html);
    if (process.env.SEO_DEBUG) console.log(`  extract ${Date.now() - t1} ms`);
    const links: string[] = [];
    const docs: string[] = [];
    for (const href of x.hrefs) {
      const c = classify(href);
      if (c.document) {
        docs.push(c.document);
        if (!documents.has(c.document)) documents.set(c.document, new Set());
        documents.get(c.document)!.add(url);
      }
      if (!c.internal) continue;
      links.push(c.internal);
      if (!linkSources.has(c.internal)) linkSources.set(c.internal, new Set());
      linkSources.get(c.internal)!.add(url);
      const p = c.internal.split("?")[0];
      if (SKIP_PATH.test(p)) continue;
      // Crawl limite aux pages localisees (le reste est verifie en statut).
      if (OFFLINE && DATA_ROUTE.test(c.internal)) continue;
      if (/^\/(fr|en|de)(\/|$)/.test(p) && !seen.has(p) && !DOUBLE_PREFIX.test(p)) {
        seen.add(p);
        queue.push(p);
      }
    }
    facts.set(url, { url, status, title: x.title, description: x.description, h1: x.h1, hreflang: x.hreflang, noindex: x.noindex, links, documents: docs });
  }

  // 1 + 2 : liens internes.
  const uncheckedLinks: string[] = [];
  for (const [link, sources] of linkSources) {
    const from = [...sources].slice(0, 3).join(", ");
    if (DOUBLE_PREFIX.test(link)) failures.push(`[double prefixe] ${link} (depuis ${sources.size} page(s) : ${from})`);
    if (SKIP_PATH.test(link.split("?")[0])) continue;
    if (OFFLINE && DATA_ROUTE.test(link)) {
      uncheckedLinks.push(link);
      continue;
    }
    let status = statusCache.get(link);
    if (status === undefined) {
      const t0 = Date.now();
      status = (await finalStatus(link)).status;
      if (process.env.SEO_DEBUG) console.log(`LINK ${link} ${status} ${Date.now() - t0} ms`);
      statusCache.set(link, status);
    }
    if (status !== 200) failures.push(`[lien ${status}] ${link} (depuis ${sources.size} page(s) : ${from})`);
  }

  // 2 : documents lies.
  const unchecked: string[] = [];
  for (const [doc, sources] of documents) {
    const from = [...sources].slice(0, 3).join(", ");
    if (doc.startsWith("/")) {
      const { status } = await finalStatus(doc);
      if (status !== 200) failures.push(`[document ${status}] ${doc} (depuis ${from})`);
    } else if (OFFLINE) {
      unchecked.push(doc);
    } else {
      const r = await request.get(doc, { failOnStatusCode: false, maxRedirects: 5 });
      if (r.status() !== 200) failures.push(`[document ${r.status()}] ${doc} (depuis ${from})`);
    }
  }

  // 3 a 7 : contenu des pages indexables.
  const indexable = [...facts.values()].filter((f) => f.status === 200 && !f.noindex && f.title);
  const byTitle = new Map<string, string[]>();
  const byDesc = new Map<string, string[]>();
  for (const f of indexable) {
    byTitle.set(f.title, [...(byTitle.get(f.title) ?? []), f.url]);
    if (f.description) byDesc.set(f.description, [...(byDesc.get(f.description) ?? []), f.url]);
    if (/Mapa/.test(f.title)) failures.push(`[title "Mapa"] ${f.url} : ${f.title}`);
    if ((f.title.match(/MAPA Property/g) ?? []).length > 1) failures.push(`[title double marque] ${f.url} : ${f.title}`);
    if (f.description && (f.description.includes("<") || ENTITY.test(f.description))) {
      failures.push(`[description HTML] ${f.url} : ${f.description.slice(0, 80)}`);
    }
    for (const h of f.h1) if (H1_GLUED.test(h)) failures.push(`[H1 colle] ${f.url} : ${h}`);
    for (const code of f.hreflang) if (!ALLOWED_HREFLANG.has(code)) failures.push(`[hreflang ${code}] ${f.url}`);
  }
  for (const [title, urls] of byTitle) if (urls.length > 1) failures.push(`[title partage x${urls.length}] "${title}" : ${urls.slice(0, 4).join(", ")}`);
  for (const [desc, urls] of byDesc) if (urls.length > 1) failures.push(`[description partagee x${urls.length}] "${desc.slice(0, 60)}..." : ${urls.slice(0, 4).join(", ")}`);

  // 7 : hreflang du sitemap.
  const sitemap = await server.request("/sitemap.xml");
  for (const m of sitemap.body.matchAll(/hreflang="([^"]+)"/g)) {
    if (!ALLOWED_HREFLANG.has(m[1])) failures.push(`[sitemap hreflang ${m[1]}]`);
  }

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(REPORT_DIR, "report.json"),
    JSON.stringify({
      pages: facts.size,
      indexable: indexable.length,
      internalLinks: linkSources.size,
      documents: [...documents.keys()],
      documentsUnchecked: unchecked,
      offlineUncheckedLinks: uncheckedLinks,
      sitemapEntries: (sitemap.body.match(/<url>/g) ?? []).length,
      failures,
    }, null, 2),
  );
  console.log(`pages ${facts.size}, indexables ${indexable.length}, liens internes ${linkSources.size}, documents ${documents.size}`);
  if (OFFLINE) {
    console.log(`SEO_OFFLINE=1 : NON VERIFIES ${uncheckedLinks.length} lien(s) dependant de Supabase et ${unchecked.length} document(s) externe(s) (cf. qa-reports/seo-onpage/report.json). Relancer avec reseau pour une verification complete.`);
  }
  await server.close();
  expect(failures, failures.join("\n")).toEqual([]);
});
