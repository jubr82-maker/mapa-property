// scripts/proof-sprint-corrections.mjs
// Playwright gate — Sprint corrections (logo light/dark, mandat exclusif
// INCLUS/NON INCLUS, halo accent unique). iPhone 17 Pro Max 440x956 @3x.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const OUT = path.join("docs", "qa", "screenshots-sprint-corrections");

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
const log = [];

async function shot(name, url, { theme = "dark", action } = {}) {
  const ctx = await browser.newContext(device);
  const page = await ctx.newPage();
  // Force theme via localStorage avant navigation
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("mapa_theme", t);
    } catch {}
  }, theme);
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1500);
  if (action) await action(page);
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });

  // Mesures : logo filtre + halos
  const logoFilter = await page
    .locator(".logo-auto")
    .first()
    .evaluate((el) => getComputedStyle(el).filter)
    .catch(() => "n/a");
  log.push(`${name} [${theme}] → ${file} | logo filter: ${logoFilter}`);
  await ctx.close();
}

// 1. Homepage logo + halos — dark (defaut) + light
await shot("home-dark", "/fr", { theme: "dark" });
await shot("home-light", "/fr", { theme: "light" });

// 2. Mandat exclusif — INCLUS/NON INCLUS + comparator pills
await shot("exclusif-dark", "/fr/mandats/exclusif", {
  theme: "dark",
  action: async (page) => {
    // scroll vers la section INCLUS/NON INCLUS
    await page
      .getByText(/Inclus dans ce mandat|Non inclus/i)
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});
    await page.waitForTimeout(500);
  },
});

// 3. Coverage expansion — tap premiere card
await shot("coverage-expand-dark", "/fr", {
  theme: "dark",
  action: async (page) => {
    const card = page.locator("[data-coverage-card] .flip-card, .flip-card").first();
    await card.scrollIntoViewIfNeeded().catch(() => {});
    await card.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
  },
});

await browser.close();
console.log("=== PLAYWRIGHT GATE — screenshots ===");
log.forEach((l) => console.log(l));
console.log(`\nScreenshots dans ${OUT}/`);
