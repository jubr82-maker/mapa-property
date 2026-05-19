// scripts/proof-pol3-2.mjs — POL3-2 : retrait du bloc avis clients des
// fiches biens (standard + off-market), conservation du ReviewsCarousel
// sur la home.
//
// Vérifie :
//  (a) 3 fiches différentes (≥1 standard /biens/[slug] + off-market) :
//      AUCUN <section data-fiche-reviews> et aucun texte "Avis clients".
//  (b) /fr home : la section avis (ReviewsCarousel) est TOUJOURS présente
//      (eyebrow "Ils nous ont fait confiance" + cartes blockquote).
//  Screenshots Mac 1440 + iPhone 17 Pro Max.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-19", "pol3-2");
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

const ficheState = (page) =>
  page.evaluate(() => {
    const hasFicheReviews = !!document.querySelector("[data-fiche-reviews]");
    // "Avis clients" = libellé i18n du bloc fiche supprimé.
    const bodyText = document.body.innerText || "";
    const hasAvisClients = /Avis clients/i.test(bodyText);
    return { hasFicheReviews, hasAvisClients };
  });

const d = await browser.newContext({ viewport: { width: 1440, height: 900 } });

// Découverte fiches.
const disco = await d.newPage();
await disco.goto(`${BASE}/fr/biens`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await disco.waitForTimeout(2500);
const bienHrefs = await disco.evaluate(() =>
  [
    ...new Set(
      [...document.querySelectorAll('a[href*="/biens/"]')]
        .map((x) => new URL(x.href).pathname)
        .filter((p) => /\/biens\/[^/]+$/.test(p)),
    ),
  ].slice(0, 2),
);
await disco.goto(`${BASE}/fr/off-market`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await disco.waitForTimeout(2000);
const offHref = await disco.evaluate(() => {
  const a = [...document.querySelectorAll('a[href*="/off-market/"]')].find(
    (x) => {
      const p = new URL(x.href).pathname;
      return /\/off-market\/[^/]+$/.test(p) && !/\/arcova$/.test(p);
    },
  );
  return a ? new URL(a.href).pathname : null;
});
await disco.close();

const fiches = [...bienHrefs];
if (offHref) fiches.push(offHref);
const out = { fiches, perFiche: [] };

for (const href of fiches) {
  const p = await d.newPage();
  await p.goto(`${BASE}${href}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await p.waitForTimeout(2000);
  const st = await ficheState(p);
  out.perFiche.push({ href, ...st });
  await p.screenshot({
    path: path.join(OUT, `fiche-${href.replace(/\W+/g, "_")}.png`),
    fullPage: true,
  });
  await p.close();
}

// Home /fr : ReviewsCarousel toujours présent.
const home = await d.newPage();
await home.goto(`${BASE}/fr`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await home.waitForTimeout(2500);
out.home = await home.evaluate(() => {
  const txt = document.body.innerText || "";
  // Le ReviewsCarousel rend des <blockquote> dans une section avec
  // l'eyebrow "Ils nous ont fait confiance".
  const blockquotes = document.querySelectorAll("blockquote").length;
  return {
    hasEyebrow: /Ils nous ont fait confiance/i.test(txt),
    blockquotes,
  };
});
await home.screenshot({
  path: path.join(OUT, "home-fr-mac1440.png"),
  fullPage: true,
});
await home.close();
await d.close();

// iPhone : 1 fiche + home.
const m = await browser.newContext(IPHONE);
if (fiches[0]) {
  const pf = await m.newPage();
  await pf.goto(`${BASE}${fiches[0]}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await pf.waitForTimeout(2000);
  out.fiche_iphone = { href: fiches[0], ...(await ficheState(pf)) };
  await pf.screenshot({ path: path.join(OUT, "fiche-iphone.png"), fullPage: true });
  await pf.close();
}
const hm = await m.newPage();
await hm.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await hm.waitForTimeout(2500);
out.home_iphone = await hm.evaluate(() => ({
  hasEyebrow: /Ils nous ont fait confiance/i.test(document.body.innerText || ""),
  blockquotes: document.querySelectorAll("blockquote").length,
}));
await hm.screenshot({ path: path.join(OUT, "home-iphone.png"), fullPage: true });
await hm.close();
await m.close();
await browser.close();

console.log(JSON.stringify(out, null, 2));

// ── Assertions ─────────────────────────────────────────────────────────
const enoughFiches = out.perFiche.length >= 3;
const fichesClean = out.perFiche.every(
  (f) => f.hasFicheReviews === false && f.hasAvisClients === false,
);
const iphoneFicheClean =
  !out.fiche_iphone ||
  (out.fiche_iphone.hasFicheReviews === false &&
    out.fiche_iphone.hasAvisClients === false);
const homeHasReviews =
  out.home.hasEyebrow && out.home.blockquotes > 0 &&
  out.home_iphone.hasEyebrow && out.home_iphone.blockquotes > 0;

const ok = enoughFiches && fichesClean && iphoneFicheClean && homeHasReviews;
console.log(
  "POL3-2: enoughFiches=%s fichesClean=%s iphoneFicheClean=%s homeHasReviews=%s",
  enoughFiches,
  fichesClean,
  iphoneFicheClean,
  homeHasReviews,
);
console.log(ok ? "POL3-2 PROOF: OK" : "POL3-2 PROOF: KO");
process.exit(ok ? 0 : 1);
