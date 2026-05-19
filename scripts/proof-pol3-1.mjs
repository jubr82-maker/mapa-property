// scripts/proof-pol3-1.mjs — POL3-1 : accordéons fiches ouverts par
// défaut + fermables individuellement.
//
// Vérifie sur une fiche standard /biens/[slug] ET une fiche off-market
// /off-market/[id] :
//  (a) au premier rendu : les 4 panneaux sont OUVERTS
//      (aria-expanded="true" + hauteur visible > 0).
//  (b) clic sur l'en-tête "Description" → ce panneau se ferme
//      (aria-expanded="false" + hauteur → 0).
//  (c) re-clic → il se ré-ouvre (aria-expanded="true" + hauteur > 0).
//  Screenshots Mac 1440 + iPhone 17 Pro Max.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-19", "pol3-1");
await mkdir(OUT, { recursive: true });

const IPHONE = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

const browser = await chromium.launch();

// État de l'accordéon : pour chaque panneau, son aria-expanded et la
// hauteur visible (offsetHeight) de son shell.
const readAccordion = (page) =>
  page.evaluate(() => {
    const root = document.querySelector("[data-fiche-accordion]");
    if (!root) return null;
    return [...root.querySelectorAll("[data-fiche-panel]")].map((sec) => {
      const btn = sec.querySelector("button[aria-expanded]");
      const shell = sec.querySelector("[data-fiche-panel-shell]");
      return {
        id: sec.getAttribute("data-panel-id"),
        label: (btn?.textContent || "").replace(/\s+/g, " ").trim(),
        expanded: btn?.getAttribute("aria-expanded"),
        ariaControls: btn?.getAttribute("aria-controls"),
        shellId: shell?.id,
        height: shell ? shell.offsetHeight : -1,
      };
    });
  });

async function testFiche(ctx, url, tag) {
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(2500);

  const initial = await readAccordion(p);
  await p.screenshot({ path: path.join(OUT, `${tag}-initial.png`), fullPage: true });

  // Cibler l'en-tête "Description" (panel id "description").
  const descBtn = p.locator(
    '[data-fiche-panel][data-panel-id="description"] button[aria-expanded]',
  );
  let afterClose = initial;
  let afterReopen = initial;
  const hasDesc = (await descBtn.count()) > 0;
  if (hasDesc) {
    await descBtn.first().click();
    await p.waitForTimeout(700); // > 300ms transition
    afterClose = await readAccordion(p);
    await p.screenshot({
      path: path.join(OUT, `${tag}-desc-closed.png`),
      fullPage: true,
    });
    await descBtn.first().click();
    await p.waitForTimeout(700);
    afterReopen = await readAccordion(p);
    await p.screenshot({
      path: path.join(OUT, `${tag}-desc-reopened.png`),
      fullPage: true,
    });
  }
  await p.close();
  return { initial, afterClose, afterReopen, hasDesc };
}

const d = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// Découverte d'une fiche standard /biens/[slug].
const disco = await d.newPage();
await disco.goto(`${BASE}/fr/biens`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await disco.waitForTimeout(2500);
const bienHref = await disco.evaluate(() => {
  const a = [...document.querySelectorAll('a[href*="/biens/"]')].find((x) =>
    /\/biens\/[^/]+$/.test(new URL(x.href).pathname),
  );
  return a ? new URL(a.href).pathname : null;
});
// Découverte d'une fiche off-market réelle.
await disco.goto(`${BASE}/fr/off-market`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await disco.waitForTimeout(2000);
const offHref = await disco.evaluate(() => {
  const a = [...document.querySelectorAll('a[href*="/off-market/"]')].find(
    (x) => {
      const pth = new URL(x.href).pathname;
      return /\/off-market\/[^/]+$/.test(pth) && !/\/arcova$/.test(pth);
    },
  );
  return a ? new URL(a.href).pathname : null;
});
await disco.close();

const out = { bienHref, offHref };
if (bienHref)
  out.bien = await testFiche(d, `${BASE}${bienHref}`, "bien-mac1440");
if (offHref)
  out.offmarket = await testFiche(d, `${BASE}${offHref}`, "offmarket-mac1440");
await d.close();

// iPhone : on revalide la fiche off-market (toujours disponible).
const m = await browser.newContext(IPHONE);
if (offHref)
  out.offmarket_iphone = await testFiche(m, `${BASE}${offHref}`, "offmarket-iphone");
await m.close();
await browser.close();

console.log(JSON.stringify(out, null, 2));

// ── Assertions ─────────────────────────────────────────────────────────
function assertFiche(f) {
  if (!f) return { ok: false, why: "fiche absente" };
  const allOpen =
    f.initial &&
    f.initial.length >= 4 &&
    f.initial.every((p) => p.expanded === "true" && p.height > 0) &&
    f.initial.every((p) => p.ariaControls && p.ariaControls === p.shellId);
  if (!f.hasDesc) return { ok: allOpen, why: allOpen ? "" : "pas tous ouverts" };
  const desc = (arr) => arr.find((p) => p.id === "description");
  const closed =
    desc(f.afterClose)?.expanded === "false" && desc(f.afterClose)?.height === 0;
  // les autres panneaux restent ouverts (toggle indépendant)
  const othersStayOpen = f.afterClose
    .filter((p) => p.id !== "description")
    .every((p) => p.expanded === "true" && p.height > 0);
  const reopened =
    desc(f.afterReopen)?.expanded === "true" && desc(f.afterReopen)?.height > 0;
  const ok = allOpen && closed && othersStayOpen && reopened;
  return {
    ok,
    why: ok
      ? ""
      : `allOpen=${allOpen} closed=${closed} othersStayOpen=${othersStayOpen} reopened=${reopened}`,
  };
}

const rBien = assertFiche(out.bien);
const rOff = assertFiche(out.offmarket);
const rOffM = assertFiche(out.offmarket_iphone);
console.log("bien:", JSON.stringify(rBien));
console.log("offmarket:", JSON.stringify(rOff));
console.log("offmarket_iphone:", JSON.stringify(rOffM));

// La fiche standard peut être indisponible si aucun bien publié : on
// exige au minimum la preuve off-market (toujours présente) desktop+mobile,
// et la fiche standard si elle a été trouvée.
const bienOk = out.bienHref ? rBien.ok : true;
const ok = bienOk && rOff.ok && rOffM.ok;
console.log(ok ? "POL3-1 PROOF: OK" : "POL3-1 PROOF: KO");
process.exit(ok ? 0 : 1);
