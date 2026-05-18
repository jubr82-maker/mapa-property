// scripts/proof-t1.mjs — BUG T1 : 404 fiches biens. Récolte les liens
// /biens/* et /mandats/* depuis la home + /biens, visite chacun, logge
// status HTTP + erreurs SSR. iPhone 17 Pro Max.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "t1");
const device = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext(device);

async function collect(page, url, re) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
  return [...new Set(hrefs.filter((h) => h && re.test(h)))];
}

const page = await ctx.newPage();
const bienLinks = [
  ...(await collect(page, `${BASE}/fr`, /\/fr\/biens\/[^/?#]+$/)),
  ...(await collect(page, `${BASE}/fr/biens`, /\/fr\/biens\/[^/?#]+$/)),
];
const mandatLinks = [
  ...(await collect(page, `${BASE}/fr`, /\/fr\/mandats\/[^/?#]+$/)),
];
await page.close();

const biens = [...new Set(bienLinks)].slice(0, 12);
const mandats = [...new Set(mandatLinks)].slice(0, 10);
const results = [];

for (const href of [...biens, ...mandats]) {
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e.message).split("\n")[0]));
  let status = 0;
  try {
    const r = await p.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    status = r ? r.status() : 0;
    await p.waitForTimeout(1500);
  } catch (e) {
    errs.push(String(e.message).split("\n")[0]);
  }
  // 404 Next = soit status 404, soit page "not found" rendue en 200
  const notFound =
    status === 404 ||
    (await p.locator("text=/404|introuvable|not found|cette page n.?existe/i").count().catch(() => 0)) > 0;
  results.push({ href, status, notFound, err: errs[0] ?? "" });
  await p.close();
}

await ctx.close();
await browser.close();
console.table(results);
const ko = results.filter((r) => r.notFound || r.status >= 400 || r.err);
console.log(
  `biens=${biens.length} mandats=${mandats.length} — ${results.length - ko.length}/${results.length} OK`,
);
console.log(ko.length === 0 ? "T1 PROOF: OK ✅ (0 404)" : `T1 PROOF: KO ❌ (${ko.length})`);
process.exit(ko.length === 0 ? 0 : 1);
