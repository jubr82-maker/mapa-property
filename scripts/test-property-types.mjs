#!/usr/bin/env node
/**
 * Tests unitaires lib/property-types.ts (BUG D — équivalences types).
 * Lancement : pnpm test:types  (re-spawn via tsx pour le path .ts)
 */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Re-spawn via tsx si exécuté en .mjs pur (import .ts)
if (!process.env.__TSX__) {
  const r = spawnSync(
    "npx",
    ["tsx", join(__dirname, "test-property-types.mjs")],
    { stdio: "inherit", cwd: root, env: { ...process.env, __TSX__: "1" } },
  );
  process.exit(r.status ?? 1);
}

const { TYPE_GROUPS, getTypeGroup, getEquivalentTypes, matchesTypeQuery } =
  await import(join(root, "lib", "property-types.ts"));

let n = 0;
const ok = (m) => { n++; console.log(`  ✅ ${m}`); };

// getTypeGroup
assert.equal(getTypeGroup("villa"), "house"); ok("villa → house");
assert.equal(getTypeGroup("MAISON"), "house"); ok("MAISON (casse) → house");
assert.equal(getTypeGroup("duplex"), "apartment"); ok("duplex → apartment");
assert.equal(getTypeGroup("penthouse"), "apartment"); ok("penthouse → apartment");
// Sprint C13 — terrain integre au groupe land.
assert.equal(getTypeGroup("terrain"), "land"); ok("terrain → land (groupe étendu C13)");
assert.equal(getTypeGroup("bureau"), "commercial"); ok("bureau → commercial");
assert.equal(getTypeGroup("immeuble"), "building"); ok("immeuble → building");
assert.equal(getTypeGroup(""), null); ok("'' → null");
assert.equal(getTypeGroup(null), null); ok("null → null");

// getEquivalentTypes
assert.deepEqual(
  [...getEquivalentTypes("appartement")].sort(),
  ["appartement", "duplex", "penthouse", "studio", "triplex"].sort(),
);
ok("appartement → tous les types appart");
// Sprint C13 — terrain etendu au groupe land.
assert.deepEqual(
  [...getEquivalentTypes("terrain")].sort(),
  ["terrain", "terrain constructible"].sort(),
);
ok("terrain → [terrain, terrain constructible] (groupe land)");
assert.deepEqual(
  [...getEquivalentTypes("maison")].sort(),
  ["maison", "maison jumelee", "villa"].sort(),
);
ok("maison étendu → [maison, maison jumelee, villa]");
assert.deepEqual(getEquivalentTypes(""), []); ok("'' → []");

// matchesTypeQuery
assert.equal(matchesTypeQuery("villa", "maison"), true); ok("bien villa matche requête maison");
assert.equal(matchesTypeQuery("studio", "appartement"), true); ok("studio matche appartement");
assert.equal(matchesTypeQuery("maison", "appartement"), false); ok("maison NE matche PAS appartement");
assert.equal(matchesTypeQuery("villa", ""), true); ok("pas de filtre type → true");
assert.equal(matchesTypeQuery(null, "maison"), false); ok("bien sans type → false");
assert.equal(matchesTypeQuery("terrain", "terrain"), true); ok("terrain == terrain (self)");

// Sprint C13 — cas Apimo réels DB (Capitalized + accents + composés).
assert.equal(matchesTypeQuery("Villa", "maison"), true); ok("Villa (Capitalized) → maison");
assert.equal(matchesTypeQuery("Maison jumelée", "villa"), true); ok("Maison jumelée (accent) → villa via house");
assert.equal(matchesTypeQuery("Penthouse", "appartement"), true); ok("Penthouse → appartement");
assert.equal(matchesTypeQuery("Duplex", "studio"), true); ok("Duplex → studio via apartment");
assert.equal(matchesTypeQuery("Triplex", "appartement"), true); ok("Triplex → appartement");
assert.equal(matchesTypeQuery("Terrain constructible", "terrain"), true); ok("Terrain constructible → terrain via land");
assert.equal(matchesTypeQuery("Local commercial", "bureau"), true); ok("Local commercial → bureau via commercial");
assert.equal(matchesTypeQuery("Local et fonds de commerce", "bureau"), true); ok("Local et fonds de commerce → bureau");
assert.equal(matchesTypeQuery("Ensemble immobilier", "immeuble"), true); ok("Ensemble immobilier → immeuble via building");
assert.equal(matchesTypeQuery("Bureau", "maison"), false); ok("Bureau NE matche PAS maison");
assert.equal(matchesTypeQuery("Appartement", "terrain"), false); ok("Appartement NE matche PAS terrain");
assert.equal(matchesTypeQuery("immeuble", "ensemble immobilier"), true); ok("immeuble lowercase → ensemble immobilier (bidirectionnel)");

console.log(`\n${n}/${n} assertions OK — lib/property-types.ts`);
