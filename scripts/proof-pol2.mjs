// scripts/proof-pol2.mjs — POL2 : logo header -20% + descendu 8px.
// Desktop 96->76, mobile 56->44. Mac 1440 + iPhone 17 Pro Max.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "pol2");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const rows = [];

for (const v of [
  { name: "mac1440", w: 1440, h: 900, mobile: false, expect: 76 },
  { name: "iphone", w: 440, h: 956, mobile: true, expect: 44 },
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
  await p.waitForTimeout(2000);
  const m = await p.evaluate(() => {
    const header = document.querySelector("header");
    const imgs = [...header.querySelectorAll("img")];
    const vis = imgs.find(
      (i) => i.offsetParent !== null && i.getBoundingClientRect().height > 0,
    );
    const link = vis?.closest("a");
    const linkCS = link ? getComputedStyle(link) : null;
    return {
      logoH: vis ? Math.round(vis.getBoundingClientRect().height) : 0,
      logoAttrH: vis ? Number(vis.getAttribute("height")) : 0,
      linkPadTop: linkCS ? linkCS.paddingTop : "",
    };
  });
  await p.screenshot({ path: path.join(OUT, `header-${v.name}.png`) });
  rows.push({ vp: v.name, ...m, expect: v.expect });
  await ctx.close();
}
await browser.close();
console.table(rows);
const ok = rows.every(
  (r) => r.logoAttrH === r.expect && r.logoH >= r.expect - 2 && r.logoH <= r.expect + 2 && r.linkPadTop === "8px",
);
console.log(ok ? "POL2 PROOF: OK ✅ (logo -20% + pt 8px)" : "POL2 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
