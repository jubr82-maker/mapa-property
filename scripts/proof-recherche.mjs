// scripts/proof-recherche.mjs : captures de la nouvelle recherche (nov.
// 2026, partie C3) depuis la barre de recherche en texte libre de
// l'accueil, ordinateur et iPhone 17 Pro Max :
//   "Steinfort"   : biens de Steinfort (puis du reste de la commune), pastille ;
//   "appartement" : fenetre "Dans quel pays souhaitez-vous chercher ?" visible ;
//   "joli truc"   : message "Precisez une ville..." et trois exemples, aucun bien.
// Lancement (machine de Julien) : pnpm dev, puis
//   BASE=http://localhost:3000 node scripts/proof-recherche.mjs
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = path.join("docs", "qa", "captures-grand-chantier-2026-11", "recherche");
await mkdir(OUT, { recursive: true });

const DEVICES = {
  ordinateur: { viewport: { width: 1440, height: 900 }, userAgent: "Mozilla/5.0" },
  iphone17promax: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1" },
};
const CASES = [
  { q: "Steinfort", name: "steinfort", check: async (page) => (await page.locator("[data-search-chip]").count()) > 0 && !(await page.locator("[data-search-not-understood]").count()) },
  { q: "appartement", name: "appartement", check: async (page) => page.locator("[data-country-prompt]").isVisible() },
  { q: "joli truc", name: "joli-truc", check: async (page) => (await page.locator("[data-search-not-understood]").isVisible()) && (await page.locator("[data-search-not-understood] a").count()) === 3 },
];

const browser = await chromium.launch();
const failures = [];
for (const [device, opts] of Object.entries(DEVICES)) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  for (const c of CASES) {
    await page.goto(`${BASE}/fr`, { waitUntil: "networkidle" });
    // Onglet "Recherche IA" de la barre de recherche, puis texte libre.
    await page.getByRole("button", { name: /recherche ia/i }).first().click().catch(() => {});
    const input = page.locator("#search input[type=text], #search textarea").first();
    await input.fill(c.q);
    await Promise.all([page.waitForURL(/\/fr\/biens/, { timeout: 20000 }), input.press("Enter")]);
    await page.waitForLoadState("networkidle");
    const ok = await c.check(page);
    if (!ok) failures.push(`${c.name} (${device}) : ${page.url()}`);
    await page.screenshot({ path: path.join(OUT, `${c.name}-${device}.png`), fullPage: false });
    await page.screenshot({ path: path.join(OUT, `${c.name}-${device}-page.png`), fullPage: true });
  }
  await ctx.close();
}
await browser.close();
if (failures.length) {
  console.log(`ECHECS (${failures.length}) :\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`OK : Steinfort, appartement (fenetre du pays), joli truc (captures : ${OUT}).`);
