// Textes alternatifs des images (oct. 2026) : lit le HTML pre-rendu du
// dernier build (.next/server/app), aucune requete reseau. Signale, page
// par page, les images sans alt, a l'alt vide sans aria-hidden, a l'alt
// generique (image, photo, nom de fichier...) ou en double sur une meme
// page pour des images differentes. Les images decoratives (alt vide ET
// aria-hidden ou role="presentation") sont comptees a part.
// Usage : node scripts/seo/check-alts.mjs [--detail]
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const APP = join(import.meta.dirname, "..", "..", ".next", "server", "app");
const DETAIL = process.argv.includes("--detail");
const decode = (s) => s.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const GENERIC = /^(image|img|photo|picture|bild|foto|logo|icon|icone|icône|banner|bannière|cover|couverture|untitled|sans titre|dsc\d*|img_\d+.*|.*\.(jpe?g|png|webp|avif|gif|svg))$/i;
const walk = (d, o = []) => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p, o);
    else if (f.endsWith(".html")) o.push(p);
  }
  return o;
};
const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? decode(m[1]) : null;
};
// L'image est-elle dans un parent masque aux lecteurs d'ecran ?
function hiddenAncestor(html, index) {
  const before = html.slice(Math.max(0, index - 1500), index);
  const opens = [...before.matchAll(/<(div|span|picture|figure|a|section)\b[^>]*>/g)];
  const last = opens.slice(-4).map((m) => m[0]);
  return last.some((t) => /aria-hidden="true"/.test(t));
}
const files = ["fr", "en", "de"].filter((l) => existsSync(join(APP, l))).flatMap((l) => [join(APP, `${l}.html`), ...walk(join(APP, l))]);
let total = 0;
let decorative = 0;
const problems = [];
for (const f of files) {
  const metaFile = f.replace(/\.html$/, ".meta");
  const status = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, "utf8")).status ?? 200 : 200;
  if (status >= 300 && status < 400) continue;
  const html = readFileSync(f, "utf8");
  if (/<meta name="robots" content="[^"]*noindex/.test(html)) continue;
  const path = "/" + relative(APP, f).replace(/\.html$/, "");
  const seen = new Map();
  const local = [];
  for (const m of html.matchAll(/<img\b[^>]*>/g)) {
    total++;
    const tag = m[0];
    const alt = attr(tag, "alt");
    const src = (attr(tag, "src") ?? "").replace(/&.*$/, "").slice(0, 90);
    const hidden = /aria-hidden="true"|role="presentation"/.test(tag) || hiddenAncestor(html, m.index);
    if (alt === null) { local.push(`sans alt : ${src}`); continue; }
    if (alt.trim() === "") {
      if (hidden) decorative++;
      else local.push(`alt vide sans aria-hidden : ${src}`);
      continue;
    }
    if (GENERIC.test(alt.trim())) local.push(`alt generique "${alt}" : ${src}`);
    const prev = seen.get(alt);
    if (prev && prev !== src) local.push(`alt en double "${alt}" : ${src}`);
    else seen.set(alt, src);
  }
  if (local.length) problems.push([path, local]);
}
for (const [p, l] of problems) {
  console.log(`${p} : ${l.length}`);
  if (DETAIL) for (const x of l) console.log(`   ${x}`);
}
console.log(`\n${total} images, ${decorative} decoratives (alt vide et masquees), ${problems.reduce((n, [, l]) => n + l.length, 0)} a corriger sur ${problems.length} page(s)`);
if (problems.length) process.exit(1);
