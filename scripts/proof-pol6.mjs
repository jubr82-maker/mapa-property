// scripts/proof-pol6.mjs — POL6 : ordre des sections home + fusion
// Marchés/Chiffres + nettoyage Marchés actifs. Mac 1440 + iPhone.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-18", "pol6");
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await p.waitForTimeout(2500);

const data = await p.evaluate(() => {
  // Texte VISIBLE d'un élément (exclut .sr-only / script / style).
  const visText = (root) => {
    const c = root.cloneNode(true);
    c.querySelectorAll(".sr-only, script, style").forEach((e) => e.remove());
    return (c.innerText || "").replace(/\s+/g, " ");
  };
  // Séquence des <section> : label déduit du h1/h2 + eyebrow PROPRES
  // de chaque section (pas du texte global → pas de collision Hero).
  const secs = [...document.querySelectorAll("section")];
  const seq = [];
  secs.forEach((s, i) => {
    const h = (s.querySelector("h1,h2")?.textContent || "").trim();
    const eb = (s.querySelector("p")?.textContent || "").trim();
    let label = null;
    if (/Du Grand-Duché aux marchés mondiaux/i.test(h)) label = "coverageStats";
    else if (/Six métiers/i.test(h)) label = "sixMetiers";
    else if (/familles d.actifs/i.test(h)) label = "coverage";
    else if (/^Marchés actifs$/i.test(eb) === false && /Coups de c[œo]ur|sélection|Biens à la une|nos biens/i.test(h + " " + eb))
      label = "featured";
    else if (/^Notre méthode$/i.test(eb) || /Trois étapes, un cadre/i.test(h))
      label = "methode";
    else if (/^Mandats$/i.test(eb) || /Quatre formules/i.test(h))
      label = "mandates";
    if (label && !seq.find((x) => x.label === label))
      seq.push({ label, i });
  });
  const pos = (l) => seq.find((x) => x.label === l)?.i ?? -1;
  const markers = {
    featured: pos("featured"),
    coverage: pos("coverage"),
    mandates: pos("mandates"),
    coverageStats: pos("coverageStats"),
    methode: pos("methode"),
    sixMetiers: pos("sixMetiers"),
  };
  // Fusion : la section du titre Marchés contient AUSSI la bande stats.
  const marchesEl = [...document.querySelectorAll("h2")].find((h) =>
    /Du Grand-Duché aux marchés mondiaux/i.test(h.textContent || ""),
  );
  const sec = marchesEl?.closest("section");
  const statsInSameSection = sec
    ? /\bLU\b|\bINTL\b/.test(sec.innerText || "") &&
      sec.querySelector(".bg-bg-contrast, [class*='bg-bg-contrast']") != null
    : false;
  // Nettoyage : la liste détaillée des communes ne doit plus être
  // VISIBLE *dans la section couverture* (sr-only SEO toléré). On
  // scope au <section> CoverageStats — ailleurs « Belair » peut être
  // un titre de bien Apimo légitime (faux positif sinon).
  let communeVisible = false;
  if (sec) {
    const clone = sec.cloneNode(true);
    clone.querySelectorAll(".sr-only, script, style").forEach((e) => e.remove());
    communeVisible = /KIRCHBERG|STRASSEN|BERTRANGE|WALFERDANGE/i.test(
      clone.textContent || "",
    );
  }
  return { markers, seq, statsInSameSection, communeVisible };
});
await p.screenshot({ path: path.join(OUT, "home-mac1440.png"), fullPage: true });
await p.close();
await ctx.close();

const cm = await browser.newContext({
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
});
const pm = await cm.newPage();
await pm.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await pm.waitForTimeout(2500);
await pm.screenshot({ path: path.join(OUT, "home-iphone.png"), fullPage: true });
await pm.close();
await cm.close();
await browser.close();

const m = data.markers;
console.log(JSON.stringify(data, null, 2));
const order =
  m.featured >= 0 &&
  m.coverage > m.featured &&
  m.mandates > m.coverage && // CTA mandat remonté (avant couverture)
  m.coverageStats > m.mandates &&
  m.methode > m.coverageStats && // méthode après la couverture
  m.sixMetiers > m.methode; // Six métiers après la méthode (remontée)
const ok = order && data.statsInSameSection && !data.communeVisible;
console.log(ok ? "POL6 PROOF: OK ✅ (ordre + fusion + nettoyage)" : "POL6 PROOF: KO ❌");
process.exit(ok ? 0 : 1);
