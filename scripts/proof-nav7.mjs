// scripts/proof-nav7.mjs — NAV7 : mot fondateur retiré + plus de
// « Julien » seul sur les pages publiques (hors « Julien Brebion »
// complet autorisé : qui-sommes-nous, fiche off-market sous photo…).
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "nav7");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
// "Julien" NON suivi de " Brebion"
const loneJulien = (txt) => (txt.match(/Julien(?!\s+Brebion)/g) || []).length;

// Texte UI hors témoignages clients : les avis (blockquote, DB
// `reviews`) citent légitimement « Julien » — hors scope NAV7
// (réécrire un témoignage = le falsifier).
async function bodyText(url) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(2500);
  const txt = await p.evaluate(() => {
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll("blockquote, script, style").forEach((e) => e.remove());
    return clone.innerText;
  });
  if (url === "/fr") {
    await p.screenshot({ path: path.join(OUT, "home.png"), fullPage: true });
  }
  await p.close();
  return txt;
}

const home = await bodyText("/fr");
const mandat = await bodyText("/fr/mandats/semi-exclusif");
const arcova = await bodyText("/fr/off-market/arcova");
const fiche = await bodyText("/fr/off-market/eb7c7bd4-7a0c-4307-bca3-2aa314a63077");
const qsn = await bodyText("/fr/qui-sommes-nous");
await ctx.close();
await browser.close();

const rows = [
  { page: "home", founderQuote: /Travailler ensemble est important/.test(home), loneJulien: loneJulien(home) },
  { page: "mandat-semi", loneJulien: loneJulien(mandat) },
  { page: "arcova", loneJulien: loneJulien(arcova) },
  { page: "fiche-offmarket", loneJulien: loneJulien(fiche), hasFull: /Julien Brebien|Julien Brebion/.test(fiche) },
  { page: "qui-sommes-nous (exception)", loneJulien: loneJulien(qsn), hasFull: /Julien Brebion/.test(qsn) },
];
console.table(rows);

const ok =
  !rows[0].founderQuote &&
  rows[0].loneJulien === 0 &&
  rows[1].loneJulien === 0 &&
  rows[2].loneJulien === 0 &&
  rows[3].loneJulien === 0 && rows[3].hasFull === true &&
  rows[4].hasFull === true; // QSN garde "Julien Brebion" complet
console.log(ok ? "NAV7 PROOF: OK ✅" : "NAV7 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
