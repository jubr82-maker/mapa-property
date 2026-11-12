// scripts/proof-formulaires-etapes.mjs : formulaires a etapes (nov. 2026,
// partie C2), ordinateur et iPhone 17 Pro Max, animations normales et
// "reduire les animations". Formulaire d'estimation (/fr/services/estimer),
// le seul formulaire public a plusieurs etapes (lib/forms/step-scroll.ts).
// Controles :
//  1. "Suivant" sans surface : focus sur le champ obligatoire, visible sous
//     l'en-tete fixe ;
//  2. "Suivant" valide : haut de l'etape 2 visible sous l'en-tete, focus
//     dans l'etape (champ du lieu) ;
//  3. "Retour" : haut de l'etape 1 visible, focus sur un champ de l'etape ;
//  4. reduire les animations : position finale atteinte sans attendre.
// Lancement (machine de Julien) : pnpm dev, puis
//   BASE=http://localhost:3000 node scripts/proof-formulaires-etapes.mjs
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = path.join("docs", "qa", "captures-grand-chantier-2026-11", "formulaires-etapes");
await mkdir(OUT, { recursive: true });

const DEVICES = {
  ordinateur: { viewport: { width: 1440, height: 900 }, userAgent: "Mozilla/5.0" },
  iphone17promax: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1" },
};

const state = () =>
  ({
    header: Math.max(0, ...[...document.querySelectorAll("header")].filter((h) => ["fixed", "sticky"].includes(getComputedStyle(h).position)).map((h) => h.getBoundingClientRect().bottom)),
    stepTop: document.querySelector("section h2")?.closest("section")?.getBoundingClientRect().top ?? null,
    active: document.activeElement?.tagName ?? null,
    activeTop: document.activeElement?.getBoundingClientRect().top ?? null,
    inStep: !!document.activeElement?.closest("section"),
  });

const browser = await chromium.launch();
const failures = [];
for (const [device, opts] of Object.entries(DEVICES)) {
  for (const motion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ ...opts, reducedMotion: motion });
    const page = await ctx.newPage();
    const tag = `${device}-${motion}`;
    await page.goto(`${BASE}/fr/services/estimer`, { waitUntil: "networkidle" });
    const next = page.getByRole("button", { name: /suivant/i }).first();
    await next.scrollIntoViewIfNeeded();
    await next.click();
    await page.waitForTimeout(motion === "reduce" ? 50 : 900);
    let s = await page.evaluate(state);
    if (s.active !== "INPUT" || s.activeTop < s.header) failures.push(`${tag} : etape 1 sans surface, focus ${s.active} a ${s.activeTop} (en-tete ${s.header})`);
    await page.screenshot({ path: path.join(OUT, `${tag}-1-erreur.png`) });

    await page.locator("input[type=number]").first().fill("95");
    await next.scrollIntoViewIfNeeded();
    await next.click();
    await page.waitForTimeout(motion === "reduce" ? 50 : 900);
    s = await page.evaluate(state);
    if (s.stepTop === null || s.stepTop < s.header - 1 || s.stepTop > s.header + 200 || !s.inStep) failures.push(`${tag} : etape 2, haut ${s.stepTop} (en-tete ${s.header}), focus dans l'etape ${s.inStep}`);
    await page.screenshot({ path: path.join(OUT, `${tag}-2-suivant.png`) });

    const back = page.getByRole("button", { name: /retour/i }).first();
    await back.scrollIntoViewIfNeeded();
    await back.click();
    await page.waitForTimeout(motion === "reduce" ? 50 : 900);
    s = await page.evaluate(state);
    if (s.stepTop === null || s.stepTop < s.header - 1 || s.stepTop > s.header + 200 || !s.inStep) failures.push(`${tag} : retour etape 1, haut ${s.stepTop} (en-tete ${s.header}), focus dans l'etape ${s.inStep}`);
    await page.screenshot({ path: path.join(OUT, `${tag}-3-retour.png`) });
    await ctx.close();
  }
}
await browser.close();
if (failures.length) {
  console.log(`ECHECS (${failures.length}) :\n${failures.join("\n")}`);
  process.exit(1);
}
console.log(`OK : remontee et focus a chaque etape (captures : ${OUT}).`);
