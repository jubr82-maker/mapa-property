// scripts/proof-nav8.mjs — NAV8 : doublon CTA retiré.
// La home ne doit plus contenir « Une conversation peut tout changer »
// (ContactCTA), mais conserver « Passer à l'action » (CTA footer).
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "nav8");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
const p = await ctx.newPage();
await p.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForTimeout(3000);
const conversation = await p.getByText("Une conversation peut tout changer", { exact: false }).count();
const passerAction = await p.getByText("Passer à l'action", { exact: false }).count();
await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await p.waitForTimeout(800);
await p.screenshot({ path: path.join(OUT, "home-bottom.png"), fullPage: true });
await ctx.close();
await browser.close();

console.log(JSON.stringify({ conversation, passerAction }, null, 2));
const ok = conversation === 0 && passerAction >= 1;
console.log(ok ? "NAV8 PROOF: OK ✅ (doublon retiré, Passer à l'action conservé)" : "NAV8 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
