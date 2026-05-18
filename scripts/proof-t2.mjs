// scripts/proof-t2.mjs — BUG T2 : audit exhaustif des liens de nav
// (header desktop + burger mobile) en fr/en/de. Récupère tous les
// href du <header>, visite chacun, logge les 404.
import { chromium } from "@playwright/test";

const BASE = "http://localhost:3001";
const LOCALES = ["fr", "en", "de"];
const browser = await chromium.launch();

const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const mobile = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});

async function navHrefs(ctx, locale, openBurger) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/${locale}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(2000);
  if (openBurger) {
    const burger = p.locator('header button[aria-label], header button:has(svg)').first();
    await burger.click().catch(() => {});
    await p.waitForTimeout(800);
  } else {
    // hover les dropdowns desktop pour rendre les items
    for (const d of await p.locator("header nav > *").all()) {
      await d.hover().catch(() => {});
      await p.waitForTimeout(150);
    }
  }
  const hrefs = await p.$$eval("header a[href]", (as) =>
    as.map((a) => a.getAttribute("href")).filter(Boolean),
  );
  await p.close();
  return [...new Set(hrefs)];
}

const all = new Set();
for (const loc of LOCALES) {
  (await navHrefs(desktop, loc, false)).forEach((h) => all.add(h));
  (await navHrefs(mobile, loc, true)).forEach((h) => all.add(h));
}

// normalise en URLs absolues testables
const urls = [...all]
  .filter((h) => h.startsWith("/") && !h.startsWith("//"))
  .map((h) => (/^\/(fr|en|de)(\/|$)/.test(h) ? h : `/fr${h === "/" ? "" : h}`));

const results = [];
const tester = await browser.newContext();
for (const u of [...new Set(urls)].sort()) {
  const p = await tester.newPage();
  let status = 0;
  try {
    const r = await p.goto(`${BASE}${u}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    status = r ? r.status() : 0;
    await p.waitForTimeout(400);
  } catch {}
  const nf =
    status === 404 ||
    (await p.locator("text=/page introuvable|n.?existe pas|not found|404/i").count().catch(() => 0)) > 0;
  results.push({ url: u, status, notFound: nf });
  await p.close();
}
await browser.close();

console.table(results);
const ko = results.filter((r) => r.notFound || r.status >= 400);
console.log(`${results.length - ko.length}/${results.length} liens nav OK`);
if (ko.length) console.log("KO:", JSON.stringify(ko));
console.log(ko.length === 0 ? "T2 PROOF: OK ✅" : `T2 PROOF: KO ❌ (${ko.length})`);
process.exit(ko.length === 0 ? 0 : 1);
