// scripts/proof-pol3-7.mjs — POL3-7 : animations UI (fade-in scroll +
// parallax Hero desktop + stagger listes + noise grain global).
//
// Vérifie sur /fr (home) + iPhone 17 Pro Max + Mac 1440 :
//  (a) FadeInOnScroll : les wrappers below-the-fold ont opacity 0 au
//      premier rendu (avant scroll). Après scroll en bas + 1.5s : opacity 1.
//  (b) Parallax Hero : sur Mac, après scroll, la div interne du
//      ParallaxImage du Hero a translateY != 0. Sur iPhone, elle reste = 0
//      (parallax désactivé < 768).
//  (c) NoiseOverlay : présent en light ET dark, opacity 0.025.
//  Screenshots Mac 1440 + iPhone 17 Pro Max (light + dark).
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3001";
const OUT = path.join("docs", "qa", "screenshots-2026-05-19", "pol3-7");
await mkdir(OUT, { recursive: true });

const IPHONE = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

// Inspecte tous les wrappers FadeInOnScroll (signature: classes
// "transition-all duration-700 ease-out"). Retourne pour chacun
// son rect.top et son opacity computée.
const readFades = (page) =>
  page.evaluate(() => {
    const els = [
      ...document.querySelectorAll(".transition-all.duration-700.ease-out"),
    ];
    return els.map((el) => {
      const r = el.getBoundingClientRect();
      const op = parseFloat(getComputedStyle(el).opacity);
      return { top: Math.round(r.top), height: Math.round(r.height), opacity: op };
    });
  });

// translateY actuel de la div interne du ParallaxImage du Hero.
// ParallaxImage outer : la 1ère div de la section Hero portant
// "absolute inset-0 z-0". Inner = sa première div enfant.
const readHeroParallaxY = (page) =>
  page.evaluate(() => {
    const heroSection = document.querySelector("section");
    if (!heroSection) return null;
    const outer = heroSection.querySelector(
      'div.absolute.inset-0.z-0.overflow-hidden, div.overflow-hidden.absolute.inset-0.z-0',
    );
    if (!outer) return null;
    const inner = outer.firstElementChild;
    if (!inner) return null;
    const t = inner.style.transform || "";
    const m = /translateY\(([-\d.]+)px\)/.exec(t);
    return m ? Number(m[1]) : 0;
  });

const readNoise = (page) =>
  page.evaluate(() => {
    const el = document.querySelector(
      'div[aria-hidden="true"].pointer-events-none.fixed.inset-0',
    );
    if (!el) return null;
    const cs = getComputedStyle(el);
    return {
      present: true,
      opacity: parseFloat(cs.opacity),
      mixBlend: cs.mixBlendMode,
      hasSvg: (el.style.backgroundImage || "").includes("svg"),
    };
  });

const browser = await chromium.launch();

// ── MAC 1440 ─────────────────────────────────────────────────────────
const macCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const mac = await macCtx.newPage();
await mac.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await mac.waitForTimeout(800);

// (a) FadeIn t=0 : capturer les wrappers below-fold (top > viewport).
const fadesAt0 = await readFades(mac);
const belowFoldAt0 = fadesAt0.filter((f) => f.top > 900);
await mac.screenshot({
  path: path.join(OUT, "mac1440-t0-top.png"),
  fullPage: false,
});

// Scroller jusqu'en bas par petits paliers de 250 px / 80 ms — laisse
// le temps à l'IntersectionObserver de détecter chaque wrapper (sinon
// il rate les items courts entre deux scrolls de viewport entier).
await mac.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  while (
    window.scrollY + window.innerHeight <
    document.body.scrollHeight - 10
  ) {
    window.scrollBy(0, 250);
    await sleep(80);
  }
});
await mac.waitForTimeout(3000);
const fadesAfterScroll = await readFades(mac);
await mac.screenshot({
  path: path.join(OUT, "mac1440-bottom-revealed.png"),
  fullPage: false,
});

// (b) Parallax Hero : remonter en haut, mesurer Y à scroll=0 puis à
// scroll=400px. Doit varier sur Mac (non-zéro).
await mac.evaluate(() => window.scrollTo(0, 0));
await mac.waitForTimeout(300);
const heroY_top = await readHeroParallaxY(mac);
await mac.evaluate(() => window.scrollTo(0, 400));
await mac.waitForTimeout(250);
const heroY_400 = await readHeroParallaxY(mac);
await mac.screenshot({
  path: path.join(OUT, "mac1440-hero-scroll400.png"),
  fullPage: false,
});

// (c) Noise overlay light.
const noiseLight = await readNoise(mac);

// Dark mode : localStorage + reload.
await mac.evaluate(() => localStorage.setItem("theme", "dark"));
await mac.reload({ waitUntil: "domcontentloaded" });
await mac.waitForTimeout(800);
const noiseDark = await readNoise(mac);
await mac.screenshot({
  path: path.join(OUT, "mac1440-dark-noise.png"),
  fullPage: false,
});

await macCtx.close();

// ── iPhone 17 Pro Max ────────────────────────────────────────────────
const iCtx = await browser.newContext(IPHONE);
const ip = await iCtx.newPage();
await ip.goto(`${BASE}/fr`, { waitUntil: "domcontentloaded", timeout: 60000 });
await ip.waitForTimeout(800);
const fadesIp0 = await readFades(ip);
const belowFoldIp0 = fadesIp0.filter((f) => f.top > 956);
await ip.screenshot({
  path: path.join(OUT, "iphone-t0-top.png"),
  fullPage: false,
});

await ip.evaluate(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  while (
    window.scrollY + window.innerHeight <
    document.body.scrollHeight - 10
  ) {
    window.scrollBy(0, 250);
    await sleep(80);
  }
});
await ip.waitForTimeout(3000);
const fadesIpAfter = await readFades(ip);
await ip.screenshot({
  path: path.join(OUT, "iphone-bottom-revealed.png"),
  fullPage: false,
});

// Parallax doit être INACTIF sur iPhone (innerWidth 440 < 768).
await ip.evaluate(() => window.scrollTo(0, 0));
await ip.waitForTimeout(300);
const heroYi_top = await readHeroParallaxY(ip);
await ip.evaluate(() => window.scrollTo(0, 400));
await ip.waitForTimeout(250);
const heroYi_400 = await readHeroParallaxY(ip);

const noiseIp = await readNoise(ip);

await iCtx.close();
await browser.close();

// ── Assertions ────────────────────────────────────────────────────────
function approxEq(a, b, eps = 0.005) {
  return Math.abs(a - b) < eps;
}

const belowFoldAt0Opaque0 =
  belowFoldAt0.length > 0 && belowFoldAt0.every((f) => f.opacity < 0.05);
const stillHiddenMac = fadesAfterScroll
  .map((f, i) => ({ idx: i, ...f }))
  .filter((f) => f.opacity <= 0.95);
const allRevealedMac = stillHiddenMac.length === 0;
const parallaxMacActive =
  heroY_top !== null && heroY_400 !== null && Math.abs(heroY_400 - heroY_top) > 1;
const noiseLightOk =
  noiseLight && noiseLight.present && approxEq(noiseLight.opacity, 0.025) && noiseLight.hasSvg;
const noiseDarkOk =
  noiseDark && noiseDark.present && approxEq(noiseDark.opacity, 0.025) && noiseDark.hasSvg;

const belowFoldIp0Opaque0 =
  belowFoldIp0.length > 0 && belowFoldIp0.every((f) => f.opacity < 0.05);
const stillHiddenIp = fadesIpAfter
  .map((f, i) => ({ idx: i, ...f }))
  .filter((f) => f.opacity <= 0.95);
const allRevealedIp = stillHiddenIp.length === 0;
const parallaxIpInactive =
  heroYi_top === 0 || heroYi_top === null
    ? true
    : Math.abs(heroYi_400 - heroYi_top) < 1;
const noiseIpOk =
  noiseIp && noiseIp.present && approxEq(noiseIp.opacity, 0.025);

const report = {
  mac: {
    fadeBelowFold_at_t0_opaque0: belowFoldAt0Opaque0,
    fadeCount_belowFold_at_t0: belowFoldAt0.length,
    allRevealedAfterScroll: allRevealedMac,
    revealedCount: fadesAfterScroll.length,
    stillHidden_mac: stillHiddenMac,
    hero_parallax_y_at_top: heroY_top,
    hero_parallax_y_at_400: heroY_400,
    parallaxActive: parallaxMacActive,
    noise_light: noiseLight,
    noise_light_ok: noiseLightOk,
    noise_dark: noiseDark,
    noise_dark_ok: noiseDarkOk,
  },
  iphone: {
    fadeBelowFold_at_t0_opaque0: belowFoldIp0Opaque0,
    fadeCount_belowFold_at_t0: belowFoldIp0.length,
    allRevealedAfterScroll: allRevealedIp,
    stillHidden_iphone: stillHiddenIp,
    hero_parallax_y_at_top: heroYi_top,
    hero_parallax_y_at_400: heroYi_400,
    parallaxInactive: parallaxIpInactive,
    noise: noiseIp,
    noise_ok: noiseIpOk,
  },
};

console.log(JSON.stringify(report, null, 2));

const ok =
  belowFoldAt0Opaque0 &&
  allRevealedMac &&
  parallaxMacActive &&
  noiseLightOk &&
  noiseDarkOk &&
  belowFoldIp0Opaque0 &&
  allRevealedIp &&
  parallaxIpInactive &&
  noiseIpOk;

console.log(ok ? "POL3-7 PROOF: OK" : "POL3-7 PROOF: KO");
process.exit(ok ? 0 : 1);
