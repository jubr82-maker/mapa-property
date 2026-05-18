// scripts/proof-pol6b.mjs — Extension communes LU (demande Julien).
// /services/marches-actifs liste toutes les grandes communes incl.
// les exemples cités ; StatsBand home affiche le nouveau total.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "pol6b");
await mkdir(OUT, { recursive: true });
const MUST = [
  "Steinfort", "Mamer", "Capellen", "Kehlen", "Koerich",
  "Hobscheid", "Käerjeng", "Dippach", "Esch-sur-Alzette", "Differdange",
];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// 1) /services/marches-actifs : grille communes visible
const p1 = await ctx.newPage();
await p1.goto(`${BASE}/fr/services/marches-actifs`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await p1
  .locator('a[href*="city=Steinfort"]')
  .first()
  .waitFor({ timeout: 25000 })
  .catch(() => {});
await p1.waitForTimeout(1000);
const communeLinks = await p1.evaluate(() =>
  [...document.querySelectorAll('a[href*="country=LU&city="]')].map(
    (a) => (a.textContent || "").trim(),
  ),
);
const present = MUST.filter((c) => communeLinks.includes(c));
await p1.screenshot({ path: path.join(OUT, "marches-actifs.png"), fullPage: true });
await p1.close();

// 2) Home StatsBand : compteur communes
const p2 = await ctx.newPage();
await p2.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p2.waitForTimeout(2500);
const communeStat = await p2.evaluate(() => {
  const gt = [...document.querySelectorAll(".gold-text")].find((e) =>
    /LU$/.test((e.parentElement?.textContent || "").replace(/\s+/g, "")),
  );
  return gt ? parseInt(gt.textContent || "0", 10) : 0;
});
await p2.close();
await ctx.close();
await browser.close();

console.log(
  JSON.stringify(
    { totalCommuneLinks: communeLinks.length, present, communeStat },
    null,
    2,
  ),
);
const ok =
  present.length === MUST.length &&
  communeLinks.length >= 60 &&
  communeStat >= 60;
console.log(
  ok
    ? `POL6b PROOF: OK ✅ (${communeLinks.length} communes listées, stat=${communeStat})`
    : `POL6b PROOF: KO ❌ (links ${communeLinks.length}, présents ${present.length}/${MUST.length}, stat ${communeStat})`,
);
process.exit(ok ? 0 : 1);
