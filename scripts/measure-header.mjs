import { chromium } from "@playwright/test";
const BASE = "http://localhost:3001";
const browser = await chromium.launch();
for (const w of [1440, 1920]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/fr`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const data = await page.evaluate(() => {
    const header = document.querySelector("header");
    const els = [...header.querySelectorAll("a, button")];
    const exact = (s) =>
      els.find((e) => e.textContent.trim().toUpperCase() === s.toUpperCase());
    const rect = (e) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return {
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
        cx: Math.round((r.left + r.right) / 2),
      };
    };
    // Desktop centred logo = the lg:flex justify-center wrapper's img
    const logoWrap = [...header.querySelectorAll("div")].find((d) =>
      d.className.includes("lg:justify-center"),
    );
    const logoImg = logoWrap
      ? logoWrap.querySelector("img.mapa-logo-img")
      : null;
    const langBlock = header.querySelector(".border-l");
    return {
      acheter: rect(exact("ACHETER")),
      louer: rect(exact("LOUER")),
      offmarket: rect(exact("OFF-MARKET")),
      journal: rect(exact("JOURNAL")),
      logo: rect(logoImg),
      lang: rect(langBlock),
      fontACHETER: (() => {
        const a = exact("ACHETER");
        return a ? getComputedStyle(a).fontSize : null;
      })(),
      fontLOUER: (() => {
        const a = exact("LOUER");
        return a ? getComputedStyle(a).fontSize : null;
      })(),
      fontJOURNAL: (() => {
        const a = exact("JOURNAL");
        return a ? getComputedStyle(a).fontSize : null;
      })(),
      header: rect(header.querySelector(":scope > div")),
    };
  });
  if (data.logo && data.logo.w) {
    const fS = 275 / 1080,
      fE = 906 / 1080;
    data.wordmark = {
      left: Math.round(data.logo.left + fS * data.logo.w),
      right: Math.round(data.logo.left + fE * data.logo.w),
    };
  }
  console.log(`\n=== width ${w} ===`);
  console.log(JSON.stringify(data, null, 0));
  if (data.acheter && data.logo) {
    const overlap =
      data.journal && data.lang ? data.journal.right - data.lang.left : null;
    console.log(
      "  logo cx =",
      data.logo.cx,
      "| header cx =",
      data.header ? Math.round((data.header.left + data.header.right) / 2) : "?",
    );
    console.log(
      "  |ACHETER.left - logo.left| =",
      Math.abs(data.acheter.left - data.logo.left),
      "| |JOURNAL.right - logo.right| =",
      Math.abs(data.journal.right - data.logo.right),
    );
    console.log(
      "  JOURNAL.right - lang.left =",
      overlap,
      overlap > 0 ? "OVERLAP!" : "OK (no overlap)",
    );
    console.log(
      "  lang.right =",
      data.lang.right,
      "| header.right =",
      data.header.right,
      "| Δ =",
      Math.abs(data.lang.right - data.header.right),
    );
  }
}
await browser.close();
