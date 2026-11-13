// Sitemaps par type (nov. 2026, audit SEO, partie C3), sans serveur ni
// reseau. Pour chaque adresse calculable sans la base (pages fixes, pages
// "biens a vendre / a louer", mandats, villes du Luxembourg) :
//  - jamais bloquee par robots.txt (memes regles que lib/robots-rules.ts) ;
//  - page publique sans "noindex" ;
//  - canonical = elle-meme (la page declare exactement ce chemin) ;
// et pour les fichiers : index a /sitemap.xml, un fichier par type, aucune
// adresse avec parametre hors des 6 permises, liste d'attente absente.
// Les adresses lues en base (biens, articles, recherches, off-market) sont
// verifiees sur le serveur par tests/seo/redirects.spec.ts.
// Lancement : node --import tsx scripts/seo/test-sitemaps.mts
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SITEMAP_TYPES, STATIC_PATHS, renderSitemapIndex, renderSitemapXml, sitemapEntries } from "../../lib/sitemaps";
import { PRIVATE_PATHS, QUERY_ALLOW, QUERY_DISALLOW } from "../../lib/robots-rules";
import { luxembourgCities } from "../../lib/cities";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  await fn();
  pass++;
  console.log(`PASS ${name}`);
};

// Correspondance robots.txt (Google) : * = n'importe quoi, $ = fin ; la
// regle la plus longue l'emporte, Allow gagne a egalite.
const toRe = (rule: string) => new RegExp(`^${rule.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")}`);
function blocked(pathWithQuery: string): boolean {
  const dis = [...PRIVATE_PATHS, ...QUERY_DISALLOW].filter((r) => toRe(r).test(pathWithQuery)).sort((a, b) => b.length - a.length)[0];
  const allow = [...QUERY_ALLOW].filter((r) => toRe(r).test(pathWithQuery)).sort((a, b) => b.length - a.length)[0];
  if (!dis) return false;
  return !allow || allow.length < dis.length;
}

function pageFile(path: string): string {
  const clean = path.split("?")[0].replace(/^\/(fr|en|de)/, "");
  if (/^\/mandats\//.test(clean)) return "app/[locale]/mandats/[type]/page.tsx";
  if (/^\/villes\//.test(clean)) return "app/[locale]/villes/[ville]/page.tsx";
  return `app/[locale]${clean}/page.tsx`;
}

await test("index a /sitemap.xml, un fichier par type", () => {
  assert.ok(existsSync(join(root, "app/sitemap.xml/route.ts")) && existsSync(join(root, "app/sitemaps/[file]/route.ts")));
  assert.ok(!existsSync(join(root, "app/sitemap.ts")));
  assert.deepEqual([...SITEMAP_TYPES], ["pages", "biens", "villes", "journal", "recherches", "off-market", "mandats"]);
  const index = renderSitemapIndex();
  for (const t of SITEMAP_TYPES) assert.ok(index.includes(`/sitemaps/${t}.xml</loc>`), t);
  assert.ok(read("lib/robots-rules.ts").includes("sitemap: `${siteUrl}/sitemap.xml`"));
});

const pages = await sitemapEntries("pages");
const mandats = await sitemapEntries("mandats");

await test("pages : 28 pages fixes x 3 langues + les 6 pages biens a vendre / a louer", () => {
  assert.equal(pages.length, STATIC_PATHS.length * 3 + 6);
  const withQuery = pages.filter((e) => e.url.includes("?")).map((e) => new URL(e.url).pathname + new URL(e.url).search);
  assert.deepEqual(withQuery.sort(), ["/de/biens?transaction=rent", "/de/biens?transaction=sale", "/en/biens?transaction=rent", "/en/biens?transaction=sale", "/fr/biens?transaction=rent", "/fr/biens?transaction=sale"]);
  assert.ok(!pages.some((e) => e.url.includes("/liste-attente")), "liste d'attente hors du sitemap");
});

await test("liste d'attente : noindex, follow ; ARCOVA indexable", () => {
  assert.ok(/robots: \{ index: false, follow: true \}/.test(read("app/[locale]/liste-attente/page.tsx")));
  assert.ok(!/index: false/.test(read("app/[locale]/off-market/arcova/page.tsx")));
  assert.ok(STATIC_PATHS.includes("/off-market/arcova"));
});

await test("chaque adresse : jamais bloquee, jamais noindex, canonical = elle-meme", () => {
  const villes = ["fr", "en", "de"].flatMap((l) => luxembourgCities.map((c) => `/${l}/villes/${c.slug}`));
  const all = [...pages, ...mandats].map((e) => new URL(e.url).pathname + new URL(e.url).search).concat(villes);
  for (const p of all) {
    assert.ok(!blocked(p), `${p} bloquee par robots.txt`);
    const f = pageFile(p);
    assert.ok(existsSync(join(root, f)), `${p} : page absente (${f})`);
    const src = read(f);
    const bare = p.replace(/^\/(fr|en|de)/, "");
    if (f.includes("[")) continue; // modeles dynamiques : canonical construite depuis l'adresse
    assert.ok(!/robots:\s*\{\s*index:\s*false/.test(src), `${p} : noindex`);
    if (bare.startsWith("/biens?transaction=")) assert.ok(src.includes("pageAlternates(locale, `/biens?transaction=${tx}`)"), p);
    else if (bare === "") assert.ok(/pageAlternates\(locale, "\/?"\)|seoPageMetadata\(locale, "home", ""\)|alternates/.test(src), p);
    else assert.ok(src.includes(`"${bare}"`) || src.includes("intentPageMetadata") || src.includes("intent"), `${p} : canonical`);
  }
});

await test("format : hreflang fr, en, de, x-default ; pas de date sur les pages fixes", () => {
  const xml = renderSitemapXml(pages);
  for (const h of ["fr", "en", "de", "x-default"]) assert.ok(xml.includes(`hreflang="${h}"`), h);
  assert.ok(!xml.includes("<lastmod>"));
  assert.ok(!/hreflang="[a-z]{2}-[A-Z]{2}"/.test(xml));
});

console.log(`${pass} PASS, 0 FAIL`);
