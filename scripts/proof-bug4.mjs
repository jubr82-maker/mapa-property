// scripts/proof-bug4.mjs — Preuve BUG 4 : CountrySelect (26 marchés
// MAPA) dans le form contact + le form estimation. iPhone 17 Pro Max.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "bug4");
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
const ctx = await browser.newContext(device);
const rows = [];

// 1) Form contact — CountrySelect visible d'emblée
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/fr/contact`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const sel = page.locator("select").filter({ hasText: "Luxembourg" }).first();
  const optCount = await sel.locator("option").count().catch(() => 0);
  const hasMaurice = (await sel.locator("option", { hasText: "Île Maurice" }).count().catch(() => 0)) > 0;
  const defaultVal = await sel.inputValue().catch(() => "");
  await page.screenshot({ path: path.join(OUT, "contact.png"), fullPage: true });
  rows.push({ form: "contact", optCount, hasMaurice, defaultVal });
  await page.close();
}

// 2) Form estimation — étape 2 contient le CountrySelect
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/fr/services/estimer`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  // Étape 1 : renseigner surface habitable puis Suivant
  const surface = page.locator('input[type="number"]').first();
  await surface.fill("120");
  await page.getByRole("button", { name: /suivant/i }).first().click();
  await page.waitForTimeout(1200);
  const sel = page.locator("select").filter({ hasText: "Luxembourg" }).first();
  const optCount = await sel.locator("option").count().catch(() => 0);
  const hasMaurice = (await sel.locator("option", { hasText: "Île Maurice" }).count().catch(() => 0)) > 0;
  const defaultVal = await sel.inputValue().catch(() => "");
  await page.screenshot({ path: path.join(OUT, "estimer-step2.png"), fullPage: true });
  rows.push({ form: "estimer", optCount, hasMaurice, defaultVal });
  await page.close();
}

await ctx.close();
await browser.close();
console.table(rows);
const ok = rows.every((r) => r.optCount === 26 && r.hasMaurice && r.defaultVal === "LU");
console.log(ok ? "BUG4 PROOF: OK ✅ (26 pays, défaut LU)" : "BUG4 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
