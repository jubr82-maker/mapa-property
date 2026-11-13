// Controle des balises de partage (oct. 2026) : pour chaque page, og:url
// doit etre egal au canonical, og:title et twitter:title au titre de la
// page, og:description et twitter:description a sa meta description,
// og:locale a la langue (fr_LU, en_GB, de_LU), une seule balise title.
//
// Deux modes, aucune requete hors de la machine :
//   node scripts/seo/check-social.mjs --build
//     lit le HTML pre-rendu du dernier build (.next/server/app) ;
//   node scripts/seo/check-social.mjs --base http://127.0.0.1:3104
//     interroge le serveur local : adresses du sitemap, ou, si le sitemap
//     est vide (site beta), celles du build et des pages fixes du sitemap.
// Sortie : liste des pages en defaut, puis "0 page en defaut" ou code 1.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..", "..");
const arg = (n) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const BASE = arg("base");
const BUILD = process.argv.includes("--build");
if (!BASE && !BUILD) {
  console.error("usage : --build ou --base http://127.0.0.1:<port>");
  process.exit(2);
}
if (BASE && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) {
  console.error("--base : serveur local uniquement");
  process.exit(2);
}
const OG_LOCALE = { fr: "fr_LU", en: "en_GB", de: "de_LU" };
const APP = join(root, ".next", "server", "app");

const decode = (s) =>
  s
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;/g, "/")
    .replace(/&amp;/g, "&");
const meta = (html, attr, name) => {
  const re = new RegExp(`<meta[^>]*${attr}="${name}"[^>]*>`, "g");
  return [...html.matchAll(re)].map((m) => decode((/content="([^"]*)"/.exec(m[0]) ?? [])[1] ?? ""));
};
const head = (html) => html.slice(0, html.indexOf("</head>") > 0 ? html.indexOf("</head>") : 200000);

function check(path, full) {
  const html = head(full);
  const issues = [];
  const titles = [...html.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
  const canon = [...html.matchAll(/<link[^>]*rel="canonical"[^>]*>/g)].map((m) => decode((/href="([^"]*)"/.exec(m[0]) ?? [])[1] ?? ""));
  const desc = meta(html, "name", "description");
  const ogUrl = meta(html, "property", "og:url");
  const ogTitle = meta(html, "property", "og:title");
  const ogDesc = meta(html, "property", "og:description");
  const ogLocale = meta(html, "property", "og:locale");
  const twTitle = meta(html, "name", "twitter:title");
  const twDesc = meta(html, "name", "twitter:description");
  const lang = path.split("/")[1];
  if (titles.length !== 1) issues.push(`${titles.length} balises title`);
  if (canon.length !== 1) issues.push(`${canon.length} canonical`);
  if (ogUrl.length !== 1 || ogUrl[0] !== canon[0]) issues.push(`og:url ${ogUrl.join(" | ") || "absent"} au lieu de ${canon[0] ?? "?"}`);
  if (ogTitle[0] !== titles[0]) issues.push(`og:title "${ogTitle[0] ?? "absent"}" au lieu de "${titles[0] ?? "?"}"`);
  if (twTitle[0] !== titles[0]) issues.push(`twitter:title "${twTitle[0] ?? "absent"}"`);
  if ((ogDesc[0] ?? "") !== (desc[0] ?? "")) issues.push(`og:description differente de la description`);
  if ((twDesc[0] ?? "") !== (desc[0] ?? "")) issues.push(`twitter:description differente de la description`);
  if (OG_LOCALE[lang] && ogLocale[0] !== OG_LOCALE[lang]) issues.push(`og:locale ${ogLocale[0] ?? "absent"} au lieu de ${OG_LOCALE[lang]}`);
  return issues;
}

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f.endsWith(".html")) out.push(p);
  }
  return out;
}

function buildPaths() {
  if (!existsSync(APP)) return [];
  return ["fr", "en", "de"]
    .filter((l) => existsSync(join(APP, l)))
    .flatMap((l) => [`/${l}`, ...walk(join(APP, l)).map((f) => "/" + relative(APP, f).replace(/\.html$/, ""))])
    .filter((p) => !/\/(_not-found|test-scroll)|\[/.test(p));
}

function sitemapStaticPaths() {
  const src = readFileSync(join(root, "lib", "sitemaps.ts"), "utf8");
  const block = /export const STATIC_PATHS = \[([\s\S]*?)\];/.exec(src)?.[1] ?? "";
  const paths = [...block.matchAll(/"([^"]*)"/g)].map((m) => m[1]);
  return ["fr", "en", "de"].flatMap((l) => paths.map((p) => `/${l}${p}`));
}

let pages = [];
if (BUILD) {
  pages = buildPaths().map((p) => ({ path: p, html: () => readFileSync(join(APP, `${p}.html`), "utf8") }));
} else {
  let urls = [];
  try {
    // Index des sitemaps (nov. 2026) : un fichier par type.
    const index = await (await fetch(`${BASE}/sitemap.xml`)).text();
    for (const f of [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname)) {
      const xml = await (await fetch(`${BASE}${f}`)).text();
      urls.push(...[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname));
    }
  } catch {}
  if (urls.length === 0) {
    console.log("sitemap vide (site beta) : pages du build et pages fixes du sitemap");
    urls = [...new Set([...sitemapStaticPaths(), ...buildPaths()])];
  }
  pages = urls.map((p) => ({ path: p, html: async () => {
    const r = await fetch(`${BASE}${p}`, { redirect: "manual" });
    if (r.status !== 200) throw new Error(`statut ${r.status}`);
    return r.text();
  } }));
}

let bad = 0;
for (const pg of pages) {
  let issues;
  try {
    issues = check(pg.path, await pg.html());
  } catch (e) {
    issues = [e instanceof Error ? e.message : String(e)];
  }
  if (issues.length) {
    bad++;
    console.log(`${pg.path}\n   ${issues.join("\n   ")}`);
  }
}
console.log(`\n${pages.length} pages controlees, ${bad} page(s) en defaut`);
if (bad) process.exit(1);
