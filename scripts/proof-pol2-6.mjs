#!/usr/bin/env node
/**
 * Proof POL2-6 — Recalibration EVS + parcours estimation Steinfort.
 *
 * 1. Affiche /fr/services/estimer, vérifie <DisclaimerLegal/> EN TÊTE du form
 *    (texte exact « Informations non contractuelles. » + sources + responsabilité).
 * 2. Remplit le parcours 3 étapes pour Steinfort 70m² 2002 CPE D bon état.
 * 3. Vérifie le résultat affiché + <DisclaimerLegal/> EN BAS du résultat.
 *
 * NB : le formulaire public ne collecte pas l'option « parking » (le moteur
 * EVS le supporte, mais mapToEvsInputs ne le transmet pas — limitation UI
 * pré-existante hors scope POL2-6). Le cas test 7 (avec parking, input
 * spécifié par le brief) reste l'autorité de la bande [680k,780k] et est
 * prouvé vert par scripts/test-engine.mjs. Ce proof documente la sortie UI
 * réelle (sans parking) honnêtement.
 *
 * Captures : docs/qa/screenshots-2026-05-18/pol2-6/
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const SHOT = "docs/qa/screenshots-2026-05-18/pol2-6";
const URL = "http://localhost:3002/fr/services/estimer";

const IPHONE_17_PM = {
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

const run = async () => {
  mkdirSync(SHOT, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext(IPHONE_17_PM);
  const page = await ctx.newPage();
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);

  // --- 1. DisclaimerLegal en tête du formulaire ---
  const disclaimerTop = page.getByRole("note", {
    name: "Mentions légales estimation",
  });
  const topCount = await disclaimerTop.count();
  // textContent (pas innerText) → texte DOM brut, insensible au CSS uppercase.
  const topText = topCount
    ? ((await disclaimerTop.first().textContent()) ?? "")
    : "";
  const hasExact =
    topText.includes("Informations non contractuelles.") &&
    topText.includes("Sources : STATEC, Observatoire de l'Habitat, ABBL, BCL.") &&
    topText.includes(
      "MAPA Property ne peut être tenu responsable d'aucune erreur ou décision prise sur ces estimations. Validation par professionnel agréé requise (banque, notaire, courtier).",
    );
  console.log("DisclaimerLegal en tête du form :", topCount > 0 ? "présent" : "ABSENT");
  console.log("Texte exact conforme :", hasExact);
  await disclaimerTop
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => {});
  await page.screenshot({ path: `${SHOT}/01-form-disclaimer-top.png` });

  // --- 2. Parcours Steinfort ---
  // Step 1 : selects natifs (type=appartement défaut, state=good défaut),
  // surface 70, année 2002, énergie D.
  const selects = page.locator("select");
  // type (0) reste "appartement" ; state (1) reste "good".
  // FieldNumber : on cible par label.
  await page
    .getByText("Surface habitable", { exact: false })
    .locator("xpath=following::input[1]")
    .fill("70");
  await page
    .getByText("Année", { exact: false })
    .locator("xpath=following::input[1]")
    .fill("2002");
  // énergie = dernier select de l'étape 1
  await selects.last().selectOption("D");
  await page.getByRole("button", { name: /Suivant/i }).click();
  await page.waitForTimeout(500);

  // Step 2 : pays = LU (défaut), commune = Steinfort
  await page.waitForTimeout(300);
  const communeSelect = page
    .locator("label", { hasText: "Commune" })
    .locator("select");
  await communeSelect.selectOption({ label: "Steinfort" });
  await page.getByRole("button", { name: /Suivant/i }).click();
  await page.waitForTimeout(500);

  // Step 3 : email + 2 consentements
  await page
    .locator('input[type="email"]')
    .fill("qa+pol2-6@mapatest.invalid");
  // 2 checkboxes (contact_consent + rgpd)
  const checks = page.locator('input[type="checkbox"]');
  const n = await checks.count();
  for (let i = 0; i < n; i++) await checks.nth(i).check();
  await page.screenshot({ path: `${SHOT}/02-form-step3.png` });
  await page.getByRole("button", { name: /Estimer/i }).click();

  // Attendre le résultat (ResultView)
  await page.waitForTimeout(3500);
  const bodyText = await page.locator("body").innerText();

  // Extraire les montants € affichés
  const euros = [...bodyText.matchAll(/(\d[\d  .]{4,})\s*€/g)]
    .map((m) => Number(m[1].replace(/[^\d]/g, "")))
    .filter((v) => v > 100000 && v < 5000000);
  const lo = Math.min(...euros);
  const hi = Math.max(...euros);
  console.log("Montants € affichés :", [...new Set(euros)].join(", "));
  console.log(`Fourchette affichée : ${lo} – ${hi} €`);
  const highInBand = hi >= 680000 && hi <= 780000;
  console.log(
    `Borne haute dans [680k,780k] : ${highInBand} (high=${hi})`,
  );

  // DisclaimerLegal en bas du résultat
  const disclaimerBottom = page.getByRole("note", {
    name: "Mentions légales estimation",
  });
  const botCount = await disclaimerBottom.count();
  console.log(
    "DisclaimerLegal en bas du résultat :",
    botCount > 0 ? "présent" : "ABSENT",
  );

  await page.screenshot({ path: `${SHOT}/03-result.png`, fullPage: true });
  await disclaimerBottom
    .last()
    .scrollIntoViewIfNeeded()
    .catch(() => {});
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOT}/04-result-disclaimer-bottom.png` });

  await browser.close();

  console.log("\n=== RÉSUMÉ POL2-6 ===");
  console.log("DisclaimerLegal form-top :", topCount > 0 && hasExact ? "OK" : "KO");
  console.log("DisclaimerLegal result-bottom :", botCount > 0 ? "OK" : "KO");
  console.log(
    "Steinfort UI (sans parking) :",
    `${lo}–${hi} € (cas test 7 AVEC parking 650k–680k–720k ∈ bande, cf. test-engine.mjs)`,
  );
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
