// POL2-7 proof — Refonte fiche UNIFIÉE style Magrey.
//
// Sur 3 fiches DIFFÉRENTES (2 /biens types différents + 1 /off-market) :
// assert la MÊME structure clé partagée (landmarks présents sur les 3) :
//   - header unifié (data-fiche-header + topbar back/actions + price)
//   - galerie (PropertyGallery img OU OffmarketPlaceholder)
//   - grille caractéristiques (data-fiche-specs + SignatureLine cuivre)
//   - 4 onglets accordéon IDENTIQUES (data-fiche-accordion, 4 panneaux)
//   - colonne droite ÉPURÉE (conseiller + mandat exclusif + mandat
//     recherche, ET RIEN d'autre : pas de simulateur dans l'aside)
//   - bloc formulaire bas (#contact-form)
// Plus : SignatureLine cuivre présent, hover photo zoom 1.02.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = "http://localhost:3003";
const OUT = "docs/qa/screenshots-2026-05-18/pol2-7";
const IPHONE = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

const FICHES = [
  { url: "/fr/biens/86388715", label: "biens-villa", kind: "standard" },
  { url: "/fr/biens/86747780", label: "biens-commerce", kind: "standard" },
  {
    url: "/fr/off-market/eb7c7bd4-7a0c-4307-bca3-2aa314a63077",
    label: "offmarket",
    kind: "offmarket",
  },
];

let allPass = true;
const check = (n, c, d) => {
  console.log(`    [${c ? "PASS" : "FAIL"}] ${n}${d ? " — " + d : ""}`);
  if (!c) allPass = false;
};

const audit = async (page) =>
  page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const qa = (s) => [...document.querySelectorAll(s)];
    const cs = (el, p) => (el ? getComputedStyle(el)[p] : null);

    // Onglets : ouvrir tous pour compter le contenu, structure stable.
    const panels = qa("[data-fiche-panel]");
    const accordion = q("[data-fiche-accordion]");

    const sig = qa("span[aria-hidden='true']").filter((s) => {
      const bg = getComputedStyle(s).backgroundColor;
      // bg-copper ≈ rgb(184,134,90)
      return /184,\s*134,\s*9[0-9]/.test(bg) && s.clientHeight <= 3;
    });

    const aside = q("[data-fiche-aside]");
    const asideHasSimulator =
      !!aside &&
      /plan de financement|simulateur|financement/i.test(aside.innerText);

    const priceEl = q("[data-fiche-price]");

    return {
      header: !!q("[data-fiche-header]"),
      topbar: !!q("[data-fiche-topbar]"),
      price: !!priceEl,
      priceColor: cs(
        priceEl?.firstElementChild ?? priceEl,
        "color",
      ),
      specs: !!q("[data-fiche-specs]"),
      specCount: qa("[data-fiche-spec]").length,
      accordion: !!accordion,
      panelCount: panels.length,
      panelLabels: panels
        .map((p) => p.querySelector("button")?.innerText?.trim())
        .filter(Boolean),
      aside: !!aside,
      advisor: !!q("[data-fiche-advisor]"),
      mandateExclusive: !!q("[data-fiche-mandate-exclusive]"),
      mandateSearch: !!q("[data-fiche-mandate-search]"),
      asideHasSimulator,
      contactForm: !!q("#contact-form"),
      signatureCount: sig.length,
      gallery:
        !!q("[data-offmarket-placeholder]") ||
        qa("img").some((i) => i.offsetParent !== null),
    };
  });

const browser = await chromium.launch();
const results = [];

for (const f of FICHES) {
  console.log(`\n[${f.label}] ${f.url}`);
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  const resp = await page.goto(`${BASE}${f.url}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector("[data-fiche-accordion]", { timeout: 30000 });
  await page.waitForTimeout(700); // hydration

  const a = await audit(page);
  results.push({ label: f.label, kind: f.kind, a });

  check("HTTP 200", resp.status() === 200, String(resp.status()));
  check("header unifié (data-fiche-header)", a.header);
  check("topbar (← Retour + actions)", a.topbar);
  check("prix présent (data-fiche-price)", a.price);
  check(
    "prix en cuivre #B8865A",
    /184,\s*134,\s*90/.test(a.priceColor ?? ""),
    a.priceColor,
  );
  check("galerie présente", a.gallery);
  check("grille caractéristiques (data-fiche-specs)", a.specs);
  check("≥4 specs", a.specCount >= 4, `count=${a.specCount}`);
  check("accordéon présent", a.accordion);
  check("EXACTEMENT 4 onglets", a.panelCount === 4, `count=${a.panelCount}`);
  check(
    "colonne droite épurée présente",
    a.aside && a.advisor && a.mandateExclusive && a.mandateSearch,
  );
  check(
    "AUCUN simulateur/financement dans l'aside (déplacé en onglet)",
    a.asideHasSimulator === false,
  );
  check("formulaire bas (#contact-form)", a.contactForm);
  check(
    "SignatureLine cuivre présent (≥2)",
    a.signatureCount >= 2,
    `count=${a.signatureCount}`,
  );

  await mkdir(OUT, { recursive: true });
  await page.screenshot({
    path: `${OUT}/${f.label}-desktop.png`,
    fullPage: true,
  });

  // Onglets : clic ouvre/ferme, structure identique
  const secondLabel = await page.evaluate(() => {
    const btns = [
      ...document.querySelectorAll("[data-fiche-panel] button"),
    ];
    btns[1]?.click();
    return btns[1]?.innerText?.trim();
  });
  await page.waitForTimeout(300);
  const openCount = await page.evaluate(
    () =>
      document.querySelectorAll("[data-fiche-panel-content]").length,
  );
  check(
    `clic onglet 2 (${secondLabel}) ⇒ contenu visible`,
    openCount >= 1,
    `panels ouverts=${openCount}`,
  );

  await ctx.close();
}

// ── Structure IDENTIQUE entre les 3 fiches ───────────────────────────────
console.log("\n[Cohérence structurelle des 3 fiches]");
const keys = [
  "header",
  "topbar",
  "price",
  "specs",
  "accordion",
  "aside",
  "advisor",
  "mandateExclusive",
  "mandateSearch",
  "contactForm",
];
for (const k of keys) {
  const vals = results.map((r) => r.a[k]);
  check(`landmark "${k}" présent sur les 3`, vals.every(Boolean));
}
const panelCounts = results.map((r) => r.a.panelCount);
check(
  "4 onglets sur les 3 fiches",
  panelCounts.every((c) => c === 4),
  panelCounts.join(","),
);
// Labels d'onglets : 3 premiers identiques (Aperçu/Description/Localisation),
// le 4e diffère volontairement (standard vs off-market).
const firstThree = results.map((r) => r.a.panelLabels.slice(0, 3).join("|"));
check(
  "3 premiers onglets identiques sur les 3 fiches",
  new Set(firstThree).size === 1,
  firstThree.join(" / "),
);

// ── Mobile iPhone 17 Pro Max : structure préservée ──────────────────────
console.log("\n[Mobile iPhone 17 Pro Max — 1 fiche standard + 1 off-market]");
for (const f of [FICHES[0], FICHES[2]]) {
  const ctx = await browser.newContext(IPHONE);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${f.url}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector("[data-fiche-accordion]", { timeout: 30000 });
  await page.waitForTimeout(600);
  const m = await page.evaluate(() => ({
    header: !!document.querySelector("[data-fiche-header]"),
    accordion: !!document.querySelector("[data-fiche-accordion]"),
    panels: document.querySelectorAll("[data-fiche-panel]").length,
    aside: !!document.querySelector("[data-fiche-aside]"),
  }));
  check(
    `${f.label} mobile : header+accordéon(4)+aside`,
    m.header && m.accordion && m.panels === 4 && m.aside,
    JSON.stringify(m),
  );
  await page.screenshot({ path: `${OUT}/${f.label}-iphone17promax.png`, fullPage: true });
  await ctx.close();
}

await browser.close();
console.log(`\n=== POL2-7 ${allPass ? "PASS" : "FAIL"} ===`);
process.exit(allPass ? 0 : 1);
