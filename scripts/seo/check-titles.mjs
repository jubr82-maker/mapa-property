// Titres et descriptions Google (oct. 2026) : titres en double (deux pages,
// meme titre exact), meta descriptions de plus de 155 caracteres, titres
// de fiches de biens de plus de 60 caracteres, separateur "|" restant.
// Lit le HTML pre-rendu du dernier build (.next/server/app), aucune
// requete reseau. Usage : node scripts/seo/check-titles.mjs
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const APP = join(import.meta.dirname, "..", "..", ".next", "server", "app");
const decode = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const walk = (d, o = []) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p, o);
    else if (f.endsWith(".html")) o.push(p);
  }
  return o;
};
const files = ["fr", "en", "de"].filter((l) => existsSync(join(APP, l))).flatMap((l) => [join(APP, `${l}.html`), ...walk(join(APP, l))]);
const byTitle = new Map();
const issues = [];
const skipped = [];
let pages = 0;
for (const f of files) {
  const html = readFileSync(f, "utf8");
  const path = "/" + relative(APP, f).replace(/\.html$/, "");
  // Redirections (statut 3xx dans le .meta du build) et pages exclues de
  // l'index (noindex, page de test) : jamais montrees par Google.
  const metaFile = f.replace(/\.html$/, ".meta");
  const status = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, "utf8")).status ?? 200 : 200;
  if (status >= 300 && status < 400) { skipped.push(`${path} (redirection ${status})`); continue; }
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) { skipped.push(`${path} (noindex)`); continue; }
  const title = decode((/<title>([^<]*)<\/title>/.exec(html) ?? [])[1] ?? "");
  const desc = decode((/<meta name="description" content="([^"]*)"/.exec(html) ?? [])[1] ?? "");
  if (!title) continue;
  pages++;
  (byTitle.get(title) ?? byTitle.set(title, []).get(title)).push(path);
  if (desc.length > 155) issues.push(`description ${desc.length} : ${path}`);
  if (/ \| /.test(title)) issues.push(`separateur "|" : ${path} (${title})`);
  if (/\/biens\/[^/]+$/.test(path) && title.length > 60) issues.push(`titre de fiche ${title.length} : ${path} (${title})`);
}
for (const [t, ps] of byTitle) if (ps.length > 1) issues.push(`titre en double (${ps.length}) "${t}" : ${ps.join(", ")}`);
for (const i of issues) console.log(i);
console.log(`\n${pages} pages, ${issues.length} point(s) a corriger ; ${skipped.length} ignorees (redirections, noindex)`);
if (issues.length) process.exit(1);
