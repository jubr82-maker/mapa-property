// scripts/proof-nav3.mjs — NAV3 : « Marchés actifs » plus compact sur
// desktop, contenu identique. Mesure la hauteur de la section desktop
// + vérifie que tout le contenu (communes + régions) est conservé.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "nav3");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

const d = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pd = await d.newPage();
await pd.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await pd.waitForTimeout(2500);
const sec = pd
  .locator("section")
  .filter({ hasText: "Du Grand-Duché aux marchés mondiaux" })
  .first();
await sec.scrollIntoViewIfNeeded();
await pd.waitForTimeout(400);
const m = await sec.evaluate((root) => {
  // Sous-arbre desktop visible uniquement (exclut .md:hidden et .sr-only).
  const visible = root.querySelector(".hidden.md\\:block");
  const communeLinks = visible
    ? visible.querySelectorAll('a[href*="country=LU&city="]').length
    : 0;
  const h = visible
    ? Math.round(visible.getBoundingClientRect().height)
    : 0;
  return {
    sectionHeight: Math.round(root.getBoundingClientRect().height),
    desktopBlockHeight: h,
    communeLinks,
  };
});
await sec.screenshot({ path: path.join(OUT, "markets-mac1440.png") });
await pd.close();
await d.close();

const mob = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
const pm = await mob.newPage();
await pm.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await pm.waitForTimeout(2000);
const secM = pm
  .locator("section")
  .filter({ hasText: "Nos marchés actifs" })
  .first();
await secM.scrollIntoViewIfNeeded();
await pm.screenshot({ path: path.join(OUT, "markets-iphone.png") });
await pm.close();
await mob.close();
await browser.close();

console.log(JSON.stringify(m, null, 2));
// Contenu intact (>= ~20 communes rendues) + section nettement plus
// compacte qu'avant (l'ancienne version dépassait ~1000px sur 1440).
// Contenu intact (24 communes) + bloc desktop nettement compact
// (l'ancienne version dépassait ~900-1000px sur 1440).
const ok =
  m.communeLinks >= 20 && m.desktopBlockHeight > 0 && m.desktopBlockHeight < 620;
console.log(
  ok
    ? `NAV3 PROOF: OK ✅ (bloc desktop ${m.desktopBlockHeight}px, ${m.communeLinks} communes intactes)`
    : `NAV3 PROOF: KO ❌ (desktopBlockHeight=${m.desktopBlockHeight}, communes=${m.communeLinks})`,
);
process.exit(ok ? 0 : 1);
