// scripts/proof-bug7.mjs — Preuve BUG 7 : 3e case RGPD (lien
// /legal/rgpd) sur contact + estimer, soumission gated, consentement
// capté côté serveur (insert résilient). iPhone 17 Pro Max.
import { chromium, request as pwRequest } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "bug7");
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

// ---- ContactForm ----
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/fr/contact`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const rgpdBox = page.locator('form input[type="checkbox"]').last();
  const link = page.locator('form a[href*="/legal/rgpd"]');
  const linkOk = (await link.count()) > 0;
  await page.locator('input[name="first_name"]').fill("Jean");
  await page.locator('input[name="last_name"]').fill("Test");
  await page.locator('input[type="email"]').first().fill("e2e.rgpd@example.test");
  await page.locator('input[placeholder="691 620 127"]').first().fill("691 620 127");
  await page.locator("form textarea").first().fill("Message test RGPD.");
  const submit = page.getByRole("button", { name: /envoyer|submit/i }).first();
  const disabledBefore = await submit.isDisabled();
  await rgpdBox.check();
  await page.waitForTimeout(250);
  const enabledAfter = !(await submit.isDisabled());
  await page.screenshot({ path: path.join(OUT, "contact-rgpd.png"), fullPage: true });
  const respP = page.waitForResponse((r) => r.url().includes("/api/lead"), { timeout: 15000 });
  await submit.click();
  let status = 0, ok = false;
  try { const r = await respP; status = r.status(); ok = (await r.json().catch(()=>({}))).ok === true; } catch {}
  await page.waitForTimeout(800);
  rows.push({ form: "contact", linkOk, disabledBefore, enabledAfter, apiStatus: status, apiOk: ok });
  await page.close();
}

// ---- EstimateForm (step 3) ----
{
  const page = await ctx.newPage();
  await page.goto(`${BASE}/fr/services/estimer`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.locator('input[type="number"]').first().fill("120");
  await page.getByRole("button", { name: /suivant/i }).first().click();
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /suivant/i }).first().click();
  await page.waitForTimeout(900);
  const link = page.locator('a[href*="/legal/rgpd"]');
  const linkOk = (await link.count()) > 0;
  const boxes = page.locator('input[type="checkbox"]');
  const nBoxes = await boxes.count();
  await page.locator('input[type="email"]').first().fill("e2e.estim@example.test");
  const compute = page.getByRole("button", { name: /calculer|computing|compute|estimer/i }).first();
  await boxes.nth(0).check(); // contactConsent
  await page.waitForTimeout(200);
  const disabledOneBox = await compute.isDisabled(); // RGPD pas coché → KO
  await boxes.nth(1).check(); // rgpd
  await page.waitForTimeout(200);
  const enabledBoth = !(await compute.isDisabled());
  await page.screenshot({ path: path.join(OUT, "estimer-rgpd.png"), fullPage: true });
  rows.push({ form: "estimer", linkOk, nBoxes, disabledOneBox, enabledBoth });
  await page.close();
}

// ---- Endpoint : /api/lead SANS rgpd ne casse pas (résilience) ----
const api = await pwRequest.newContext();
const noConsent = await api.post(`${BASE}/api/lead`, {
  data: { email: "e2e.noconsent@example.test", type: "contact", first_name: "NoConsent" },
});
const noConsentStatus = noConsent.status();
await api.dispose();

await ctx.close();
await browser.close();
rows.push({ form: "endpoint", noConsent200: noConsentStatus });
console.table(rows);
const c = rows[0], e = rows[1];
const ok =
  c.linkOk && c.disabledBefore && c.enabledAfter && c.apiStatus === 200 && c.apiOk &&
  e.linkOk && e.nBoxes >= 2 && e.disabledOneBox && e.enabledBoth &&
  noConsentStatus === 200;
console.log(ok ? "BUG7 PROOF: OK ✅" : "BUG7 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
