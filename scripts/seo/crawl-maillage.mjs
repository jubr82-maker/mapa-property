// scripts/seo/crawl-maillage.mjs : controle du maillage interne (nov. 2026,
// audit SEO du 12/11/2026, partie G). Node seul, aucune dependance.
// Explore depuis BASE (par defaut http://localhost:3005) toutes les pages
// internes HTML, sans suivre les adresses bloquees par robots.txt,
// User-Agent generique "Mozilla/5.0". Affiche, pour chaque page indexable
// (statut 200, sans noindex, canonical = elle-meme), le nombre de pages qui
// lui font un lien et sa profondeur depuis /fr ; en rouge les pages sous
// 3 liens entrants. Verifie en particulier les adresses de l'annexe A de
// l'audit, lues dans scripts/seo/annexe-a-audit-2026-11-12.txt (une adresse
// par ligne, sans le domaine, ex. /fr/villes/steinfort).
// Lancement (machine de Julien) :
//   pnpm build && pnpm start -p 3005
//   node scripts/seo/crawl-maillage.mjs        (ou BASE=... node ...)
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE ?? "http://localhost:3005").replace(/\/$/, "");
const UA = "Mozilla/5.0";
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 3000);
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const ANNEX = join(import.meta.dirname, "annexe-a-audit-2026-11-12.txt");

// --- robots.txt : groupe "*" (regles de Google : la plus longue l'emporte, Allow a egalite).
async function loadRobots() {
  const txt = await (await fetch(`${BASE}/robots.txt`, { headers: { "user-agent": UA } })).text();
  const rules = [];
  let star = false;
  for (const raw of txt.split("\n")) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (!m) continue;
    const [, k, v] = m;
    if (/^user-agent$/i.test(k)) star = v === "*";
    else if (star && /^(allow|disallow)$/i.test(k) && v) rules.push({ allow: /^allow$/i.test(k), rule: v });
  }
  const toRe = (r) => new RegExp(`^${r.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$")}`);
  return (path) => {
    let best = null;
    for (const r of rules) if (toRe(r.rule).test(path) && (!best || r.rule.length > best.rule.length || (r.rule.length === best.rule.length && r.allow))) best = r;
    return Boolean(best && !best.allow);
  };
}

function normalize(href, from) {
  try {
    const u = new URL(href, `${BASE}${from}`);
    if (u.origin !== new URL(BASE).origin) return null;
    if (/\.(jpg|jpeg|png|webp|avif|svg|gif|pdf|xml|txt|ico|webmanifest|mp4|css|js)$/i.test(u.pathname)) return null;
    if (u.pathname.startsWith("/api/") || u.pathname.startsWith("/_next/") || u.pathname.startsWith("/admin")) return null;
    const p = u.pathname.replace(/\/$/, "") || "/";
    return p + u.search;
  } catch {
    return null;
  }
}

function canonicalPath(href, from) {
  try {
    const u = new URL(href, `${BASE}${from}`);
    return (u.pathname.replace(/\/$/, "") || "/") + u.search;
  } catch {
    return null;
  }
}

const isBlocked = await loadRobots();
const pages = new Map(); // chemin -> { status, indexable, depth, links: Set }
const inbound = new Map(); // chemin -> Set(pages sources)
const queue = [["/fr", 0]];
const seen = new Set(["/fr"]);

while (queue.length && pages.size < MAX_PAGES) {
  const [path, depth] = queue.shift();
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { headers: { "user-agent": UA }, redirect: "manual" });
  } catch {
    pages.set(path, { status: "erreur", indexable: false, depth });
    continue;
  }
  if (res.status >= 300 && res.status < 400) {
    const to = normalize(res.headers.get("location") ?? "", path);
    pages.set(path, { status: res.status, indexable: false, depth, redirect: to });
    if (to && !seen.has(to) && !isBlocked(to)) {
      seen.add(to);
      queue.push([to, depth]);
    }
    continue;
  }
  const type = res.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) continue;
  const html = await res.text();
  const noindex = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html);
  const canon = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
  // Canonical absolue sur le domaine public (mapaproperty.lu), pas sur BASE :
  // on compare le chemin seul, quel que soit le domaine (controle du 13/11/2026).
  const canonPath = canon ? canonicalPath(canon.replace(/&amp;/g, "&"), path) : null;
  const indexable = res.status === 200 && !noindex && (!canonPath || canonPath === path);
  pages.set(path, { status: res.status, indexable, depth, noindex, canonical: canonPath });
  if (res.status !== 200) continue;
  for (const m of html.matchAll(/<a\b[^>]*\bhref="([^"#]+)/gi)) {
    const to = normalize(m[1].replace(/&amp;/g, "&"), path);
    if (!to || to === path) continue;
    if (!inbound.has(to)) inbound.set(to, new Set());
    inbound.get(to).add(path);
    if (!seen.has(to) && !isBlocked(to)) {
      seen.add(to);
      queue.push([to, depth + 1]);
    }
  }
}

const rows = [...pages.entries()].filter(([, p]) => p.indexable).map(([path, p]) => ({ path, depth: p.depth, inbound: inbound.get(path)?.size ?? 0 }));
rows.sort((a, b) => a.inbound - b.inbound || a.path.localeCompare(b.path));
console.log(`\n${pages.size} pages explorees depuis ${BASE}/fr, ${rows.length} indexables\n`);
console.log("liens entrants  profondeur  page");
for (const r of rows) {
  const line = `${String(r.inbound).padStart(15)}  ${String(r.depth).padStart(10)}  ${r.path}`;
  console.log(r.inbound < 3 ? RED(line) : line);
}
const weak = rows.filter((r) => r.inbound < 3);
console.log(`\n${weak.length ? RED(`${weak.length} page(s) indexable(s) sous 3 liens entrants`) : GREEN("Aucune page indexable sous 3 liens entrants")}`);

// Annexe A de l'audit du 12/11/2026.
if (existsSync(ANNEX)) {
  const list = readFileSync(ANNEX, "utf8").split("\n").map((l) => l.replace(/#.*/, "").trim()).filter(Boolean);
  if (list.length) {
    console.log(`\nAnnexe A de l'audit (${list.length} adresses) :`);
    for (const raw of list) {
      const p = normalize(raw, "/") ?? raw;
      const page = pages.get(p);
      const n = inbound.get(p)?.size ?? 0;
      const state = !page ? "non atteinte depuis /fr" : !page.indexable ? `non indexable (statut ${page.status}${page.noindex ? ", noindex" : ""}${page.redirect ? `, vers ${page.redirect}` : ""})` : `${n} lien(s) entrant(s), profondeur ${page.depth}`;
      const bad = !page || (page.indexable && n < 3);
      console.log(`  ${bad ? RED(p) : p} : ${state}`);
    }
  } else console.log(`\nAnnexe A : fichier ${ANNEX} vide (une adresse par ligne).`);
} else console.log(`\nAnnexe A : fichier ${ANNEX} absent (une adresse par ligne).`);
process.exit(weak.length ? 1 : 0);
