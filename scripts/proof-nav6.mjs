// scripts/proof-nav6.mjs — NAV6 : article blog plus large sur Mac
// (~90vw) + titre mobile réduit (text-2xl 24px -> text-xl 20px).
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "nav6");
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

// Mac 1440 : conteneur ~90vw
const c1 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p1 = await c1.newPage();
await p1.goto(`${BASE}${art}`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p1.waitForTimeout(2500);
const macW = await p1.evaluate(() => {
  const article = document.querySelector("article");
  const wrap = article?.parentElement;
  return {
    wrapW: wrap ? Math.round(wrap.getBoundingClientRect().width) : 0,
    vw: document.documentElement.clientWidth,
  };
});
await p1.screenshot({ path: path.join(OUT, "blog-mac1440.png"), fullPage: true });
await p1.close();
await c1.close();

// iPhone : titre <= 22px
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
const titleFs = await p2.evaluate(() => {
  const h1 = document.querySelector("article h1");
  return h1 ? parseFloat(getComputedStyle(h1).fontSize) : null;
});
await p2.screenshot({ path: path.join(OUT, "blog-iphone.png"), fullPage: true });
await p2.close();
await c2.close();
await browser.close();

const ratio = macW.vw ? +(macW.wrapW / macW.vw).toFixed(2) : 0;
console.log(JSON.stringify({ art, macW, ratio, titleFs }, null, 2));
// Mac : conteneur nettement plus large qu'avant (max-w-4xl=896 ->
// ~90vw ; sur 1440 ~ 0.86-0.92). Mobile : titre ~20px (<=22).
const ok = ratio >= 0.8 && titleFs !== null && titleFs <= 22;
console.log(ok ? `NAV6 PROOF: OK ✅ (Mac ${macW.wrapW}px / ${ratio} vw, titre mobile ${titleFs}px)` : "NAV6 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
