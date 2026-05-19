// POL2-8 proof — OffmarketPlaceholder gradient cuivré + OFF MARKET dominant.
// Asserts: radial-gradient présent ; font-size("OFF MARKET") >
// font-size("BIEN STRICTEMENT CONFIDENTIEL").
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3003";
const OM_ID = "eb7c7bd4-7a0c-4307-bca3-2aa314a63077";
const OUT = "docs/qa/screenshots-2026-05-18/pol2-8";

const IPHONE = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

function px(s) {
  return parseFloat(String(s).replace("px", "")) || 0;
}

const run = async (label, ctxOpts) => {
  const browser = await chromium.launch();
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  await page.goto(`${BASE}/fr/off-market/${OM_ID}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector("[data-offmarket-placeholder]", {
    timeout: 30000,
  });
  await page.waitForTimeout(500);

  const data = await page.evaluate(() => {
    const root = document.querySelector("[data-offmarket-placeholder]");
    const title = document.querySelector("[data-offmarket-title]");
    const sub = document.querySelector("[data-offmarket-subtitle]");
    const cs = getComputedStyle(root);
    const csT = getComputedStyle(title);
    const csS = getComputedStyle(sub);
    return {
      bg: cs.backgroundImage,
      titleText: title.textContent.trim(),
      subText: sub.textContent.trim(),
      titleSize: csT.fontSize,
      subSize: csS.fontSize,
    };
  });

  await mkdir(OUT, { recursive: true });
  await page.screenshot({ path: `${OUT}/placeholder-${label}.png`, fullPage: false });
  await browser.close();

  const tSize = px(data.titleSize);
  const sSize = px(data.subSize);
  const hasRadial = /radial-gradient/.test(data.bg);
  const hasCopper =
    /184,\s*134,\s*90/.test(data.bg) || /rgba\(184/.test(data.bg);
  const hierarchyOK = tSize > sSize;

  console.log(`\n[${label}]`);
  console.log("  bg:", data.bg.slice(0, 90));
  console.log("  radial-gradient present:", hasRadial);
  console.log("  copper tint present:", hasCopper);
  console.log(`  OFF MARKET text="${data.titleText}" size=${tSize}px`);
  console.log(`  mention text="${data.subText}" size=${sSize}px`);
  console.log("  hierarchy (OFF MARKET > mention):", hierarchyOK);

  const pass =
    hasRadial &&
    hasCopper &&
    hierarchyOK &&
    /OFF MARKET/i.test(data.titleText);
  console.log(`  RESULT: ${pass ? "PASS" : "FAIL"}`);
  return pass;
};

const a = await run("desktop-1440", {
  viewport: { width: 1440, height: 900 },
});
const b = await run("iphone17promax", IPHONE);

console.log(`\n=== POL2-8 ${a && b ? "PASS" : "FAIL"} ===`);
process.exit(a && b ? 0 : 1);
