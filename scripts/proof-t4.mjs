// scripts/proof-t4.mjs — BUG T4 : investigation flux estimation public.
// Parcourt /fr/services/estimer étape 1 -> 2 -> 3 -> submit, logge
// erreurs console/page, statut /api/estimate, et si le résultat
// (fourchette) s'affiche. iPhone 17 Pro Max.
import { chromium, request as pwRequest } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "t4");
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
const page = await ctx.newPage();
const consoleErrs = [];
const pageErrs = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text().slice(0, 140)); });
page.on("pageerror", (e) => pageErrs.push(String(e.message).split("\n")[0]));

await page.goto(`${BASE}/fr/services/estimer`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);

const step = { s1: false, s2: false, s3: false, submitted: false, result: false };
let apiStatus = 0, apiBody = "";

try {
  // Étape 1 : surface habitable obligatoire
  await page.locator('input[type="number"]').first().fill("120");
  await page.getByRole("button", { name: /suivant/i }).first().click();
  await page.waitForTimeout(900);
  step.s1 = true;

  // Étape 2 : pays LU (défaut) + commune
  const communeSel = page.locator("select").nth(1);
  if (await communeSel.count()) {
    const opts = await communeSel.locator("option").allTextContents();
    const lux = opts.find((o) => /luxembourg/i.test(o));
    if (lux) await communeSel.selectOption({ label: lux }).catch(() => {});
  }
  await page.getByRole("button", { name: /suivant/i }).first().click();
  await page.waitForTimeout(900);
  step.s2 = true;

  // Étape 3 : email + consentements
  await page.locator('input[type="email"]').first().fill("e2e.estim.t4@example.test");
  const boxes = page.locator('input[type="checkbox"]');
  const n = await boxes.count();
  for (let i = 0; i < n; i++) await boxes.nth(i).check().catch(() => {});
  step.s3 = true;

  const respP = page
    .waitForResponse((r) => r.url().includes("/api/estimate"), { timeout: 20000 })
    .catch(() => null);
  await page
    .getByRole("button", { name: /calculer|estimer|computing|compute/i })
    .first()
    .click();
  step.submitted = true;
  const resp = await respP;
  if (resp) { apiStatus = resp.status(); apiBody = (await resp.text().catch(() => "")).slice(0, 160); }
  await page.waitForTimeout(2500);

  // Résultat : une fourchette € affichée
  const txt = await page.locator("body").innerText();
  step.result = /€|EUR/.test(txt) && /(fourchette|estimation|valeur|price|résultat)/i.test(txt);
} catch (e) {
  pageErrs.push("FLOW:" + String(e.message).split("\n")[0]);
}

await page.screenshot({ path: path.join(OUT, "estimation-flow.png"), fullPage: true });
await ctx.close();
await browser.close();

// BUG T4 racine : un TERRAIN renvoyait 400 missing_fields (livingSurface
// requis & > 0 alors qu'un terrain n'a pas d'habitable). Doit désormais
// donner une fourchette via landSurface.
const api = await pwRequest.newContext();
const land = await api.post(`${BASE}/api/estimate`, {
  data: { country: "LU", commune: "Esch-sur-Alzette", type: "terrain", state: "good", energy: "C", landSurface: 600 },
});
const landJson = await land.json().catch(() => ({}));
await api.dispose();
const terrainOk =
  land.status() === 200 &&
  landJson?.result?.range?.mid > 0 &&
  !Number.isNaN(landJson.result.range.mid);

console.log(JSON.stringify({ step, apiStatus, apiBody, terrain: { status: land.status(), range: landJson?.result?.range }, consoleErrs, pageErrs }, null, 2));
const ok =
  step.s1 && step.s2 && step.s3 && step.submitted && apiStatus === 200 &&
  step.result && terrainOk;
console.log(ok ? "T4 FLOW: OK ✅ (incl. terrain réparé)" : "T4 FLOW: KO ❌ (voir logs)");
process.exit(ok ? 0 : 1);
