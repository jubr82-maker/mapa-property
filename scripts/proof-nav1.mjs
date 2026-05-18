// scripts/proof-nav1.mjs — NAV1 : header réorganisé.
// Desktop Mac 1440 : ordre ACHETER VENDRE LOUER · logo · OFF-MARKET
// SERVICES JOURNAL ; pas de MANDATS ; sous-menu ACHETER sans Off-Market.
// Mobile iPhone : burger même ordre, pas de MANDATS.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "nav1");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

// ---- Desktop ----
const d = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pd = await d.newPage();
await pd.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await pd.waitForTimeout(2500);
// labels top-niveau de la nav header (liens + boutons dropdown)
const norm = (a) => a.map((s) => s.replace(/\s+/g, " ").trim().toUpperCase()).filter(Boolean);
// Libellés TOP-NIVEAU uniquement = enfants DIRECTS des conteneurs nav
// (pour un .group on lit son > button, pas le sous-menu <ul>).
const { left: leftRaw, right: rightRaw } = await pd.evaluate(() => {
  const header = document.querySelector("header");
  const containers = [...header.querySelectorAll("nav.lg\\:flex, div.lg\\:flex")];
  const readTop = (c) =>
    c
      ? [...c.children].flatMap((ch) => {
          if (ch.tagName === "A") return [ch.textContent || ""];
          if (ch.classList.contains("group")) {
            const b = ch.querySelector(":scope > button");
            return b ? [b.textContent || ""] : [];
          }
          return []; // div langue/thème ignoré
        })
      : [];
  return { left: readTop(containers[0]), right: readTop(containers[1]) };
});
const left = norm(leftRaw);
const right = norm(rightRaw);

// Sous-menu ACHETER : hover puis lire les items
let acheterItems = [];
const acheterBtn = pd.locator("header nav .group > button").first();
await acheterBtn.hover().catch(() => {});
await pd.waitForTimeout(400);
acheterItems = norm(
  await pd.locator("header nav .group").first().locator("ul a").allTextContents(),
);
await pd.screenshot({ path: path.join(OUT, "header-mac1440.png") });
await pd.close();
await d.close();

// ---- Mobile burger ----
const m = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
const pm = await m.newPage();
await pm.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await pm.waitForTimeout(2000);
await pm.locator('header button[aria-label]').first().click();
await pm.waitForTimeout(900);
const burger = norm(
  await pm.locator('[role="dialog"] nav ul > li > a, [role="dialog"] nav ul > li > button').allTextContents(),
);
await pm.screenshot({ path: path.join(OUT, "burger-iphone.png"), fullPage: true });
await pm.close();
await m.close();
await browser.close();

const seq = [...left, ...right];
console.log(JSON.stringify({ left, right, acheterItems, burger }, null, 2));

const hasMandats = seq.some((l) => /MANDATS?\b/.test(l) && !/SEMI|EXCLUSIF|RECHERCHE/.test(l));
const acheterIdx = left.findIndex((l) => /ACHETER|BUY|KAUFEN/.test(l));
const vendreIdx = left.findIndex((l) => /VENDRE|SELL|VERKAUF/.test(l));
const louerIdx = left.findIndex((l) => /LOUER|RENT|MIETEN/.test(l));
const offIdx = right.findIndex((l) => /OFF.?MARKET/.test(l));
const servIdx = right.findIndex((l) => /SERVICES|DIENST/.test(l));
const journalIdx = right.findIndex((l) => /JOURNAL/.test(l));
const acheterNoOff = !acheterItems.some((l) => /OFF.?MARKET/.test(l));
const burgerNoMandats = !burger.some((l) => /^MANDATS?$/.test(l));
const burgerHasOff = burger.some((l) => /OFF.?MARKET/.test(l));

const ok =
  !hasMandats &&
  acheterIdx === 0 && vendreIdx === 1 && louerIdx === 2 &&
  offIdx === 0 && servIdx === 1 && journalIdx === 2 &&
  acheterNoOff && burgerNoMandats && burgerHasOff;
console.log(ok ? "NAV1 PROOF: OK ✅" : "NAV1 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
