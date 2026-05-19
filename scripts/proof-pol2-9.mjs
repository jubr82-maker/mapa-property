// POL2-9 proof — Off-market prix pilotable admin.
//
// Test A : price_on_demand=false (défaut / colonne absente) ⇒ prix réel
//          (price_display) affiché, pas de crash.
// Test B : price_on_demand=true ⇒ "Prix sur demande" localisé fr/en/de.
//
// Le composant PropertyPrice est pur (aucune dépendance Supabase) → on
// teste sa logique par rendu React serveur (renderToStaticMarkup) pour
// les deux états × 3 locales, puis on prouve sur la vraie fiche
// off-market que le chemin par défaut (false) ne plante pas.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import {
  PropertyPrice,
  priceOnDemandLabel,
} from "../components/property/PropertyPrice.tsx";

const BASE = "http://localhost:3003";
const OM_ID = "eb7c7bd4-7a0c-4307-bca3-2aa314a63077";
const OUT = "docs/qa/screenshots-2026-05-18/pol2-9";

let allPass = true;
const check = (name, cond, detail) => {
  console.log(`  [${cond ? "PASS" : "FAIL"}] ${name}${detail ? " — " + detail : ""}`);
  if (!cond) allPass = false;
};

// ── Test A : flag false/undefined ⇒ prix réel affiché ───────────────────
console.log("\nTest A — price_on_demand falsy ⇒ prix réel (price_display)");
for (const [pod, podLabel] of [
  [false, "false"],
  [undefined, "undefined (colonne absente)"],
  [null, "null"],
]) {
  for (const loc of ["fr", "en", "de"]) {
    const html = renderToStaticMarkup(
      React.createElement(PropertyPrice, {
        priceOnDemand: pod,
        display: "1 250 000 €",
        locale: loc,
      }),
    );
    check(
      `A ${loc} pod=${podLabel}`,
      html.includes("1 250 000 €") &&
        html.includes('data-on-demand="false"'),
      html.replace(/<[^>]+>/g, "").trim(),
    );
  }
}

// ── Test B : flag true ⇒ "Prix sur demande" localisé ────────────────────
console.log("\nTest B — price_on_demand=true ⇒ libellé localisé");
const EXPECT = {
  fr: "Prix sur demande",
  en: "Price on request",
  de: "Preis auf Anfrage",
};
for (const loc of ["fr", "en", "de"]) {
  const html = renderToStaticMarkup(
    React.createElement(PropertyPrice, {
      priceOnDemand: true,
      display: "1 250 000 €",
      locale: loc,
    }),
  );
  check(
    `B ${loc}`,
    html.includes(EXPECT[loc]) &&
      !html.includes("1 250 000") &&
      html.includes('data-on-demand="true"'),
    html.replace(/<[^>]+>/g, "").trim(),
  );
  check(`B helper ${loc}`, priceOnDemandLabel(loc) === EXPECT[loc]);
}

// ── Test C : vraie fiche off-market — chemin par défaut, pas de crash ────
console.log("\nTest C — vraie fiche off-market (chemin défaut, no crash)");
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();
const resp = await page.goto(`${BASE}/fr/off-market/${OM_ID}`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForSelector("[data-property-price]", { timeout: 30000 });
const live = await page.evaluate(() => {
  const el = document.querySelector("[data-property-price]");
  return { text: el?.textContent?.trim(), od: el?.getAttribute("data-on-demand") };
});
await mkdir(OUT, { recursive: true });
await page.screenshot({ path: `${OUT}/offmarket-fiche-default.png` });
await browser.close();
check("C HTTP 200", resp.status() === 200, String(resp.status()));
check(
  "C price element present, not crashed, default false path",
  !!live.text && live.od === "false",
  `text="${live.text}" data-on-demand=${live.od}`,
);

console.log(`\n=== POL2-9 ${allPass ? "PASS" : "FAIL"} ===`);
process.exit(allPass ? 0 : 1);
