// scripts/proof-contraste-boutons.mjs : contraste des boutons des pages
// publiques (nov. 2026, partie C1), mode clair ET mode sombre.
// Pour chaque bouton, lien-bouton, etiquette ou pastille visible (button,
// [role=button], lien ou span arrondi avec marge interieure) : couleur du
// texte et couleur de fond effective (premier ancetre au fond opaque,
// transparence composee), contraste WCAG >= 4,5:1 exige.
// Lancement (machine de Julien) : pnpm build && pnpm start (ou pnpm dev), puis
//   BASE=http://localhost:3000 node scripts/proof-contraste-boutons.mjs
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = path.join("docs", "qa", "captures-grand-chantier-2026-11", "contraste");
await mkdir(OUT, { recursive: true });

const PAGES = [
  "/fr", "/fr/biens", "/fr/biens?transaction=rent", "/fr/off-market", "/fr/off-market/arcova", "/fr/recherches",
  "/fr/services", "/fr/services/vendre", "/fr/services/acheter", "/fr/services/louer", "/fr/services/estimer",
  "/fr/services/simulateurs", "/fr/services/simulateurs/financement", "/fr/services/capacite-emprunt",
  "/fr/services/rendement-locatif", "/fr/services/marches-actifs", "/fr/services/broker-international",
  "/fr/mandats/exclusif", "/fr/mandats/recherche", "/fr/qui-sommes-nous", "/fr/contact", "/fr/faq", "/fr/blog",
  "/fr/agence-immobiliere-luxembourg", "/fr/villes/steinfort", "/fr/legal/honoraires", "/fr/legal/mentions-legales",
  "/fr/liste-attente", "/fr/page-inexistante-404",
];

const audit = () => {
  const parse = (c) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = "1"] = m[1].split(/[ ,/]+/).filter(Boolean);
    return [Number(r), Number(g), Number(b), Number(a)];
  };
  const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const lum = (c) => {
    const f = (x) => ((x /= 255) <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a, b) => {
    const x = lum(a), y = lum(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  };
  const bgOf = (el) => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== "none") return null; // degrade ou photo : verifie a l'oeil sur capture
      const c = parse(cs.backgroundColor);
      if (c && c[3] > 0) {
        layers.push(c);
        if (c[3] >= 1) break;
      }
    }
    return layers.reverse().reduce((acc, l) => over(l, acc), [255, 255, 255, 1]);
  };
  const out = [];
  const els = document.querySelectorAll("button, [role=button], a[class*=rounded], span[class*=rounded-full][class*=px-], p[class*=rounded-full][class*=px-]");
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
    const text = (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 60);
    if (!(el.innerText || "").trim()) continue; // bouton icone seule : hors calcul texte
    const fg = parse(cs.color);
    const bg = bgOf(el);
    if (!fg || !bg) continue;
    const v = ratio(over(fg, bg), bg);
    out.push({ text, ratio: Math.round(v * 100) / 100 });
  }
  return out;
};

const browser = await chromium.launch();
const report = [];
const failures = [];
for (const mode of ["light", "dark"]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: "Mozilla/5.0", colorScheme: mode });
  await ctx.addInitScript((m) => {
    try { localStorage.setItem("mapa_theme", m); } catch {}
  }, mode);
  const page = await ctx.newPage();
  for (const p of PAGES) {
    await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" }).catch(() => {});
    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));
    if (isDark !== (mode === "dark")) failures.push(`${p} [${mode}] : mode non applique`);
    const rows = await page.evaluate(audit);
    for (const r of rows) {
      report.push(`${mode}\t${p}\t${r.ratio}\t${r.text}`);
      if (r.ratio < 4.5) failures.push(`${p} [${mode}] ${r.ratio}:1 "${r.text}"`);
    }
  }
  await ctx.close();
}
await browser.close();
await writeFile(path.join(OUT, "contraste-boutons.tsv"), `mode\tpage\tcontraste\ttexte\n${report.join("\n")}\n`);
console.log(`${PAGES.length} pages x 2 modes, ${report.length} elements mesures (detail : ${OUT}/contraste-boutons.tsv)`);
if (failures.length) {
  console.log(`SOUS 4,5:1 (${failures.length}) :\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("OK : tous les boutons au moins 4,5:1 dans les deux modes.");
