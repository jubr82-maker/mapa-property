#!/usr/bin/env node
/**
 * Tests E2E moteur EVS Luxembourg — script standalone.
 *
 * Lancement :
 *   node scripts/test-engine.mjs
 *
 * Re-spawn automatique via `tsx` pour résoudre le path alias `@/`.
 * 6 cas : 3 réels + 1 commune inconnue + 1 tolérance casse + 1 re-pondération.
 */

import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

// On a besoin de `tsx` pour résoudre `@/lib/...` selon les paths du tsconfig.
// Si on est déjà loaded par tsx → process.env.TSX_RUNNING est set.
if (!process.env.TSX_RUNNING) {
  const tsxBin = join(projectRoot, "node_modules", ".bin", "tsx");
  const res = spawnSync(tsxBin, [import.meta.filename], {
    stdio: "inherit",
    cwd: projectRoot,
    env: { ...process.env, TSX_RUNNING: "1" },
  });
  process.exit(res.status ?? 0);
}

const { estimate } = await import("@/lib/estimation/engine");

let passed = 0;
let failed = 0;
const fails = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`      ${e.message}`);
    fails.push({ name, error: e.message });
    failed++;
  }
}

function fmt(n) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function printCase(label, result) {
  const c = result.client_output;
  const i = result.internal_output;
  console.log(
    `      → ${fmt(c.price_low)} – ${fmt(c.price_mid)} – ${fmt(c.price_high)} | ${c.confidence} (std ${i.std_deviation_pct}%, score ${i.confidence_score})`,
  );
  const applicable = Object.entries(i.methods)
    .filter(([, m]) => m.applicable)
    .map(([k, m]) => `${k}=${fmt(m.price ?? 0)}`)
    .join(", ");
  console.log(`        méthodes : ${applicable}`);
}

console.log("\n=== Tests moteur EVS Luxembourg ===\n");

console.log("Cas 1 — Appartement Belair (VDL) 95m² CPE C bon état étage 3");
test("Belair fourchette 1.0-1.7M€", () => {
  const r = estimate({
    type: "appartement",
    commune: "Luxembourg",
    quartier: "Belair",
    surfaceLiving: 95,
    bedrooms: 2,
    yearBuilt: 2005,
    state: "good",
    energy: "C",
    floor: 3,
    totalFloors: 5,
    lift: true,
  });
  printCase("Belair", r);
  assert.ok(
    r.client_output.price_mid >= 1_000_000 && r.client_output.price_mid <= 1_700_000,
    `price_mid ${r.client_output.price_mid} hors fourchette [1M, 1.7M]`,
  );
  assert.ok(
    ["HIGH", "MEDIUM"].includes(r.client_output.confidence),
    `confidence=${r.client_output.confidence} attendu HIGH ou MEDIUM`,
  );
});

console.log("\nCas 2 — Maison Strassen 200m² terrain 600m² CPE B renove");
test("Strassen fourchette 1.3-2.7M€ + DRC applicable", () => {
  const r = estimate({
    type: "maison",
    commune: "Strassen",
    surfaceLiving: 200,
    surfaceLand: 600,
    bedrooms: 4,
    yearBuilt: 2010,
    state: "renovated",
    energy: "B",
  });
  printCase("Strassen", r);
  assert.ok(
    r.client_output.price_mid >= 1_300_000 && r.client_output.price_mid <= 2_700_000,
    `price_mid ${r.client_output.price_mid} hors fourchette [1.3M, 2.7M]`,
  );
  assert.equal(
    r.internal_output.methods.depreciated_replacement.applicable,
    true,
    "DRC doit être applicable pour maison avec terrain",
  );
});

console.log("\nCas 3 — Penthouse Gare 120m² neuf CPE A++ exposition sud vue exceptionnelle");
test("Penthouse Gare fourchette 1.8-3.5M€", () => {
  const r = estimate({
    type: "penthouse",
    commune: "Luxembourg",
    quartier: "Gare",
    surfaceLiving: 120,
    bedrooms: 3,
    yearBuilt: 2025,
    state: "new",
    energy: "A++",
    floor: 7,
    totalFloors: 7,
    lift: true,
    terrace: 30,
    exposureSouth: true,
    view: "exceptional",
  });
  printCase("Penthouse Gare", r);
  assert.ok(
    r.client_output.price_mid >= 1_800_000 && r.client_output.price_mid <= 3_500_000,
    `price_mid ${r.client_output.price_mid} hors fourchette [1.8M, 3.5M]`,
  );
});

console.log("\nCas 4 — Commune inconnue → confidence LOW + warnings");
test("Commune inconnue retourne hedonic NON applicable", () => {
  const r = estimate({
    type: "appartement",
    commune: "Atlantis-Ville",
    surfaceLiving: 100,
    state: "good",
  });
  printCase("Inconnue", r);
  assert.equal(r.internal_output.methods.hedonic.applicable, false);
  assert.equal(r.internal_output.methods.statec_reference.applicable, false);
  assert.ok(
    r.internal_output.warnings.some((w) => w.toLowerCase().includes("commune")),
    "warning commune introuvable attendu",
  );
});

console.log("\nCas 5 — Tolérance casse + tirets (Esch-sur-Alzette)");
test("Esch-sur-Alzette variantes casse/tiret", () => {
  const r1 = estimate({
    type: "appartement",
    commune: "Esch-sur-Alzette",
    surfaceLiving: 85,
    state: "good",
    energy: "C",
  });
  const r2 = estimate({
    type: "appartement",
    commune: "esch sur alzette",
    surfaceLiving: 85,
    state: "good",
    energy: "C",
  });
  printCase("Esch v1", r1);
  printCase("Esch v2", r2);
  assert.equal(
    r1.internal_output.methods.hedonic.applicable,
    true,
    "Esch-sur-Alzette doit matcher",
  );
  assert.equal(
    r2.internal_output.methods.hedonic.applicable,
    true,
    "esch sur alzette doit matcher",
  );
  assert.equal(
    r1.client_output.price_mid,
    r2.client_output.price_mid,
    "Les deux variantes doivent donner exactement le même prix",
  );
});

console.log("\nCas 6 — Re-pondération custom 100% hédoniste");
test("Custom weights {hedonic:1, autres:0} = hedonic price exact", () => {
  const r = estimate(
    {
      type: "appartement",
      commune: "Luxembourg",
      quartier: "Belair",
      surfaceLiving: 95,
      state: "good",
      energy: "C",
    },
    {
      weights: {
        sales_comparison: 0,
        hedonic: 1,
        income_capitalization: 0,
        depreciated_replacement: 0,
        statec_reference: 0,
      },
    },
  );
  printCase("Custom 100% hédoniste", r);
  const hedonicPrice = r.internal_output.methods.hedonic.price;
  assert.equal(
    r.internal_output.weighted_price,
    hedonicPrice,
    "weighted_price doit égaler exactement hedonic.price",
  );
});

console.log(`\n=== Résultat : ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) {
  console.log("Détails échecs :");
  fails.forEach((f) => console.log(`  - ${f.name} : ${f.error}`));
  process.exit(1);
}
