// scripts/proof-pol5.mjs — POL5 : prose blog élargie (65ch -> 120ch).
// Mac 1440 : largeur effective du bloc .prose-mapa > 1000px.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "pol5");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

const c0 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p0 = await c0.newPage();
await p0.goto(`${BASE}/fr/blog`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p0.waitForTimeout(2500);
const slugs = await p0.$$eval('a[href*="/blog/"]', (as) =>
  [...new Set(as.map((a) => a.getAttribute("href")).filter((h) => h && /\/blog\/[^/?#]+$/.test(h)))],
);
await p0.close();
const art = slugs.find((s) => !/\/blog$/.test(s)) || slugs[0];

const p1 = await c0.newPage();
await p1.goto(`${BASE}${art}`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p1.waitForTimeout(2500);
const m = await p1.evaluate(() => {
  const prose = document.querySelector(".prose-mapa");
  const cs = prose ? getComputedStyle(prose) : null;
  return {
    proseWidth: prose ? Math.round(prose.getBoundingClientRect().width) : 0,
    maxWidth: cs?.maxWidth ?? "",
  };
});
await p1.screenshot({ path: path.join(OUT, "blog-mac1440.png"), fullPage: true });
await p1.close();
await c0.close();
await browser.close();

console.log(JSON.stringify(m, null, 2));
// 120ch ≈ >1100px à 16px ; le conteneur (90vw≈1296 / xl:1400) borne.
const ok = m.proseWidth > 1000;
console.log(ok ? `POL5 PROOF: OK ✅ (prose ${m.proseWidth}px, max-width ${m.maxWidth})` : `POL5 PROOF: KO ❌ (${m.proseWidth}px)`);
process.exit(ok ? 0 : 1);
