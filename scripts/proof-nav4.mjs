// scripts/proof-nav4.mjs — NAV4 : chiffres clés StatsBand ~-50%.
// text-6xl(3.75rem=60px) -> text-3xl(1.875rem=30px) desktop ;
// text-4xl(36px) -> text-2xl(24px) mobile.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "nav4");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const rows = [];

for (const v of [
  { name: "mac1440", w: 1440, h: 900, mobile: false, max: 34 },
  { name: "iphone", w: 440, h: 956, mobile: true, max: 28 },
]) {
  const ctx = await browser.newContext({
    viewport: { width: v.w, height: v.h },
    deviceScaleFactor: v.mobile ? 3 : 1,
    isMobile: v.mobile,
    hasTouch: v.mobile,
    ...(v.mobile
      ? { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }
      : {}),
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(2500);
  const sec = p.locator("section", { hasText: "" }).filter({ has: p.locator(".gold-text") }).first();
  const fs = await p.evaluate(() => {
    const el = [...document.querySelectorAll("p")].find(
      (e) => e.querySelector(".gold-text") && /font-black/.test(e.className),
    );
    return el ? parseFloat(getComputedStyle(el).fontSize) : null;
  });
  const valueEl = p.locator("p.font-black .gold-text").first();
  await valueEl.scrollIntoViewIfNeeded().catch(() => {});
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, `stats-${v.name}.png`), fullPage: true });
  rows.push({ vp: v.name, numberFontPx: fs, max: v.max, ok: fs !== null && fs <= v.max });
  await ctx.close();
}
await browser.close();
console.table(rows);
const ok = rows.every((r) => r.ok);
console.log(ok ? "NAV4 PROOF: OK ✅ (chiffres ~-50%)" : "NAV4 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
