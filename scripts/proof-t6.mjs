// scripts/proof-t6.mjs — BUG T6 : article blog lecture verticale
// (plus de pager horizontal qui coupait le contenu) + typo réduite
// mobile. Mac 1440 + iPhone 17 Pro Max.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "t6");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

// slug article
const c0 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p0 = await c0.newPage();
await p0.goto(`${BASE}/fr/blog`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p0.waitForTimeout(2500);
const slugs = await p0.$$eval('a[href*="/blog/"]', (as) =>
  [...new Set(as.map((a) => a.getAttribute("href")).filter((h) => h && /\/blog\/[^/?#]+$/.test(h)))],
);
await p0.close();
const art = slugs.find((s) => !/\/blog$/.test(s)) || slugs[0];

// Mac 1440
const c1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p1 = await c1.newPage();
await p1.goto(`${BASE}${art}`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p1.waitForTimeout(2500);
const mac = await p1.evaluate(() => {
  const slider = document.querySelector('[style*="translateX"]');
  const prose = document.querySelector(".prose-mapa");
  const txt = prose ? (prose.textContent || "").trim().length : 0;
  return {
    hasHorizontalPager: Boolean(slider),
    proseVisibleChars: txt,
    bodyScrollW: document.body.scrollWidth,
    docClientW: document.documentElement.clientWidth,
  };
});
await p1.screenshot({ path: path.join(OUT, "after-mac1440.png"), fullPage: true });
await p1.close();

// iPhone 17 Pro Max
const c2 = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
const p2 = await c2.newPage();
await p2.goto(`${BASE}${art}`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p2.waitForTimeout(2500);
const mob = await p2.evaluate(() => {
  const p = document.querySelector(".prose-mapa p");
  const h2 = document.querySelector(".prose-mapa h2");
  return {
    pFont: p ? parseFloat(getComputedStyle(p).fontSize) : null,
    h2Font: h2 ? parseFloat(getComputedStyle(h2).fontSize) : null,
    bodyScrollW: document.body.scrollWidth,
    docClientW: document.documentElement.clientWidth,
  };
});
await p2.screenshot({ path: path.join(OUT, "after-iphone.png"), fullPage: true });
await p2.close();
await browser.close();

console.log(JSON.stringify({ art, mac, mob }, null, 2));
const ok =
  !mac.hasHorizontalPager &&
  mac.proseVisibleChars > 400 &&
  mac.bodyScrollW <= mac.docClientW + 1 &&
  mob.pFont !== null && mob.pFont <= 15 &&      // était 16px -> réduit
  mob.h2Font !== null && mob.h2Font <= 26 &&    // était 32px -> réduit
  mob.bodyScrollW <= mob.docClientW + 1;
console.log(ok ? "T6 PROOF: OK ✅ (vertical, contenu visible, typo mobile réduite)" : "T6 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
