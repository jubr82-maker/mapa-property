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
assert.equal(getTypeGroup("terrain"), null); ok("terrain → null (hors groupe)");
assert.equal(getTypeGroup(""), null); ok("'' → null");
assert.equal(getTypeGroup(null), null); ok("null → null");

// getEquivalentTypes
assert.deepEqual([...getEquivalentTypes("maison")].sort(), ["maison", "villa"].sort());
ok("maison → [maison, villa]");
assert.deepEqual(
  [...getEquivalentTypes("appartement")].sort(),
  ["appartement", "duplex", "penthouse", "studio", "triplex"].sort(),
);
ok("appartement → tous les types appart");
assert.deepEqual(getEquivalentTypes("terrain"), ["terrain"]);
ok("terrain → [terrain] (pas d'élargissement)");
assert.deepEqual(getEquivalentTypes(""), []); ok("'' → []");

// matchesTypeQuery
assert.equal(matchesTypeQuery("villa", "maison"), true); ok("bien villa matche requête maison");
assert.equal(matchesTypeQuery("studio", "appartement"), true); ok("studio matche appartement");
assert.equal(matchesTypeQuery("maison", "appartement"), false); ok("maison NE matche PAS appartement");
assert.equal(matchesTypeQuery("villa", ""), true); ok("pas de filtre type → true");
assert.equal(matchesTypeQuery(null, "maison"), false); ok("bien sans type → false");
assert.equal(matchesTypeQuery("terrain", "terrain"), true); ok("terrain == terrain (self)");

console.log(`\n${n}/${n} assertions OK — lib/property-types.ts`);
