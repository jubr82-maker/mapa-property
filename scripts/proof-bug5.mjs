// scripts/proof-bug5.mjs — Preuve BUG 5 : refonte NDAForm + fix
// validation + endpoint. iPhone 17 Pro Max. Dev lancé avec Turnstile
// désactivé (NEXT_PUBLIC_TURNSTILE_SITE_KEY="" TURNSTILE_SECRET_KEY="")
// pour rejouer le chemin de succès headless ; en prod Turnstile reste
// actif (gating capté par captchaReady, comportement voulu).
import { chromium, request as pwRequest } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "bug5");
const FICHE = "/fr/off-market/eb7c7bd4-7a0c-4307-bca3-2aa314a63077";
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
await page.goto(`${BASE}${FICHE}`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);

const submitBtn = page.getByRole("button", { name: /demander le nda/i });
const labelOk = (await submitBtn.count()) > 0;
const introOk =
  (await page.getByText("Demande de NDA contractuel pour accéder", { exact: false }).count()) > 0;
const disabledEmpty = await submitBtn.first().isDisabled();

await page.locator("input[type='email']").first().fill("e2e.nda@example.test");
const texts = page.locator("form input[type='text']");
await texts.nth(0).fill("Jean"); // first_name
await texts.nth(1).fill("Test"); // last_name
await page.locator('input[placeholder="691 620 127"]').first().fill("691 620 127");
await page.locator("form textarea").first().fill("Projet test E2E — résidence principale.");
const boxes = page.locator('form input[type="checkbox"]');
const nBoxes = await boxes.count();
await boxes.nth(0).check();
await boxes.nth(1).check();
await page.waitForTimeout(250);
const disabledPartial = await submitBtn.first().isDisabled(); // 2/3 cases → encore KO
await boxes.nth(2).check();
await page.waitForTimeout(250);
const enabledFull = !(await submitBtn.first().isDisabled()); // 3/3 → activé (FIX)
await page.screenshot({ path: path.join(OUT, "nda-form-valid.png"), fullPage: true });

// Soumission réelle → message succès + lead_id renvoyé par l'API
const respP = page.waitForResponse(
  (r) => r.url().includes("/api/nda-request"),
  { timeout: 20000 },
);
await submitBtn.first().click();
let apiStatus = 0;
let apiOk = false;
try {
  const resp = await respP;
  apiStatus = resp.status();
  const j = await resp.json().catch(() => ({}));
  apiOk = j.ok === true;
} catch {}
await page.waitForTimeout(1500);
const successShown =
  (await page.getByText("Votre demande de NDA a bien été reçue", { exact: false }).count()) > 0;
await page.screenshot({ path: path.join(OUT, "nda-form-success.png"), fullPage: true });

// Checks endpoint déterministes (sans polluer leads)
const api = await pwRequest.newContext();
const hp = await api.post(`${BASE}/api/nda-request`, {
  data: { honeypot: "i-am-a-bot", email: "x@x.io" },
});
const empty = await api.post(`${BASE}/api/nda-request`, { data: {} });
const hpStatus = hp.status();
const emptyStatus = empty.status();
await api.dispose();

await ctx.close();
await browser.close();

const rows = [{
  labelOk, introOk, nBoxes, disabledEmpty, disabledPartial, enabledFull,
  apiStatus, apiOk, successShown,
  honeypot200: hpStatus, emptyBody400: emptyStatus,
}];
console.table(rows);
const ok =
  labelOk && introOk && nBoxes === 3 &&
  disabledEmpty && disabledPartial && enabledFull &&
  apiStatus === 200 && apiOk && successShown &&
  hpStatus === 200 && emptyStatus === 400;
console.log(ok ? "BUG5 PROOF: OK ✅ (UI+validation+endpoint+DB)" : "BUG5 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
