// scripts/proof-bug2.mjs — Preuve BUG 2 : cover off-market confidentiel
// standardisé (home + listing + fiche). iPhone 17 Pro Max, light + dark.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "bug2");
const IDS = [
  "eb7c7bd4-7a0c-4307-bca3-2aa314a63077",
  "84bb5a23-edbe-43f5-817f-1c3f86eaa13a",
];
const ROUTES = [
  ["home", "/fr"],
  ["offmarket-list", "/fr/off-market"],
  ["fiche-1", `/fr/off-market/${IDS[0]}`],
  ["fiche-2", `/fr/off-market/${IDS[1]}`],
];
const device = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const rows = [];
for (const mode of ["light", "dark"]) {
  const ctx = await browser.newContext({ ...device, colorScheme: mode });
  await ctx.addInitScript((m) => {
    try { localStorage.setItem("theme", m); } catch {}
  }, mode);
  for (const [name, route] of ROUTES) {
    const page = await ctx.newPage();
    const errs = [];
    page.on("pageerror", (e) => errs.push(String(e.message).split("\n")[0]));
    const resp = await page.goto(`${BASE}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    const status = resp ? resp.status() : 0;
    await page.waitForTimeout(3500);
    // Signaux confidentialité
    const coverTxt = await page
      .getByText("Bien strictement confidentiel", { exact: false })
      .count()
      .catch(() => 0);
    // Fuite : une <img> dont le src pointe Supabase storage dans la zone cover.
    const realImg = await page
      .locator('img[src*="supabase"], img[src*="/storage/"]')
      .count()
      .catch(() => 0);
    await page.screenshot({
      path: path.join(OUT, `${name}-${mode}.png`),
      fullPage: true,
    });
    rows.push({
      route,
      mode,
      status,
      confidentialCover: coverTxt,
      supabaseImgs: realImg,
      jsErr: errs[0] ?? "",
    });
    await page.close();
  }
  await ctx.close();
}
await browser.close();
console.table(rows);
const bad = rows.filter(
  (r) => r.status >= 400 || r.confidentialCover < 1 || r.jsErr,
);
console.log(bad.length === 0 ? "BUG2 PROOF: OK ✅" : `BUG2 PROOF: KO ❌ (${bad.length})`);
process.exit(bad.length === 0 ? 0 : 1);
