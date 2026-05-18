// scripts/proof-nav2.mjs — NAV2 : ordre des 6 méthodes sur la home.
// Attendu : Vente et acquisition, Mandat de recherche, Broker
// international, Négociation, Estimation, Mise en location.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "nav2");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForTimeout(2500);

// Section "Six métiers, une méthode"
const sec = p.locator("section", { hasText: "Six métiers" }).first();
await sec.scrollIntoViewIfNeeded();
await p.waitForTimeout(500);
const titles = (await sec.locator("article h3").allTextContents()).map((s) =>
  s.replace(/\s+/g, " ").trim(),
);
await sec.screenshot({ path: path.join(OUT, "services-order.png") });
await ctx.close();
await browser.close();

const expected = [
  "Vente et acquisition",
  "Mandat de recherche",
  "Broker international",
  "Négociation et défense",
  "Estimation et expertise",
  "Mise en location et gestion",
];
console.log("ordre:", JSON.stringify(titles, null, 2));
const ok =
  titles.length === 6 &&
  expected.every((e, i) => titles[i]?.toLowerCase() === e.toLowerCase());
console.log(ok ? "NAV2 PROOF: OK ✅" : "NAV2 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
