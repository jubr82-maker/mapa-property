// Tests des modeles d'annonces (oct. 2026) : familles et types, mandat,
// passeport energetique. Lancement : node --import tsx scripts/test-listing.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ENERGY_CLASSES,
  EXCLUSIVE_BADGE,
  FIELD_FAMILIES,
  LISTING_FAMILIES,
  LISTING_TYPES,
  MANDATE_TYPES,
  effectiveBadge,
  familyOf,
  fieldVisible,
  isEnergyClass,
  isListingType,
  isMandateType,
  templateBlockOf,
} from "../lib/listing/families";
import { PROPERTY_TYPE_FAMILIES } from "../lib/taxonomy/property-types";

const root = join(import.meta.dirname, "..");
let n = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    n++;
    console.log(`  PASS ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${e instanceof Error ? e.message : String(e)}`);
  }
}
const messages = Object.fromEntries(
  ["fr", "en", "de"].map((l) => [l, JSON.parse(readFileSync(join(root, "messages", `${l}.json`), "utf8"))]),
) as Record<string, Record<string, Record<string, unknown>>>;

console.log("Partie 1 : type de bien, mandat, passeport energetique");

test("familles demandees, dans l'ordre", () => {
  assert.deepEqual([...LISTING_FAMILIES], ["appartement", "maison", "villa", "prestige", "terrain", "commercial", "parking"]);
});
test("types par famille conformes a la demande", () => {
  const by = (f: string) => LISTING_TYPES.filter((t) => t.family === f).map((t) => t.slug);
  assert.deepEqual(by("appartement"), ["appartement", "studio", "duplex", "triplex", "rez-de-jardin", "penthouse"]);
  assert.deepEqual(by("maison"), ["maison-individuelle", "maison-jumelee", "maison-mitoyenne", "maison-plain-pied", "maison-de-maitre"]);
  assert.deepEqual(by("villa"), ["villa"]);
  assert.deepEqual(by("prestige"), ["chateau", "propriete-domaine", "propriete-de-prestige"]);
  assert.deepEqual(by("terrain"), ["terrain"]);
  assert.deepEqual(by("commercial"), ["local-commercial", "bureau", "immeuble-de-rapport", "fonds-de-commerce"]);
  assert.deepEqual(by("parking"), ["parking", "garage"]);
});
test("chaque type existe dans la taxonomie du site", () => {
  const known = new Set(PROPERTY_TYPE_FAMILIES.flatMap((f) => f.types.map((t) => t.slug)));
  for (const t of LISTING_TYPES) assert.ok(known.has(t.slug), t.slug);
});
test("libelles famille, type et mandat presents dans les 3 langues", () => {
  for (const l of ["fr", "en", "de"]) {
    const a = messages[l].admin_properties as Record<string, string>;
    for (const f of LISTING_FAMILIES) assert.ok(a[`family_${f}`], `${l} family_${f}`);
    for (const t of LISTING_TYPES) assert.ok(a[`ptype_${t.slug}`], `${l} ptype_${t.slug}`);
    for (const m of MANDATE_TYPES) assert.ok(a[`mandate_${m}`], `${l} mandate_${m}`);
    for (const k of ["f_energy", "f_thermal", "err_listing_type_invalid", "err_mandate_invalid", "err_energy_invalid"]) assert.ok(a[k], `${l} ${k}`);
    const sub = (messages[l].search as Record<string, Record<string, string>>).type_subtype;
    for (const t of LISTING_TYPES) assert.ok(sub[t.slug], `${l} search.type_subtype.${t.slug}`);
  }
});
test("libelles du passeport (francais)", () => {
  const a = messages.fr.admin_properties as Record<string, string>;
  assert.equal(a.f_energy, "Classe d'efficacité énergétique");
  assert.equal(a.f_thermal, "Classe d'isolation thermique");
});
test("familyOf, templateBlockOf, isListingType", () => {
  assert.equal(familyOf("penthouse"), "appartement");
  assert.equal(templateBlockOf("penthouse"), "penthouse");
  assert.equal(templateBlockOf("duplex"), "appartement");
  assert.equal(familyOf("chateau"), "prestige");
  assert.equal(familyOf("loft"), null);
  assert.ok(isListingType("garage"));
  assert.ok(!isListingType("loft"));
  assert.ok(!isListingType(""));
});
test("mandats : quatre valeurs fermees", () => {
  assert.deepEqual([...MANDATE_TYPES], ["exclusive", "semi_exclusive", "simple", "autonomous"]);
  assert.ok(isMandateType("semi_exclusive"));
  assert.ok(!isMandateType("exclusif"));
  assert.ok(!isMandateType(null));
});
test("classes energetiques A+ a I", () => {
  assert.deepEqual([...ENERGY_CLASSES], ["A+", "A", "B", "C", "D", "E", "F", "G", "H", "I"]);
  assert.ok(isEnergyClass("A+"));
  assert.ok(!isEnergyClass("a"));
  assert.ok(!isEnergyClass("J"));
});
test("champs visibles par famille", () => {
  assert.ok(fieldVisible("bedrooms", "appartement"));
  assert.ok(!fieldVisible("bedrooms", "terrain"));
  assert.ok(!fieldVisible("bedrooms", "parking"));
  assert.ok(fieldVisible("land_surface", "terrain"));
  assert.ok(!fieldVisible("land_surface", "appartement"));
  assert.ok(fieldVisible("floor", "appartement"));
  assert.ok(!fieldVisible("floor", "maison"));
  assert.ok(fieldVisible("has_pool", "villa"));
  assert.ok(!fieldVisible("has_pool", "appartement"));
  assert.ok(!fieldVisible("energy", "terrain"));
  assert.ok(fieldVisible("bureaux", "commercial"));
  // Sans type : tout s'affiche ; champ non liste : toujours affiche.
  for (const f of Object.keys(FIELD_FAMILIES)) assert.ok(fieldVisible(f, null), f);
  assert.ok(fieldVisible("surface", "terrain"));
});
test("badge public : le mandat exclusif impose Exclusivite", () => {
  assert.equal(effectiveBadge(null, "exclusive"), EXCLUSIVE_BADGE);
  assert.equal(effectiveBadge("Nouveau prix", "exclusive"), EXCLUSIVE_BADGE);
  assert.equal(effectiveBadge("Nouveau prix", "simple"), "Nouveau prix");
  assert.equal(effectiveBadge(null, undefined), null);
  assert.equal(EXCLUSIVE_BADGE, "Exclusivité");
});
test("fiche admin : type en premier, boutons de mandat, listes du passeport", () => {
  const src = readFileSync(join(root, "components/admin/PropertyEditForm.tsx"), "utf8");
  const typeAt = src.indexOf('title={t("sec_type")}');
  assert.ok(typeAt > 0 && typeAt < src.indexOf('title={t("sec_descriptions")}'), "section type avant descriptions");
  assert.ok(src.includes('role="radiogroup"') && src.includes('role="radio"'), "boutons a selection unique");
  assert.ok(src.includes("<EnergySelect value={form.energy}") && src.includes("<EnergySelect value={form.thermal}"), "listes energie");
  assert.ok(src.includes("FamilyContext.Provider value={typeFamily}"), "visibilite par famille");
});
test("action serveur : type, mandat et classes valides cote serveur", () => {
  const src = readFileSync(join(root, "app/admin/properties/actions.ts"), "utf8");
  assert.ok(src.includes("isListingType(data.property_type)"));
  assert.ok(src.includes("isMandateType(data.mandate_type)"));
  assert.ok(src.includes("isEnergyClass(v)"));
});
test("SQL 16 : colonne et contrainte, SQL 15 marque abandonne", () => {
  const s16 = readFileSync(join(root, "supabase/manual/execution/16_type_mandat_passeport.sql"), "utf8");
  assert.ok(s16.includes("ADD COLUMN IF NOT EXISTS mandate_type text"));
  assert.ok(s16.includes("'exclusive', 'semi_exclusive', 'simple', 'autonomous'"));
  assert.ok(!/[–—]/.test(s16), "aucun tiret long ou moyen");
  const s15 = readFileSync(join(root, "supabase/manual/execution/15_titres_mentions_vente.sql"), "utf8");
  assert.ok(s15.startsWith("-- =====================================================================\n-- ABANDONNE LE 2026-10-07 : NE PAS EXECUTER."));
});

console.log(`\n${n} PASS, ${failed} FAIL`);
if (failed) process.exit(1);
