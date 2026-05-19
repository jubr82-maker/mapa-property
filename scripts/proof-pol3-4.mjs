// scripts/proof-pol3-4.mjs — POL3-4 : onglets header 20px → 17px.
//
// Mac 1440 : font-size calculée des liens de nav (A) ET du bouton
// DropdownItem = 17px ; nav desktop visible ; burger absent.
// iPhone 17 Pro Max : bouton burger ~40×40 présent ; nav desktop cachée.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-19", "pol3-4");
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

// ── Desktop Mac 1440 ───────────────────────────────────────────────────
const d = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const pd = await d.newPage();
await pd.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await pd.waitForTimeout(2500);

const desktop = await pd.evaluate(() => {
  const header = document.querySelector("header");
  // Onglets de nav TOP-NIVEAU = enfants DIRECTS des conteneurs lg:flex :
  // soit un <a> direct, soit le > button d'un .group (DropdownItem). On
  // EXCLUT les liens de sous-menu (ul a) qui ont volontairement une autre
  // taille (hors périmètre POL3-4).
  const containers = [...header.querySelectorAll("nav.lg\\:flex, div.lg\\:flex")];
  const tabs = [];
  for (const c of containers) {
    for (const ch of c.children) {
      if (ch.tagName === "A" && ch.offsetParent !== null) tabs.push(ch);
      else if (ch.classList.contains("group")) {
        const btn = ch.querySelector(":scope > button");
        if (btn && btn.offsetParent !== null) tabs.push(btn);
      }
    }
  }
  const sizes = tabs.map((el) => ({
    tag: el.tagName,
    text: (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 24),
    fontSize: getComputedStyle(el).fontSize,
  }));
  // Burger = bouton dont l'aria-label correspond à l'ouverture du menu
  // (HeaderBurger). Exclut le ThemeToggle ("Mode nuit").
  const burger = [...header.querySelectorAll("button[aria-label]")].find(
    (b) =>
      /menu|menü/i.test(b.getAttribute("aria-label") || "") &&
      b.offsetParent !== null,
  );
  return { sizes, burgerVisible: !!burger };
});
await pd.screenshot({ path: path.join(OUT, "header-mac1440.png") });
await pd.close();
await d.close();

// ── iPhone 17 Pro Max ──────────────────────────────────────────────────
const m = await browser.newContext(IPHONE);
const pm = await m.newPage();
await pm.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await pm.waitForTimeout(2500);
const mobile = await pm.evaluate(() => {
  const header = document.querySelector("header");
  const burger = [...header.querySelectorAll("button[aria-label]")].find(
    (b) =>
      /menu|menü/i.test(b.getAttribute("aria-label") || "") &&
      b.offsetParent !== null,
  );
  const r = burger ? burger.getBoundingClientRect() : null;
  // Liens de nav desktop : doivent être cachés (offsetParent null).
  const navLinks = [...header.querySelectorAll("nav a")];
  const anyNavVisible = navLinks.some((a) => a.offsetParent !== null);
  return {
    burgerW: r ? Math.round(r.width) : 0,
    burgerH: r ? Math.round(r.height) : 0,
    desktopNavVisible: anyNavVisible,
  };
});
await pm.screenshot({ path: path.join(OUT, "header-iphone.png"), fullPage: false });
await pm.close();
await m.close();
await browser.close();

console.log(JSON.stringify({ desktop, mobile }, null, 2));

// ── Assertions ─────────────────────────────────────────────────────────
// Tous les éléments de nav top-niveau visibles desktop = 17px.
const navTabs = desktop.sizes.filter((s) => s.fontSize === "17px");
const allSeventeen =
  desktop.sizes.length > 0 &&
  desktop.sizes.every((s) => s.fontSize === "17px");
const noTwenty = !desktop.sizes.some((s) => s.fontSize === "20px");
const desktopBurgerHidden = desktop.burgerVisible === false;
const burgerOk =
  mobile.burgerW >= 36 &&
  mobile.burgerW <= 44 &&
  mobile.burgerH >= 36 &&
  mobile.burgerH <= 44;
const mobileNavHidden = mobile.desktopNavVisible === false;

const ok =
  allSeventeen && noTwenty && desktopBurgerHidden && burgerOk && mobileNavHidden;
console.log(
  "POL3-4: tabs17=%d allSeventeen=%s noTwenty=%s desktopBurgerHidden=%s burger=%dx%d burgerOk=%s mobileNavHidden=%s",
  navTabs.length,
  allSeventeen,
  noTwenty,
  desktopBurgerHidden,
  mobile.burgerW,
  mobile.burgerH,
  burgerOk,
  mobileNavHidden,
);
console.log(ok ? "POL3-4 PROOF: OK" : "POL3-4 PROOF: KO");
process.exit(ok ? 0 : 1);
