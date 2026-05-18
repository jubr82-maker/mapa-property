// scripts/proof-nav5.mjs — NAV5 : liseré doré copper entre les 6
// services (5 séparateurs, 50% viewport, 1px, centré, #B8865A).
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "nav5");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForTimeout(2500);
const sec = p.locator("section", { hasText: "Six métiers" }).first();
await sec.scrollIntoViewIfNeeded();
await p.waitForTimeout(400);

const data = await sec.evaluate((root) => {
  const seps = [...root.querySelectorAll('div[aria-hidden].h-px')];
  const containerW = root.querySelector(".flex.flex-col")?.clientWidth ?? 0;
  return seps.map((s) => {
    const cs = getComputedStyle(s);
    const r = s.getBoundingClientRect();
    return {
      bg: cs.backgroundColor,
      h: Math.round(r.height),
      w: Math.round(r.width),
      ratio: containerW ? +(r.width / containerW).toFixed(2) : 0,
    };
  });
});
await sec.screenshot({ path: path.join(OUT, "services-liseres.png") });
await ctx.close();
await browser.close();

console.log(JSON.stringify(data, null, 2));
// #B8865A = rgb(184, 134, 90)
const isCopper = (c) => /184,\s*134,\s*90/.test(c);
const ok =
  data.length === 5 &&
  data.every((d) => isCopper(d.bg) && d.h === 1 && d.ratio >= 0.45 && d.ratio <= 0.55);
console.log(ok ? "NAV5 PROOF: OK ✅ (5 liserés copper 50% 1px)" : "NAV5 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
