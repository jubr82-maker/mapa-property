#!/usr/bin/env node
/**
 * Tests unitaires lib/property-types.ts (équivalences types).
 * Lancement : pnpm test:types (re-spawn via tsx pour le path .ts)
 */
import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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
const ok = (m) => {
  n++;
  console.log(`  ✅ ${m}`);
};

// ─── getTypeGroup — 8 groupes après C13-ter ───
assert.equal(getTypeGroup("villa"), "house"); ok("villa → house");
assert.equal(getTypeGroup("MAISON"), "house"); ok("MAISON (casse) → house");
assert.equal(getTypeGroup("duplex"), "apartment"); ok("duplex → apartment");
assert.equal(getTypeGroup("penthouse"), "apartment"); ok("penthouse → apartment");
assert.equal(getTypeGroup("terrain"), "land"); ok("terrain → land");
// Sprint C13-ter — bureau migré de commercial vers office.
assert.equal(getTypeGroup("bureau"), "office"); ok("bureau → office (déplacé C13-ter)");
assert.equal(getTypeGroup("immeuble"), "building"); ok("immeuble → building");
// Sprint C13-ter — nouveaux groupes parking, office, industrial.
assert.equal(getTypeGroup("garage"), "parking"); ok("garage → parking");
assert.equal(getTypeGroup("parking"), "parking"); ok("parking → parking (self)");
assert.equal(getTypeGroup("cabinet"), "office"); ok("cabinet → office");
assert.equal(getTypeGroup("atelier"), "industrial"); ok("atelier → industrial");
assert.equal(getTypeGroup("entrepot"), "industrial"); ok("entrepot → industrial");
// Hôtel particulier dans 2 groupes (house + building), retourne le premier (house).
assert.equal(getTypeGroup("hotel particulier"), "house"); ok("hotel particulier → house (premier groupe trouvé)");
// Box dans 2 groupes (parking + industrial) — premier = parking.
assert.equal(getTypeGroup("box"), "parking"); ok("box → parking (premier groupe trouvé)");
assert.equal(getTypeGroup(""), null); ok("'' → null");
assert.equal(getTypeGroup(null), null); ok("null → null");

// ─── getEquivalentTypes ───
assert.equal(getEquivalentTypes("appartement").length, 9);
ok("appartement → 9 types apartment (8 brief + triplex legacy)");
assert.equal(getEquivalentTypes("terrain").length, 7);
ok("terrain → 7 types land");
assert.equal(getEquivalentTypes("maison").length, 27);
ok("maison → 27 types house (Maisonette retirée)");
assert.equal(getEquivalentTypes("parking").length, 3);
ok("parking → 3 types (garage, box, parking)");
assert.equal(getEquivalentTypes("bureau").length, 3);
ok("bureau → 3 types office (bureau, cabinet, local)");
assert.equal(getEquivalentTypes("atelier").length, 6);
ok("atelier → 6 types industrial");
assert.deepEqual(getEquivalentTypes(""), []); ok("'' → []");

// ─── matchesTypeQuery (string) — comportement legacy C13 expand ───
assert.equal(matchesTypeQuery("villa", "maison"), true); ok("villa matche requête maison");
assert.equal(matchesTypeQuery("studio", "appartement"), true); ok("studio matche appartement");
assert.equal(matchesTypeQuery("maison", "appartement"), false); ok("maison NE matche PAS appartement");
assert.equal(matchesTypeQuery("villa", ""), true); ok("pas de filtre type → true");
assert.equal(matchesTypeQuery(null, "maison"), false); ok("bien sans type → false");
assert.equal(matchesTypeQuery("terrain", "terrain"), true); ok("terrain == terrain (self)");

// Cas Apimo réels (Capitalized + accents + composés).
assert.equal(matchesTypeQuery("Villa", "maison"), true); ok("Villa (Capitalized) → maison");
assert.equal(matchesTypeQuery("Maison jumelée", "villa"), true); ok("Maison jumelée → villa via house");
assert.equal(matchesTypeQuery("Penthouse", "appartement"), true); ok("Penthouse → appartement");
assert.equal(matchesTypeQuery("Duplex", "studio"), true); ok("Duplex → studio via apartment");
assert.equal(matchesTypeQuery("Terrain constructible", "terrain"), true); ok("Terrain constructible → terrain via land");
assert.equal(matchesTypeQuery("Ensemble immobilier", "immeuble"), true); ok("Ensemble immobilier → immeuble via building");
assert.equal(matchesTypeQuery("Bureau", "maison"), false); ok("Bureau NE matche PAS maison");

// Sprint C13-ter — bureau migré commercial → office.
assert.equal(matchesTypeQuery("Local commercial", "commerce"), true); ok("Local commercial → commerce (groupe commercial)");
assert.equal(matchesTypeQuery("Local commercial", "bureau"), false); ok("Local commercial NE matche PAS bureau (groupe office)");
assert.equal(matchesTypeQuery("Bureau", "bureau"), true); ok("Bureau matche bureau (self, group office)");
assert.equal(matchesTypeQuery("Cabinet", "bureau"), true); ok("Cabinet → bureau via office");

// Sprint C13-ter — 68 sous-types Apimo : couverture étendue.
assert.equal(matchesTypeQuery("Studio", "appartement"), true); ok("Studio → appartement");
assert.equal(matchesTypeQuery("Loft", "appartement"), true); ok("Loft → appartement");
assert.equal(matchesTypeQuery("Appart'hôtel", "appartement"), true); ok("Appart'hôtel (apostrophe typo) → appartement");
assert.equal(matchesTypeQuery("Chambre", "appartement"), true); ok("Chambre → appartement");
assert.equal(matchesTypeQuery("Manoir", "maison"), true); ok("Manoir → maison");
assert.equal(matchesTypeQuery("Chalet", "maison"), true); ok("Chalet → maison");
assert.equal(matchesTypeQuery("Château", "maison"), true); ok("Château (accent) → maison");
assert.equal(matchesTypeQuery("Bungalow", "maison"), true); ok("Bungalow → maison");
assert.equal(matchesTypeQuery("Moulin", "maison"), true); ok("Moulin → maison");
assert.equal(matchesTypeQuery("Maison d'hôtes", "villa"), true); ok("Maison d'hôtes (accent + apostrophe) → villa via house");
assert.equal(matchesTypeQuery("Pavillon", "maison"), true); ok("Pavillon → maison");
assert.equal(matchesTypeQuery("Mobile home", "maison"), true); ok("Mobile home → maison");
assert.equal(matchesTypeQuery("Lac", "terrain"), true); ok("Lac → terrain via land");
assert.equal(matchesTypeQuery("Terrain agricole", "terrain"), true); ok("Terrain agricole → terrain via land");
assert.equal(matchesTypeQuery("Boutique", "commerce"), true); ok("Boutique → commerce");
assert.equal(matchesTypeQuery("Hôtel", "commerce"), true); ok("Hôtel → commerce");
assert.equal(matchesTypeQuery("Exploitation agricole", "commerce"), true); ok("Exploitation agricole → commerce");
assert.equal(matchesTypeQuery("Garage", "parking"), true); ok("Garage → parking");
assert.equal(matchesTypeQuery("Cave", "atelier"), true); ok("Cave → atelier (groupe industrial)");
assert.equal(matchesTypeQuery("Entrepôt", "atelier"), true); ok("Entrepôt → atelier (groupe industrial)");
assert.equal(matchesTypeQuery("Lotissement", "immeuble"), true); ok("Lotissement → immeuble via building");

// Maisonette explicitement retirée du catalogue.
assert.equal(matchesTypeQuery("Maisonette", "maison"), false); ok("Maisonette (retirée) NE matche PAS maison");

// Hôtel particulier dans 2 groupes (house ET building).
assert.equal(matchesTypeQuery("Hôtel particulier", "maison"), true); ok("Hôtel particulier → maison (groupe house)");
assert.equal(matchesTypeQuery("Hôtel particulier", "immeuble"), true); ok("Hôtel particulier → immeuble (groupe building)");

// Box dans 2 groupes (parking ET industrial).
assert.equal(matchesTypeQuery("Box", "parking"), true); ok("Box → parking");
assert.equal(matchesTypeQuery("Box", "atelier"), true); ok("Box → atelier (groupe industrial)");

// Anti-régression contrat strict property_type (C13-bis C1).
assert.equal(matchesTypeQuery(null, "bureau"), false); ok("property_type=null → false (jamais de fallback titre)");
assert.equal(matchesTypeQuery("", "bureau"), false); ok("property_type='' → false");
assert.equal(matchesTypeQuery("Appartement", "bureau"), false); ok("Appartement NE matche PAS bureau");
assert.equal(matchesTypeQuery(null, ""), true); ok("pas de filtre type → true même si property_type null");
assert.equal(matchesTypeQuery(null, null), true); ok("pas de filtre type (null) → true");

// ─── Sprint C13-ter — matchesTypeQuery(string[]) STRICT OR ───
// L'UI multi-select émet la liste exhaustive des sous-types cochés.
// Match exact normalisé (aucun expand groupe au runtime).
assert.equal(matchesTypeQuery("Studio", ["studio"]), true); ok("[Studio] dans ['studio'] → true (strict OR)");
assert.equal(matchesTypeQuery("Studio", ["villa", "studio"]), true); ok("[Studio] dans ['villa','studio'] → true");
assert.equal(matchesTypeQuery("Studio", ["villa"]), false); ok("[Studio] dans ['villa'] → false");
assert.equal(matchesTypeQuery("Penthouse", ["studio"]), false); ok("[Penthouse] dans ['studio'] → false (STRICT, pas d'expand)");
assert.equal(matchesTypeQuery("Villa", ["villa", "maison"]), true); ok("[Villa] dans ['villa','maison'] → true (strict OR explicite)");
assert.equal(matchesTypeQuery("Penthouse", ["studio", "duplex", "penthouse"]), true); ok("[Penthouse] dans liste apart → true");
assert.equal(matchesTypeQuery("Manoir", ["villa", "maison"]), false); ok("[Manoir] dans ['villa','maison'] → false (strict, manoir pas explicite)");
assert.equal(matchesTypeQuery(null, ["studio"]), false); ok("property_type=null + [studio] → false");
assert.equal(matchesTypeQuery("Studio", []), true); ok("liste vide → true (pas de filtre)");
assert.equal(matchesTypeQuery("Studio", null), true); ok("queryType null → true");
// Cas Apimo réel : utilisateur coche catégorie Maison → UI envoie tous
// les sous-types maison. Un bien Apimo "Villa" doit matcher.
assert.equal(
  matchesTypeQuery(
    "Villa",
    ["villa", "maison", "maison de ville", "chalet", "manoir"],
  ),
  true,
);
ok("Villa dans liste catégorie Maison cochée → true (multi-select)");

console.log(`\n${n}/${n} assertions OK — lib/property-types.ts`);
