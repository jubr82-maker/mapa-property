// scripts/gate-pol2.mjs — Gate visuel global POLISH 2 : 5 routes ×
// {light,dark} × {iPhone 17 Pro Max, Mac 1440} = 20 combos.
// KO si HTTP≥400, pageerror JS, ou overflow horizontal.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "gate-pol2");
await mkdir(OUT, { recursive: true });
const ROUTES = [
  "/fr",
  "/fr/biens/85866347",
  "/fr/off-market",
  "/fr/journal",
  "/fr/services/estimer",
];
const VPS = [
  {
    name: "iphone17promax",
    viewport: { width: 440, height: 956 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  },
  { name: "mac1440", viewport: { width: 1440, height: 900 } },
];
const browser = await chromium.launch();
const results = [];
for (const vp of VPS) {
  for (const mode of ["light", "dark"]) {
    const opts = { ...vp };
    delete opts.name;
    const ctx = await browser.newContext({ ...opts, colorScheme: mode });
    await ctx.addInitScript((m) => {
      try { localStorage.setItem("theme", m); } catch {}
    }, mode);
    for (const route of ROUTES) {
      const p = await ctx.newPage();
      const errs = [];
      p.on("pageerror", (e) => errs.push(String(e.message).split("\n")[0]));
      let status = 0;
      let verdict = "OK";
      try {
        const r = await p.goto(`${BASE}${route}`, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });
        status = r ? r.status() : 0;
        await p.waitForTimeout(2500);
        const overflow = await p.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth + 2,
        );
        if (status >= 400) verdict = `CRASH HTTP ${status}`;
        else if (errs.length) verdict = `JSERR ${errs[0]}`.slice(0, 60);
        else if (overflow) verdict = "OVERFLOW-X";
      } catch (e) {
        verdict = "CRASH " + String(e.message).split("\n")[0];
      }
      await p.screenshot({
        path: path.join(
          OUT,
          `${vp.name}-${mode}-${route.replace(/\W+/g, "_")}.png`,
        ),
        fullPage: true,
      });
      results.push({ vp: vp.name, mode, route, status, verdict });
      await p.close();
    }
    await ctx.close();
  }
}
await browser.close();
const ko = results.filter((r) => r.verdict !== "OK");
for (const r of results)
  console.log(
    `${r.verdict === "OK" ? "✅" : "❌"} ${r.vp}/${r.mode} ${r.route} → ${r.verdict}`,
  );
console.log(
  `\n${results.length - ko.length}/${results.length} OK` +
    (ko.length ? ` — ${ko.length} KO` : " — 0 CRASH"),
);
process.exit(ko.length === 0 ? 0 : 1);
