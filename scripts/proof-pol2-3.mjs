// scripts/proof-pol2-3.mjs — POL2-3 : logo or #e0be60 en mode NUIT,
// copper INCHANGÉ en mode jour. Preuve déterministe : le filtre CSS
// calibré (#e0be60, prouvé par AGENT-A à rgb(223,190,97) Δ=1 vs
// 224,190,96 — `brightness(0)` normalise le PNG donc sortie identique
// quel que soit le source) est APPLIQUÉ au logo visible en dark et
// ABSENT en light. + captures header dark/light pour contrôle humain.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "pol2-3");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const rows = [];

for (const vp of [
  { name: "mac1440", w: 1440, h: 900, mobile: false },
  { name: "iphone17promax", w: 440, h: 956, mobile: true },
]) {
  for (const theme of ["dark", "light"]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.w, height: vp.h },
      deviceScaleFactor: vp.mobile ? 3 : 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      colorScheme: theme,
      ...(vp.mobile
        ? { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }
        : {}),
    });
    await ctx.addInitScript((t) => {
      try { localStorage.setItem("theme", t); } catch {}
    }, theme);
    const p = await ctx.newPage();
    await p.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await p.waitForTimeout(2200);
    const data = await p.evaluate(() => {
      const header = document.querySelector("header");
      const img = [...header.querySelectorAll("img.mapa-logo-img")].find(
        (i) => i.offsetParent !== null && i.getBoundingClientRect().width > 4,
      );
      const rootDark = document.documentElement.classList.contains("dark");
      if (!img) return { rootDark, filter: null };
      return { rootDark, filter: getComputedStyle(img).filter };
    });
    await p.screenshot({ path: path.join(OUT, `logo-${vp.name}-${theme}.png`) });
    rows.push({ vp: vp.name, theme, ...data });
    await ctx.close();
  }
}
await browser.close();
console.log(JSON.stringify(rows, null, 2));

// Filtre or #e0be60 = chaîne calibrée AGENT-A : commence par
// brightness(0) (normalise le PNG -> sortie indépendante de la source)
// et contient hue-rotate(352deg). En dark: présent ; en light: none.
const isGoldFilter = (f) =>
  typeof f === "string" &&
  /brightness\(0\)/.test(f) &&
  /hue-rotate\(352deg\)/.test(f);

const darks = rows.filter((r) => r.theme === "dark");
const lights = rows.filter((r) => r.theme === "light");
const darkOk =
  darks.length > 0 && darks.every((r) => r.rootDark && isGoldFilter(r.filter));
const lightOk =
  lights.length > 0 &&
  lights.every((r) => !r.rootDark && !isGoldFilter(r.filter));
const ok = darkOk && lightOk;
console.log(
  ok
    ? "POL2-3 PROOF: OK ✅ (dark = filtre or #e0be60 calibré ; light = copper, aucun filtre or)"
    : `POL2-3 PROOF: KO ❌ (darkOk=${darkOk}, lightOk=${lightOk})`,
);
process.exit(ok ? 0 : 1);
