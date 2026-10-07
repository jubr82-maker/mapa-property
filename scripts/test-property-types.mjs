#!/usr/bin/env node
/**
 * Tests unitaires lib/property-types.ts + lib/taxonomy/property-types.ts
 * (taxonomie hiérarchique unique). Lancement : pnpm test:types
 * (re-spawn via tsx pour le path .ts)
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
const { expandType, PARENT_TO_CHILDREN, CHILD_TO_PARENT } = await import(
  join(root, "lib", "taxonomy", "property-types.ts")
);

let n = 0;
const ok = (m) => {
  n++;
  console.log(`  ✅ ${m}`);
};

// ─── TYPE_GROUPS — 8 familles de la taxonomie ───
assert.deepEqual(
  Object.keys(TYPE_GROUPS).sort(),
  [
    "immeubles_investissement",
    "neuf_projets",
    "parkings_annexes",
    "professionnel_commercial",
    "prestige_atypique",
    "residentiel",
    "ruraux_specifiques",
    "terrains",
  ].sort(),
);
ok("TYPE_GROUPS a exactement les 8 familles de la taxonomie");
assert.ok(TYPE_GROUPS.residentiel.includes("maison-jumelee"));
ok("famille residentiel contient maison-jumelee");
assert.ok(TYPE_GROUPS.terrains.includes("terrain-agricole"));
ok("famille terrains contient terrain-agricole");

// ─── getTypeGroup ───
assert.equal(getTypeGroup("villa"), "residentiel"); ok("villa → residentiel");
assert.equal(getTypeGroup("MAISON"), "residentiel"); ok("MAISON (casse) → residentiel");
assert.equal(getTypeGroup("bureau"), "professionnel_commercial"); ok("bureau → professionnel_commercial");
assert.equal(getTypeGroup("terrain-agricole"), "terrains"); ok("terrain-agricole → terrains");
assert.equal(getTypeGroup("garage"), "parkings_annexes"); ok("garage → parkings_annexes");
assert.equal(getTypeGroup("manoir"), "prestige_atypique"); ok("manoir → prestige_atypique (famille, pas hiérarchie)");
assert.equal(getTypeGroup(""), null); ok("'' → null");
assert.equal(getTypeGroup(null), null); ok("null → null");

// ─── expandType — hiérarchie parent/enfants ───
assert.deepEqual(
  expandType("appartement").sort(),
  ["appartement", "studio", "penthouse", "loft", "duplex", "triplex", "rez-de-jardin"].sort(),
);
ok("expandType(appartement) = lui-même + 6 enfants (rez-de-jardin ajoute, oct. 2026)");
assert.equal(matchesTypeQuery("maison-plain-pied", "maison"), true); ok("maison-plain-pied matche la requete large 'maison'");
assert.equal(matchesTypeQuery("rez-de-jardin", "appartement"), true); ok("rez-de-jardin matche la requete large 'appartement'");
assert.equal(expandType("penthouse").length, 1);
assert.deepEqual(expandType("penthouse"), ["penthouse"]);
ok("expandType(penthouse) = lui-même seul (type précis)");
assert.deepEqual(expandType("parking").sort(), ["parking", "garage", "box"].sort());
ok("expandType(parking) = lui-même + garage + box");
assert.equal(expandType("terrain").length, 9);
ok("expandType(terrain) = lui-même + 8 sous-types terrain-*");
assert.equal(CHILD_TO_PARENT["manoir"], "maison"); ok("CHILD_TO_PARENT[manoir] = maison");
assert.equal(PARENT_TO_CHILDREN["local-professionnel"].length, 9);
ok("PARENT_TO_CHILDREN[local-professionnel] a 9 enfants");

// ─── getEquivalentTypes ───
assert.deepEqual(getEquivalentTypes("maison").sort(), expandType("maison").sort());
ok("getEquivalentTypes délègue à expandType");
assert.deepEqual(getEquivalentTypes(""), []); ok("'' → []");

// ─── norm() (via matchesTypeQuery) — accents, tirets, espaces, underscores, apostrophes ───
assert.equal(matchesTypeQuery("Maison jumelée", "maison-jumelee"), true);
ok("'Maison jumelée' (accent+espace) matche slug 'maison-jumelee'");
assert.equal(matchesTypeQuery("maison_jumelee", "maison-jumelee"), true);
ok("'maison_jumelee' (underscore) matche slug 'maison-jumelee'");
assert.equal(matchesTypeQuery("MAISON-JUMELEE", "maison-jumelee"), true);
ok("casse indifférente");
assert.equal(matchesTypeQuery("Maison d'architecte", "maison-d-architecte"), true);
ok("apostrophe → tiret, 'Maison d'architecte' matche 'maison-d-architecte'");
assert.equal(matchesTypeQuery("Château", "chateau"), true);
ok("'Château' (accent) matche 'chateau'");

// ─── Règle hiérarchique — type LARGE remonte lui-même + enfants (string) ───
assert.equal(matchesTypeQuery("villa", "maison"), true); ok("villa matche requête large 'maison'");
assert.equal(matchesTypeQuery("studio", "appartement"), true); ok("studio matche requête large 'appartement'");
assert.equal(matchesTypeQuery("maison", "appartement"), false); ok("maison NE matche PAS 'appartement'");
assert.equal(matchesTypeQuery("manoir", "maison"), true); ok("manoir (Prestige) matche requête large 'maison' via hiérarchie");
assert.equal(matchesTypeQuery("hotel-particulier", "maison"), true); ok("hotel-particulier matche requête large 'maison'");
assert.equal(matchesTypeQuery("garage", "parking"), true); ok("garage matche requête large 'parking'");
assert.equal(matchesTypeQuery("terrain-agricole", "terrain"), true); ok("terrain-agricole matche requête large 'terrain'");
assert.equal(matchesTypeQuery("bureau", "local-professionnel"), true); ok("bureau matche requête large 'local-professionnel'");
assert.equal(matchesTypeQuery("immeuble-mixte", "immeuble"), true); ok("immeuble-mixte matche requête large 'immeuble'");
// IMMEUBLE ne contient QUE 6 des 10 types de la famille — residence exclu.
assert.equal(matchesTypeQuery("residence", "immeuble"), false);
ok("residence NE matche PAS 'immeuble' (hors hiérarchie, famille seulement)");
// Type sans hiérarchie déclarée (Prestige/Ruraux/Neuf) : autonome.
assert.equal(matchesTypeQuery("bien-atypique", "maison"), false);
ok("bien-atypique (aucune hiérarchie) NE matche PAS 'maison'");

// ─── Règle hiérarchique — type PRÉCIS ne remonte que lui-même (string) ───
assert.equal(matchesTypeQuery("penthouse", "penthouse"), true); ok("penthouse matche penthouse (self)");
assert.equal(matchesTypeQuery("appartement", "penthouse"), false);
ok("appartement NE matche PAS requête précise 'penthouse' (pas de remontée inverse)");
assert.equal(matchesTypeQuery("duplex", "penthouse"), false);
ok("duplex (frère) NE matche PAS requête précise 'penthouse'");

// ─── Cas limites ───
assert.equal(matchesTypeQuery("villa", ""), true); ok("pas de filtre type → true");
assert.equal(matchesTypeQuery(null, "maison"), false); ok("bien sans type → false");
assert.equal(matchesTypeQuery(null, ""), true); ok("pas de filtre + type null → true");
assert.equal(matchesTypeQuery(null, null), true); ok("queryType null → true");

// ─── matchesTypeQuery(string[]) — MÊME règle hiérarchique que la string ───
// (changement de comportement assumé : l'ancien mode array était STRICT
// sans expansion ; désormais chaque terme coché est élargi via expandType,
// pour que cocher la catégorie "Maison" remonte aussi Manoir/Villa/etc.)
assert.equal(matchesTypeQuery("Studio", ["studio"]), true); ok("[Studio] dans ['studio'] → true");
assert.equal(matchesTypeQuery("Studio", ["villa"]), false); ok("[Studio] dans ['villa'] → false");
assert.equal(matchesTypeQuery("penthouse", ["appartement"]), true);
ok("[penthouse] dans ['appartement'] (large) → true (expansion)");
assert.equal(matchesTypeQuery("manoir", ["maison"]), true);
ok("[manoir] dans ['maison'] (large) → true — hiérarchie appliquée aussi en array");
assert.equal(matchesTypeQuery("appartement", ["penthouse"]), false);
ok("[appartement] dans ['penthouse'] (précis) → false (pas d'expansion inverse)");
assert.equal(matchesTypeQuery(null, ["studio"]), false); ok("property_type=null + [studio] → false");
assert.equal(matchesTypeQuery("Studio", []), true); ok("liste vide → true (pas de filtre)");
assert.equal(matchesTypeQuery("Studio", null), true); ok("queryType null → true");
assert.equal(
  matchesTypeQuery("villa", ["maison-jumelee", "penthouse"]),
  false,
);
ok("villa dans une liste de types précis qui ne l'incluent pas → false");
assert.equal(
  matchesTypeQuery("box", ["parking"]),
  true,
);
ok("box matche liste contenant le type large 'parking'");

console.log(`\n${n}/${n} assertions OK — lib/property-types.ts + lib/taxonomy/property-types.ts`);
