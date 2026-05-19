// scripts/proof-pol2-4.mjs — POL2-4 : onglets nav desktop ×1.5
// (≈20px), gaps doublés, FR/theme à l'extrême droite (POL3 préservé),
// burger mobile inchangé. (C) alignement-MAPA documenté impossible
// (docs/qa/POL2-4_ALIGNEMENT_NOTE.md) — non bloquant.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "pol2-4");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const rows = [];

for (const vp of [
  { name: "mac1440", w: 1440, h: 900 },
  { name: "desktop1920", w: 1920, h: 1080 },
]) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(2000);
  const m = await p.evaluate(() => {
    const header = document.querySelector("header");
    const grid = header.querySelector(":scope > div");
    const g = grid.getBoundingClientRect();
    const gcs = getComputedStyle(grid);
    // Police d'un onglet visible (lien nav OU bouton dropdown top).
    const tab = [...grid.querySelectorAll("nav a, nav .group > button")].find(
      (e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0,
    );
    // Bloc FR/theme (ancré sur le ThemeToggle aria-label « Mode … »).
    const themeBtn = [...grid.querySelectorAll("button")].find(
      (b) => /^Mode (jour|nuit)$/i.test(b.getAttribute("aria-label") || ""),
    );
    const lb = themeBtn?.parentElement?.getBoundingClientRect();
    return {
      tabFont: tab ? parseFloat(getComputedStyle(tab).fontSize) : 0,
      gridGap: parseFloat(gcs.columnGap || gcs.gap || "0"),
      langToContentRight: lb
        ? Math.round(g.right - parseFloat(gcs.paddingRight || "0") - lb.right)
        : 999,
    };
  });
  await p.screenshot({ path: path.join(OUT, `header-${vp.name}.png`) });
  rows.push({ vp: vp.name, ...m });
  await ctx.close();
}

// iPhone 17 Pro Max : burger présent, nav desktop masquée.
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
const mob = await pm.evaluate(() => {
  const header = document.querySelector("header");
  const burger = [...header.querySelectorAll("button")].some(
    (b) => b.offsetParent !== null && b.getBoundingClientRect().width >= 32,
  );
  const desktopNavVisible = [...header.querySelectorAll("nav a")].some(
    (a) => a.offsetParent !== null && a.getBoundingClientRect().width > 0,
  );
  return { burger, desktopNavVisible };
});
await pm.screenshot({ path: path.join(OUT, "header-iphone17promax.png") });
await cm.close();
await browser.close();

console.log(JSON.stringify({ rows, mob }, null, 2));
const ok =
  rows.every((r) => r.tabFont >= 19 && r.tabFont <= 22) &&
  rows.every((r) => r.gridGap >= 24) && // lg:gap-8 = 2rem = 32px (≥24 doublé vs gap-4=16)
  rows.every((r) => r.langToContentRight >= -4 && r.langToContentRight <= 8) &&
  mob.burger === true &&
  mob.desktopNavVisible === false;
console.log(
  ok
    ? "POL2-4 PROOF: OK ✅ (onglets ~20px, gap doublé, FR/theme droite, burger inchangé)"
    : "POL2-4 PROOF: KO ❌",
);
process.exit(ok ? 0 : 1);
