// scripts/proof-pol3.mjs — POL3 : onglets resserrés au centre, bloc
// FR + jour/nuit isolé à l'extrême droite. Mac 1440 + 1920 ; iPhone
// (burger inchangé, à gauche).
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "pol3");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const rows = [];

for (const v of [
  { name: "mac1440", w: 1440, h: 900 },
  { name: "desktop1920", w: 1920, h: 1080 },
]) {
  const ctx = await browser.newContext({ viewport: { width: v.w, height: v.h } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(2000);
  const m = await p.evaluate(() => {
    const vis = (el) =>
      el && el.offsetParent !== null && el.getBoundingClientRect().width > 0;
    const grid = document.querySelector("header > div");
    const g = grid.getBoundingClientRect();
    const gcs = getComputedStyle(grid);
    // Bord droit du CONTENU (hors padding du conteneur).
    const contentRight = g.right - parseFloat(gcs.paddingRight || "0");
    // Bloc FR/theme : ancré sur le ThemeToggle (aria-label « Mode … »).
    const themeBtn = [...grid.querySelectorAll("button")].find(
      (b) => vis(b) && /^Mode (jour|nuit)$/i.test(b.getAttribute("aria-label") || ""),
    );
    const langBlock = themeBtn?.parentElement;
    const l = vis(langBlock) ? langBlock.getBoundingClientRect() : null;
    const logo = [...grid.querySelectorAll("img")].find(vis);
    const lg = logo?.getBoundingClientRect();
    const leftNav = [...grid.querySelectorAll("nav")].find(vis);
    const ln = leftNav?.getBoundingClientRect();
    const off = [...grid.querySelectorAll("a")]
      .filter((a) => vis(a) && /\/off-market$/.test(a.getAttribute("href") || ""))
      .map((a) => a.getBoundingClientRect())[0];
    return {
      contentRight: Math.round(contentRight),
      langRight: l ? Math.round(l.right) : 0,
      // distance bloc FR/theme -> bord droit du CONTENU (≈0 si collé)
      langToEdge: l ? Math.round(contentRight - l.right) : 999,
      // resserrement : écart nav gauche -> logo, logo -> 1er lien droit
      leftNavToLogo: ln && lg ? Math.round(lg.left - ln.right) : 999,
      logoToRightNav: lg && off ? Math.round(off.left - lg.right) : 999,
    };
  });
  await p.screenshot({ path: path.join(OUT, `header-${v.name}.png`) });
  rows.push({ vp: v.name, ...m });
  await ctx.close();
}

// iPhone : burger à gauche, inchangé
const cm = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
const pm = await cm.newPage();
await pm.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await pm.waitForTimeout(1500);
const burgerLeft = await pm.evaluate(() => {
  const grid = document.querySelector("header > div");
  const g = grid.getBoundingClientRect();
  const b = grid.querySelector("button");
  const br = b?.getBoundingClientRect();
  return br ? Math.round(br.left - g.left) < g.width / 3 : false;
});
await pm.screenshot({ path: path.join(OUT, "header-iphone.png") });
await cm.close();
await browser.close();

console.log(JSON.stringify({ rows, burgerLeft }, null, 2));
// FR/theme collé au bord droit du CONTENU (<=6px) + onglets
// resserrés près du logo (écarts faibles) + burger mobile à gauche.
const ok =
  rows.every((r) => r.langToEdge >= -2 && r.langToEdge <= 6) &&
  rows.every(
    (r) =>
      r.leftNavToLogo >= 0 &&
      r.leftNavToLogo <= 140 &&
      r.logoToRightNav >= 0 &&
      r.logoToRightNav <= 140,
  ) &&
  burgerLeft === true;
console.log(ok ? "POL3 PROOF: OK ✅ (onglets centrés, FR/theme extrême droite)" : "POL3 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
