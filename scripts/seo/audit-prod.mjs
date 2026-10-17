// Controle final en LECTURE SEULE du site en ligne (oct. 2026, etape 10).
// Aucune ecriture, aucun formulaire envoye : uniquement des requetes GET,
// une a la fois, avec une pause entre deux requetes. User-Agent generique,
// sans nom, e-mail ni nom de societe.
//
// Usage (Terminal.app, hors bac a sable) :
//   node scripts/seo/audit-prod.mjs --base https://mapaproperty.lu
// Options : --pause 500 (millisecondes entre deux requetes, 500 par defaut)
//           --limit 20 (n'examiner que les 20 premieres adresses, essai)
// Resultat : essais-pdf/audit-prod/rapport.txt (lisible) et rapport.json.
//
// Controles par page du sitemap : statut 200 sans redirection, une seule
// balise title, un seul H1, un seul bloc RealEstateAgent, canonical egal a
// l'adresse, hreflang fr/en/de/x-default coherents, og:url egal au
// canonical, og:title et twitter:title egaux au titre, og:description et
// twitter:description egales a la description, og:locale de la langue,
// description de 155 caracteres au plus, titres en double, images sans
// texte alternatif, FAQ (section et un seul FAQPage coherents), aucun
// "beta." dans le code, tirets longs et moyens dans le texte visible,
// le titre et la description.
// Puis : robots.txt, sitemap, liens internes (404, redirections en chaine).

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const arg = (n, d) => {
  const i = process.argv.indexOf(`--${n}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const BASE = (arg("base", "") || "").replace(/\/$/, "");
const PAUSE = Number(arg("pause", "500"));
const LIMIT = Number(arg("limit", "0"));
if (!/^https:\/\/(www\.)?mapaproperty\.lu$/.test(BASE) && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) {
  console.error("usage : --base https://mapaproperty.lu");
  process.exit(2);
}
const UA = "Mozilla/5.0 (compatible; controle-seo/1.0)";
const OUT = join(import.meta.dirname, "..", "..", "essais-pdf", "audit-prod");
const OG_LOCALE = { fr: "fr_LU", en: "en_GB", de: "de_LU" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0;
async function get(url, redirect = "manual") {
  if (requests++ > 0) await sleep(PAUSE);
  const r = await fetch(url, { redirect, headers: { "user-agent": UA, accept: "text/html,application/xml;q=0.9,*/*;q=0.8" } });
  const body = r.status >= 300 && r.status < 400 ? "" : await r.text();
  return { status: r.status, location: r.headers.get("location"), body };
}
const decode = (s) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");
const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? decode(m[1]) : null;
};
const metas = (html, key, name) => [...html.matchAll(new RegExp(`<meta[^>]*${key}="${name}"[^>]*>`, "g"))].map((m) => attr(m[0], "content") ?? "");
const abs = (u) => (u ? new URL(u, BASE).toString() : "");

const pages = [];
const issues = [];
const titles = new Map();
const dashes = [];
const internalLinks = new Map();
const note = (url, msg) => issues.push(`${url} : ${msg}`);

// 1. robots.txt et sitemap.
const robots = await get(`${BASE}/robots.txt`);
const robotsIssues = [];
if (robots.status !== 200) robotsIssues.push(`statut ${robots.status}`);
if (/User-agent:\s*\*\s*\nDisallow:\s*\/\s*$/im.test(robots.body)) robotsIssues.push("Disallow: / pour tous les robots");
if (!new RegExp(`Sitemap:\\s*${BASE.replace(/\./g, "\\.")}/sitemap\\.xml`, "i").test(robots.body)) robotsIssues.push("ligne Sitemap absente ou autre domaine");
if (/beta\./i.test(robots.body)) robotsIssues.push('"beta." present');
const sm = await get(`${BASE}/sitemap.xml`);
const smUrls = [...sm.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => decode(m[1]));
const smIssues = [];
if (sm.status !== 200) smIssues.push(`statut ${sm.status}`);
if (!smUrls.length) smIssues.push("aucune adresse");
for (const u of smUrls) if (!u.startsWith(BASE + "/")) smIssues.push(`autre domaine : ${u}`);
if (/beta\./i.test(sm.body)) smIssues.push('"beta." present');
const urls = LIMIT ? smUrls.slice(0, LIMIT) : smUrls;
console.log(`sitemap : ${smUrls.length} adresses ; examen de ${urls.length}`);

// 2. Pages du sitemap.
for (const url of urls) {
  const path = new URL(url).pathname;
  const lang = path.split("/")[1];
  let r;
  try {
    r = await get(url);
  } catch (e) {
    note(url, `erreur reseau ${e?.cause?.code ?? e?.message}`);
    continue;
  }
  if (r.status !== 200) {
    note(url, `statut ${r.status}${r.location ? ` vers ${r.location}` : ""} (adresse du sitemap)`);
    continue;
  }
  const html = r.body;
  const head = html.slice(0, Math.max(html.indexOf("</head>"), 0) || 200000);
  const page = { url };
  pages.push(page);
  const ts = [...head.matchAll(/<title>([^<]*)<\/title>/g)].map((m) => decode(m[1]));
  const title = ts[0] ?? "";
  const desc = metas(head, "name", "description")[0] ?? "";
  if (ts.length !== 1) note(url, `${ts.length} balises title`);
  (titles.get(title) ?? titles.set(title, []).get(title)).push(url);
  if (desc.length > 155) note(url, `description de ${desc.length} caracteres`);
  const h1 = (html.match(/<h1\b/g) ?? []).length;
  if (h1 !== 1) note(url, `${h1} H1`);
  // Donnees structurees.
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => {
    try {
      return JSON.parse(m[1]);
    } catch {
      note(url, "bloc JSON-LD illisible");
      return null;
    }
  });
  const nodes = blocks.flatMap((b) => (b && Array.isArray(b["@graph"]) ? b["@graph"] : b ? [b] : []));
  const agents = nodes.filter((n) => n["@type"] === "RealEstateAgent").length;
  if (agents !== 1) note(url, `${agents} bloc(s) RealEstateAgent`);
  const faqPages = nodes.filter((n) => n["@type"] === "FAQPage");
  const faqSections = (html.match(/data-faq-section="/g) ?? []).length;
  if (faqPages.length > 1) note(url, `${faqPages.length} FAQPage`);
  if (faqSections && faqPages.length !== 1) note(url, "section FAQ sans FAQPage");
  if (!faqSections && faqPages.length) note(url, "FAQPage sans section FAQ visible");
  if (faqPages.length === 1 && faqSections) {
    const shown = (html.match(/<details class="group py-4">/g) ?? []).length;
    const listed = (faqPages[0].mainEntity ?? []).length;
    if (shown !== listed) note(url, `FAQ : ${shown} questions affichees, ${listed} dans FAQPage`);
  }
  // Canonical, hreflang, partage.
  const canon = [...head.matchAll(/<link[^>]*rel="canonical"[^>]*>/g)].map((m) => abs(attr(m[0], "href")));
  if (canon.length !== 1 || canon[0] !== url) note(url, `canonical ${canon.join(" | ") || "absent"}`);
  const alts = Object.fromEntries([...head.matchAll(/<link[^>]*rel="alternate"[^>]*hreflang="[^"]*"[^>]*>/gi)].map((m) => [attr(m[0], "hrefLang") ?? attr(m[0], "hreflang"), abs(attr(m[0], "href"))]));
  for (const l of ["fr", "en", "de", "x-default"]) if (!alts[l]) note(url, `hreflang ${l} absent`);
  if (alts[lang] && alts[lang] !== url) note(url, `hreflang ${lang} vers ${alts[lang]}`);
  if (alts["x-default"] && alts.fr && alts["x-default"] !== alts.fr) note(url, "x-default different de la version fr");
  page.alts = alts;
  const ogUrl = metas(head, "property", "og:url")[0];
  if (abs(ogUrl) !== (canon[0] ?? "")) note(url, `og:url ${ogUrl ?? "absent"}`);
  if ((metas(head, "property", "og:title")[0] ?? "") !== title) note(url, "og:title different du titre");
  if ((metas(head, "name", "twitter:title")[0] ?? "") !== title) note(url, "twitter:title different du titre");
  if ((metas(head, "property", "og:description")[0] ?? "") !== desc) note(url, "og:description differente de la description");
  if ((metas(head, "name", "twitter:description")[0] ?? "") !== desc) note(url, "twitter:description differente de la description");
  if (OG_LOCALE[lang] && metas(head, "property", "og:locale")[0] !== OG_LOCALE[lang]) note(url, `og:locale ${metas(head, "property", "og:locale")[0] ?? "absent"}`);
  if (/beta\.mapaproperty|\/\/beta\./i.test(html)) note(url, '"beta." dans le code de la page');
  // Images.
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    const alt = attr(m[0], "alt");
    const hidden = /aria-hidden="true"|role="presentation"/.test(m[0]);
    if (alt === null) note(url, `image sans alt : ${(attr(m[0], "src") ?? "").slice(0, 80)}`);
    else if (!alt.trim() && !hidden && !/aria-hidden="true"/.test(html.slice(Math.max(0, m.index - 600), m.index))) note(url, `image a l'alt vide : ${(attr(m[0], "src") ?? "").slice(0, 80)}`);
  }
  // Tirets longs et moyens : titre, description, texte visible.
  const visible = decode(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<head\b[\s\S]*?<\/head>/i, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ");
  for (const [where, text] of [["titre", title], ["description", desc], ["texte", visible]]) {
    for (const m of text.matchAll(/[–—]/g)) {
      dashes.push(`${url} [${where}] « …${text.slice(Math.max(0, m.index - 45), m.index + 45).trim()}… »`);
    }
  }
  // Liens internes.
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const href = decode(m[1]);
    if (/^(mailto:|tel:|#|javascript:)/i.test(href)) continue;
    let u;
    try {
      u = new URL(href, url);
    } catch {
      continue;
    }
    if (u.origin !== new URL(BASE).origin) continue;
    if (/^\/(admin|api|_next)\b/.test(u.pathname)) continue;
    u.hash = "";
    const key = u.toString();
    if (!internalLinks.has(key)) internalLinks.set(key, url);
  }
  process.stdout.write(".");
}
console.log("");

// 3. Titres en double.
for (const [t, us] of titles) if (us.length > 1) issues.push(`titre en double « ${t} » : ${us.join(", ")}`);

// 4. hreflang reciproques : chaque version annoncee renvoie vers les autres.
const byUrl = new Map(pages.map((p) => [p.url, p]));
for (const p of pages) {
  for (const l of ["fr", "en", "de"]) {
    const other = p.alts?.[l];
    const op = other ? byUrl.get(other) : null;
    if (other && op && op.alts && JSON.stringify({ fr: op.alts.fr, en: op.alts.en, de: op.alts.de }) !== JSON.stringify({ fr: p.alts.fr, en: p.alts.en, de: p.alts.de })) {
      issues.push(`${p.url} : hreflang non reciproque avec ${other}`);
    }
  }
}

// 5. Liens internes hors sitemap : 404 et redirections en chaine.
const inSitemap = new Set(smUrls);
const linkIssues = [];
let checked = 0;
for (const [link, from] of internalLinks) {
  if (inSitemap.has(link)) continue;
  checked++;
  try {
    const r = await get(link);
    if (r.status >= 400) linkIssues.push(`${link} : statut ${r.status} (lien depuis ${from})`);
    else if (r.status >= 300) {
      const to = new URL(r.location ?? "/", link).toString();
      const r2 = await get(to);
      if (r2.status >= 300 && r2.status < 400) linkIssues.push(`${link} : redirection en chaine ${r.status} vers ${to}, puis ${r2.status} vers ${r2.location} (lien depuis ${from})`);
      else if (r2.status >= 400) linkIssues.push(`${link} : redirige vers ${to} qui repond ${r2.status} (lien depuis ${from})`);
      else linkIssues.push(`${link} : redirection simple ${r.status} vers ${to} (lien depuis ${from}, a remplacer par l'adresse finale)`);
    }
  } catch (e) {
    linkIssues.push(`${link} : erreur reseau ${e?.cause?.code ?? e?.message}`);
  }
}

// 6. Rapport.
const lines = [
  `Controle du ${new Date().toISOString()} sur ${BASE}`,
  `${requests} requetes, pause ${PAUSE} ms, User-Agent "${UA}"`,
  "",
  `robots.txt : ${robotsIssues.length ? robotsIssues.join(" ; ") : "conforme"}`,
  `sitemap : ${smUrls.length} adresses ; ${smIssues.length ? smIssues.join(" ; ") : "conforme"}`,
  "",
  `PAGES DU SITEMAP : ${pages.length} examinees, ${issues.length} point(s)`,
  ...issues.map((i) => `  - ${i}`),
  "",
  `LIENS INTERNES HORS SITEMAP : ${checked} verifies, ${linkIssues.length} point(s)`,
  ...linkIssues.map((i) => `  - ${i}`),
  "",
  `TIRETS LONGS ET MOYENS : ${dashes.length}`,
  ...dashes.map((d) => `  - ${d}`),
];
await mkdir(OUT, { recursive: true });
await writeFile(join(OUT, "rapport.txt"), lines.join("\n") + "\n");
await writeFile(join(OUT, "rapport.json"), JSON.stringify({ base: BASE, robotsIssues, smIssues, issues, linkIssues, dashes, pages: pages.length }, null, 1));
console.log(lines.slice(0, 8).join("\n"));
console.log(`\nRapport complet : essais-pdf/audit-prod/rapport.txt (${issues.length + linkIssues.length} point(s), ${dashes.length} tiret(s))`);
