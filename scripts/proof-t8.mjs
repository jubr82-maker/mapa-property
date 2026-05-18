// scripts/proof-t8.mjs — BUG T8 : header élargi (1400->1600) sans
// toucher le logo. Mac 1440, 1920, iPhone 17 Pro Max.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "t8");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

const viewports = [
  { name: "mac1440", width: 1440, height: 900, mobile: false },
  { name: "desktop1920", width: 1920, height: 1080, mobile: false },
  {
    name: "iphone17promax",
    width: 440,
    height: 956,
    mobile: true,
  },
];

const rows = [];
for (const v of viewports) {
  const ctx = await browser.newContext({
    viewport: { width: v.width, height: v.height },
    deviceScaleFactor: v.mobile ? 3 : 1,
    isMobile: v.mobile,
    hasTouch: v.mobile,
    ...(v.mobile
      ? {
          userAgent:
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
        }
      : {}),
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(2500);
  const m = await p.evaluate(() => {
    const header = document.querySelector("header");
    const grid = header?.querySelector(":scope > div");
    // Logo VISIBLE uniquement (le header a 2 <img> : mobile lg:hidden +
    // desktop hidden lg:inline-block ; l'un est display:none).
    const imgs = [...(header?.querySelectorAll("img") ?? [])];
    const visible = imgs.find(
      (i) => i.offsetParent !== null && i.getBoundingClientRect().height > 0,
    );
    const gridCS = grid ? getComputedStyle(grid) : null;
    return {
      gridClientW: grid?.clientWidth ?? 0,
      gridMaxW: gridCS?.maxWidth ?? "",
      logoH: visible ? Math.round(visible.getBoundingClientRect().height) : 0,
      headerOverflow: document.body.scrollWidth <= document.documentElement.clientWidth + 1,
    };
  });
  await p.screenshot({ path: path.join(OUT, `header-${v.name}.png`) });
  rows.push({ vp: v.name, ...m });
  await ctx.close();
}
await browser.close();
console.table(rows);

const mac = rows.find((r) => r.vp === "mac1440");
const big = rows.find((r) => r.vp === "desktop1920");
const mob = rows.find((r) => r.vp === "iphone17promax");
const ok =
  mac.gridMaxW === "1600px" &&
  big.gridMaxW === "1600px" &&
  // 1920 : container atteint ~1600 (vs 1400 avant) ; 1440 : ~viewport-padding
  big.gridClientW > 1500 && big.gridClientW <= 1600 &&
  mac.gridClientW > 1340 &&
  // logo intact : 96px desktop, 56px mobile (tolérance arrondi)
  mac.logoH >= 90 && mac.logoH <= 100 &&
  big.logoH >= 90 && big.logoH <= 100 &&
  mob.logoH >= 50 && mob.logoH <= 62 &&
  rows.every((r) => r.headerOverflow);
console.log(ok ? "T8 PROOF: OK ✅ (header 1600, logo intact, 0 overflow)" : "T8 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
