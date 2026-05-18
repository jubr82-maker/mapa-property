// scripts/proof-bug3.mjs — Preuve BUG 3 : PhoneInput (drapeau+indicatif
// + numéro) dans form contact + form estimation. iPhone 17 Pro Max.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "bug3");
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

async function probePhone(name, url, advance) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  if (advance) await advance(page);
  // select indicatif = celui dont les options contiennent "+352"
  const prefixSel = page.locator("select").filter({ hasText: "+352" }).first();
  const optCount = await prefixSel.locator("option").count().catch(() => 0);
  const has33 = (await prefixSel.locator("option", { hasText: "+33" }).count().catch(() => 0)) > 0;
  const defaultVal = await prefixSel.inputValue().catch(() => "");
  const telInput = page.locator('input[placeholder="691 620 127"]').first();
  const telVisible = await telInput.isVisible().catch(() => false);
  if (telVisible) await telInput.fill("691 620 127");
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  rows.push({ name, optCount, has33, defaultVal, telVisible });
  await page.close();
}

await probePhone("contact", `${BASE}/fr/contact`);
await probePhone("estimer-step3", `${BASE}/fr/services/estimer`, async (page) => {
  await page.locator('input[type="number"]').first().fill("120");
  await page.getByRole("button", { name: /suivant/i }).first().click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /suivant/i }).first().click();
  await page.waitForTimeout(900);
});

await ctx.close();
await browser.close();
console.table(rows);
const ok = rows.every((r) => r.optCount === 26 && r.has33 && r.defaultVal === "LU" && r.telVisible);
console.log(ok ? "BUG3 PROOF: OK ✅ (26 indicatifs, défaut LU, tel ok)" : "BUG3 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
