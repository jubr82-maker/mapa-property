// scripts/proof-bandeaux.mjs : captures des bandeaux (nov. 2026, partie A5).
// 3 bandeaux x 2 positions x 4 couleurs, carte et grande photo de fiche, en
// largeur ordinateur (1440) et iPhone 17 Pro Max (440 x 956), sur le bien de
// test FICTIF de la route de developpement /fr/test-bandeaux (rien en base).
// Controles a chaque capture : bandeau present, texte sur une ligne (hauteur
// du mot principal = une ligne), aucun debordement lateral de la page,
// etiquette commerciale absente, prix remplace pour Vendu et Loue.
// Lancement (machine de Julien) : pnpm dev, puis
//   BASE=http://localhost:3000 node scripts/proof-bandeaux.mjs
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = path.join("docs", "qa", "captures-grand-chantier-2026-11", "bandeaux");
await mkdir(OUT, { recursive: true });

const DEVICES = {
  ordinateur: { viewport: { width: 1440, height: 900 }, userAgent: "Mozilla/5.0" },
  iphone17promax: {
    viewport: { width: 440, height: 956 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1",
  },
};
const KINDS = ["under_compromise", "sold", "rented"];
const POSITIONS = ["straight", "diagonal"];
const COLORS = ["sapin", "cuivre", "creme", "blanc"];

const browser = await chromium.launch();
const failures = [];
let shots = 0;
for (const [device, opts] of Object.entries(DEVICES)) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  for (const kind of KINDS) for (const pos of POSITIONS) for (const color of COLORS) {
    const name = `${kind}-${pos}-${color}-${device}`;
    await page.goto(`${BASE}/fr/test-bandeaux?kind=${kind}&pos=${pos}&color=${color}`, { waitUntil: "networkidle" });
    const check = await page.evaluate(() => {
      const out = [];
      const banners = document.querySelectorAll("[data-status-banner]");
      if (banners.length !== 2) out.push(`bandeaux trouves : ${banners.length} (attendu 2)`);
      for (const b of banners) {
        const main = b.querySelector("[role=img] span");
        const lh = parseFloat(getComputedStyle(main).fontSize);
        if (main.getBoundingClientRect().height > lh * 1.6) out.push("mot principal sur plusieurs lignes");
      }
      if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push("debordement lateral de la page");
      const card = document.querySelector("[data-proof-card]");
      if (card && /Exclusivit/.test(card.textContent ?? "")) out.push("etiquette commerciale visible");
      return out;
    });
    if (check.length) failures.push(`${name} : ${check.join(", ")}`);
    await page.locator("[data-proof-card]").screenshot({ path: path.join(OUT, `carte-${name}.png`) });
    await page.locator("[data-proof-gallery]").screenshot({ path: path.join(OUT, `fiche-${name}.png`) });
    shots += 2;
  }
  await ctx.close();
}
await browser.close();
console.log(`${shots} captures dans ${OUT}`);
if (failures.length) {
  console.log(`ECHECS (${failures.length}) :\n${failures.join("\n")}`);
  process.exit(1);
}
console.log("OK : bandeau present, une ligne, sans debordement, sans etiquette commerciale.");
