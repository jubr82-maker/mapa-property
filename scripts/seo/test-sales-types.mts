// Ventes realisees, tous types de biens (oct. 2026), sans reseau.
// Lancement : node --import tsx scripts/seo/test-sales-types.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { LISTING_TYPES, familyOf } from "../../lib/listing/families";
import { LEGACY_SALE_TYPES, isSaleType, saleFieldRules } from "../../lib/admin/sale-fields";
import { comparableGroup, isComparableSale, isResidentialGroup } from "../../lib/estimation/comparable-type";
import { parseSaleInput } from "../../lib/admin/sales-auth";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const msgs = (l: string) => JSON.parse(read(`messages/${l}.json`));
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

const NON_RESIDENTIAL = ["local-commercial", "bureau", "fonds-de-commerce", "commerce", "entrepot", "parking", "garage", "immeuble-de-rapport", "terrain"];
const RESIDENTIAL = LISTING_TYPES.filter((t) => ["appartement", "maison", "villa", "prestige"].includes(t.family)).map((t) => t.slug);
const ESTIMATION_TYPES = ["appartement", "maison", "penthouse", "duplex", "villa"]; // lib/estimation/engine.ts, PropertyType

test("liste fermee des fiches : types demandes presents, rien d'autre en texte libre", () => {
  for (const s of NON_RESIDENTIAL) assert.ok(LISTING_TYPES.some((t) => t.slug === s), s);
  for (const s of LISTING_TYPES.map((t) => t.slug)) assert.ok(isSaleType(s), s);
  assert.ok(isSaleType("maison") && isSaleType("immeuble"), "anciennes valeurs gardees a l'edition");
  for (const bad of ["Maison", "loft", "hangar", "", "<b>x</b>", "appartement "]) assert.equal(isSaleType(bad), false, bad);
});

test("memes libelles que les fiches, en FR, EN et DE", () => {
  for (const l of ["fr", "en", "de"]) {
    const m = msgs(l);
    for (const t of LISTING_TYPES) {
      assert.ok(m.admin_properties[`ptype_${t.slug}`], `${l} ptype_${t.slug}`);
      assert.ok(m.listing_model.vocab.types[t.slug], `${l} vocab ${t.slug}`);
      assert.ok(m.search.type_subtype[t.slug], `${l} type_subtype ${t.slug}`);
      assert.ok(m.searches_page.type[t.slug], `${l} searches_page ${t.slug}`);
    }
    for (const t of LEGACY_SALE_TYPES) assert.ok(m.admin_sales.propertyType[t], `${l} ancien type ${t}`);
    assert.ok(m.admin_sales.form.usableSurface, `${l} usableSurface`);
  }
  const form = read("app/admin/ventes-realisees/SaleForm.tsx");
  assert.ok(form.includes("LISTING_TYPES.filter((x) => x.family === f)") && form.includes("tp(`ptype_${x.slug}`)") && !form.includes("PROPERTY_TYPES"));
  assert.ok(read("app/admin/ventes-realisees/page.tsx").includes("tp(`ptype_${v}`)"));
});

test("champs selon le type : sans objet masques, surface facultative hors logement", () => {
  assert.equal(saleFieldRules("appartement").surface_habitable, "required");
  assert.equal(saleFieldRules("appartement").surface_terrain, "hidden");
  assert.equal(saleFieldRules("maison-individuelle").surface_terrain, "optional");
  for (const s of ["bureau", "local-commercial", "fonds-de-commerce", "commerce", "entrepot", "immeuble-de-rapport"]) {
    assert.equal(saleFieldRules(s).surface_habitable, "optional", s);
    assert.equal(saleFieldRules(s).chambres, "hidden", s);
  }
  assert.deepEqual(saleFieldRules("terrain"), { surface_habitable: "hidden", surface_terrain: "required", chambres: "hidden", classe_energie: "hidden", annee_construction: "hidden", etat: "hidden" });
  for (const s of ["parking", "garage"]) assert.equal(saleFieldRules(s).chambres, "hidden", s);
});

test("validation serveur : memes regles que le formulaire", () => {
  const base = { adresse: "1 rue X", commune: "Steinfort", date_acte: "2026-09-01", agent: "julien", prix_vente: 350000 };
  // Fonds de commerce sans surface ni chambres : accepte, champs sans objet vides.
  const fdc = parseSaleInput({ ...base, property_type: "fonds-de-commerce", chambres: 3, surface_habitable: null });
  assert.equal(fdc.error, undefined);
  assert.equal(fdc.insert!.chambres, null);
  assert.equal(fdc.insert!.surface_habitable, null);
  // Terrain : surface du terrain obligatoire, surface habitable ignoree.
  assert.equal(parseSaleInput({ ...base, property_type: "terrain" }).error, "missing_or_invalid_fields");
  const t = parseSaleInput({ ...base, property_type: "terrain", surface_terrain: 812, surface_habitable: 120, classe_energie: "A" });
  assert.equal(t.insert!.surface_terrain, 812);
  assert.equal(t.insert!.surface_habitable, null);
  assert.equal(t.insert!.classe_energie, null);
  // Logement : surface habitable obligatoire.
  assert.equal(parseSaleInput({ ...base, property_type: "appartement" }).error, "missing_or_invalid_fields");
  assert.equal(parseSaleInput({ ...base, property_type: "appartement", surface_habitable: 85, chambres: 2 }).insert!.chambres, 2);
  // Texte libre refuse.
  assert.equal(parseSaleInput({ ...base, property_type: "hangar agricole", surface_habitable: 300 }).error, "missing_or_invalid_fields");
});

test("comparables : jamais une vente non residentielle pour un logement, et inversement", () => {
  for (const e of ESTIMATION_TYPES) {
    assert.ok(isResidentialGroup(comparableGroup(e)), e);
    for (const s of [...NON_RESIDENTIAL, "immeuble"]) assert.equal(isComparableSale(e, s), false, `${e} / ${s}`);
  }
  for (const s of NON_RESIDENTIAL) {
    assert.equal(isResidentialGroup(comparableGroup(s)), false, s);
    for (const r of RESIDENTIAL) assert.equal(isComparableSale(s, r), false, `${s} / ${r}`);
  }
  // Logements du meme groupe : comparables (types des fiches et anciennes valeurs).
  for (const s of ["appartement", "studio", "duplex", "triplex", "rez-de-jardin", "penthouse", "loft"]) assert.ok(isComparableSale("appartement", s), s);
  for (const s of ["maison", "maison-individuelle", "maison-jumelee", "maison-mitoyenne", "maison-plain-pied", "maison-de-maitre", "villa"]) assert.ok(isComparableSale("maison", s), s);
  assert.equal(isComparableSale("appartement", "maison"), false);
  assert.equal(isComparableSale("maison", "chateau"), false);
  assert.equal(isComparableSale("maison", null), false);
  assert.equal(familyOf("entrepot"), "commercial");
});

test("moteur : la regle est appliquee avant tout calcul de prix au m2", () => {
  const route = read("app/api/estimate/route.ts");
  const i = route.indexOf("if (!isComparableSale(estimType, r.property_type)) continue;");
  assert.ok(i > 0 && i < route.indexOf("const ppsqm = Number(r.prix_vente) / Number(r.surface_habitable);"));
  assert.ok(!route.includes("APARTMENT_FAMILY") && !route.includes("sameFamily("));
  // Seule lecture des ventes pour le calcul : fetchComparablesForCommune.
  assert.equal((route.match(/from\("mapa_historical_sales"\)/g) ?? []).length, 1);
});

test("fin d'annonce allemande, location exclusive", () => {
  const de = msgs("de").listing_model;
  assert.equal(de.vocab.diffusion.rent, "zur Exklusivvermietung");
  assert.ok(de.tronc.includes("Anzeige {{diffusion}} von MAPA Property veröffentlicht."));
});

console.log(`${pass} PASS, 0 FAIL`);
