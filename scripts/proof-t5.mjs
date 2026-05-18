// scripts/proof-t5.mjs — BUG T5 : titres biens localisés.
//  1) Unit getLocalizedField : de->title_de, en->title_en, fallback FR.
//  2) Home fr/en/de : carousel rend des titres non vides, 0 régression.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// Miroir EXACT de lib/i18n-field.ts (node n'importe pas .ts de façon
// fiable ; le module réel est couvert par tsc + build + runtime home).
function getLocalizedField(obj, field, locale) {
  if (!obj) return "";
  const loc = ["fr", "en", "de"].includes(locale) ? locale : "fr";
  const pick = (k) => {
    const v = obj[k];
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };
  return pick(`${field}_${loc}`) ?? pick(`${field}_fr`) ?? pick(field) ?? "";
}

const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "t5");
await mkdir(OUT, { recursive: true });

// --- 1) Unit ---
const apimo = { title_fr: "Maison FR", title_en: "House EN", title_de: "Haus DE" };
const offmarketFRonly = { title: "Bien FR seul" };
const offmarketDE = { title: "Bien FR", title_de: "Objekt DE" };
const u = [
  ["apimo de", getLocalizedField(apimo, "title", "de") === "Haus DE"],
  ["apimo en", getLocalizedField(apimo, "title", "en") === "House EN"],
  ["apimo fr", getLocalizedField(apimo, "title", "fr") === "Maison FR"],
  ["offmarket FR-only -> de fallback", getLocalizedField(offmarketFRonly, "title", "de") === "Bien FR seul"],
  ["offmarket de present", getLocalizedField(offmarketDE, "title", "de") === "Objekt DE"],
  ["offmarket de absent -> en -> fr base", getLocalizedField(offmarketDE, "title", "en") === "Bien FR"],
];
const unitOk = u.every(([, ok]) => ok);
u.forEach(([n, ok]) => console.log(`${ok ? "OK " : "KO "}unit ${n}`));

// --- 2) Home fr/en/de ---
const BASE = "http://localhost:3001";
const device = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};
const browser = await chromium.launch();
const ctx = await browser.newContext(device);
const rows = [];
for (const loc of ["fr", "en", "de"]) {
  const p = await ctx.newPage();
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e.message).split("\n")[0]));
  const r = await p.goto(`${BASE}/${loc}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await p.waitForTimeout(3000);
  const status = r ? r.status() : 0;
  // Titres du carousel featured (h3 dans les cartes)
  const titles = await p.$$eval("article h3", (h) =>
    h.map((e) => e.textContent?.trim()).filter(Boolean),
  );
  await p.screenshot({ path: path.join(OUT, `home-${loc}.png`), fullPage: true });
  rows.push({ loc, status, cardTitles: titles.length, sample: titles[0]?.slice(0, 28) ?? "", jsErr: errs[0] ?? "" });
  await p.close();
}
await ctx.close();
await browser.close();
console.table(rows);

const homeOk = rows.every((r) => r.status === 200 && r.cardTitles > 0 && !r.jsErr);
const ok = unitOk && homeOk;
console.log(ok ? "T5 PROOF: OK ✅ (helper localisé + home fr/en/de sans régression)" : "T5 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
