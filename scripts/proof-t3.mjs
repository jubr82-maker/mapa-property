// scripts/proof-t3.mjs — BUG T3 : forms ne moulinent plus sur
// « Vérification anti-spam en cours… ».
//   SCENARIO=A : dev SANS NEXT_PUBLIC_TURNSTILE_SITE_KEY -> submit
//     mandat exclusif aboutit en < 3 s (pas de captcha, pas de blocage).
//   SCENARIO=B : dev AVEC site_key, mais challenges.cloudflare.com
//     bloqué (CSP/adblock simulé) -> le bouton NE RESTE PAS bloqué
//     (captchaFailed via onerror/timeout 10 s) et le submit aboutit à
//     une réponse serveur (pas de spinner infini).
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const SCENARIO = process.env.SCENARIO ?? "A";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "t3");
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

if (SCENARIO === "B") {
  // Simule Turnstile injoignable (CSP/adblock/réseau).
  await ctx.route(/challenges\.cloudflare\.com/, (r) => r.abort());
}

const page = await ctx.newPage();
await page.goto(`${BASE}/fr/mandats/exclusif`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(2000);

// Remplir le formulaire ContactForm (mandat exclusif)
await page.locator('input[name="first_name"]').fill("Jean");
await page.locator('input[name="last_name"]').fill("Test T3");
await page.locator('input[type="email"]').first().fill("e2e.t3@example.test");
await page.locator('input[placeholder="691 620 127"]').first().fill("691 620 127");
await page.locator("form textarea").first().fill("Demande mandat exclusif — test T3.");
await page.locator('form input[type="checkbox"]').last().check(); // RGPD

const submit = page.getByRole("button", { name: /envoyer|submit|vérification/i }).first();
const t0 = Date.now();
// Attendre que le bouton devienne ACTIONNABLE (plus de moulinage infini)
let enabled = false;
for (let i = 0; i < 26; i++) {
  if (!(await submit.isDisabled())) { enabled = true; break; }
  await page.waitForTimeout(500);
}
const tEnabled = Date.now() - t0;
const labelAtEnable = (await submit.textContent().catch(() => "")) ?? "";

let apiStatus = 0;
const respP = page
  .waitForResponse((r) => r.url().includes("/api/lead"), { timeout: 15000 })
  .catch(() => null);
await submit.click().catch(() => {});
const resp = await respP;
if (resp) apiStatus = resp.status();
await page.waitForTimeout(1200);
const stuckSpinner =
  (await page.getByText(/Vérification anti-spam en cours/i).count().catch(() => 0)) > 0 &&
  (await submit.isDisabled().catch(() => true));
await page.screenshot({ path: path.join(OUT, `scenario-${SCENARIO}.png`), fullPage: true });

await ctx.close();
await browser.close();

const row = {
  scenario: SCENARIO,
  becameEnabled: enabled,
  msToEnable: tEnabled,
  labelAtEnable: labelAtEnable.trim().slice(0, 30),
  apiStatus,
  stuckOnSpinner: stuckSpinner,
};
console.table([row]);

let ok;
if (SCENARIO === "A") {
  // Pas de captcha -> actionnable quasi immédiat + soumission OK rapide
  ok = enabled && tEnabled < 3000 && apiStatus === 200 && !stuckSpinner;
} else {
  // Captcha injoignable -> JAMAIS bloqué ; débloqué <= ~11 s ; le submit
  // obtient une réponse serveur (200 ou 403) ; pas de spinner figé.
  ok = enabled && tEnabled <= 11000 && apiStatus > 0 && !stuckSpinner;
}
console.log(ok ? `T3 SCENARIO ${SCENARIO}: OK ✅` : `T3 SCENARIO ${SCENARIO}: KO ❌`);
process.exit(ok ? 0 : 1);
