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
  assert.deepEqual(by("commercial"), ["local-commercial", "bureau", "immeuble-de-rapport", "fonds-de-commerce", "commerce", "entrepot"]);
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

// ---------------------------------------------------------------------------
console.log("\nPartie 2 : modeles d'annonces par type de bien");
const { generateListing } = await import("../lib/listing/generate");
const { renderTemplate, textToHtml, htmlToText } = await import("../lib/listing/template-engine");
const { emptyListingData, sanitizeListingData } = await import("../lib/listing/listing-data");
const { frQualifier, frFeminine, deAdjective } = await import("../lib/listing/language");
type Lang = "fr" | "en" | "de";
const model = (l: Lang) => messages[l].listing_model as unknown as { title: string; tronc: string; blocks: Record<string, string>; vocab: never };
const baseCols = {
  property_type: "duplex", transaction: "sale", mandate_type: "exclusive", city: "Steinfort", year_built: 2004, surface: 115,
  living_surface: 115, usable_surface: null, land_surface: null, terrace_surface: null, balcony_surface: null, garden_surface: null,
  bedrooms: 2, parking: null, has_pool: false, floor: null, price: 720000, price_on_demand: false, current_use: null,
} as const;
type Cols = { -readonly [K in keyof typeof baseCols]: (typeof baseCols)[K] | number | string | boolean | null };
const gen = (l: Lang, cols: Partial<Cols>, d = emptyListingData()) =>
  generateListing({ ...baseCols, ...cols } as never, d, l, model(l), model(l).vocab);
const room = (fr: string, en: string, de: string) => ({ id: Math.random().toString(36).slice(2, 8), text: { fr, en, de } });

test("moteur : segment vide retire avec sa ponctuation, ligne videe retiree", () => {
  const out = renderTemplate("A[[, construit en {{y}}]].\n[[- Cave : {{c}}]]\n- Fixe", { y: "", c: "" });
  assert.equal(out, "A.\n- Fixe");
  assert.equal(renderTemplate("[[Titre :\n[[- {{a}}]]\n[[- {{b}}]]]]\nFin", { a: "", b: "" }), "Fin");
  assert.equal(renderTemplate("[[Titre :\n[[- {{a}}]]\n[[- {{b}}]]]]", { a: "", b: "x" }), "Titre :\n- X");
  assert.equal(renderTemplate("{{#f}}oui{{/f}}{{^f}}non{{/f}}", {}, { f: false }), "Non");
  assert.equal(renderTemplate("[[[[{{a}} et ]]{{b}}]]", { a: "", b: "fin" }), "Fin");
});
test("moteur : une valeur n'injecte jamais de syntaxe", () => {
  assert.equal(renderTemplate("{{a}}", { a: "{{b}} [[x]]" }, {}), "B x");
});
test("moteur : HTML de l'editeur aller et retour", () => {
  const t = "Ligne un\n- a\n- b\n\nParagraphe <deux> & fin";
  const h = textToHtml(t);
  assert.equal(h, "<p>Ligne un<br>- a<br>- b</p><p>Paragraphe &lt;deux&gt; &amp; fin</p>");
  assert.equal(htmlToText(h), t);
});

// Duplex de Steinfort reconstruit (structure de l'annonce de reference).
const steinfort = emptyListingData();
steinfort.written.fr = { ...steinfort.written.fr, qualifier: "superbe", ambiance: "offre un cadre de vie spacieux et lumineux, entre confort moderne et authenticité", highlights: "Localisation recherchée à Steinfort\nDuplex lumineux aux volumes généreux\nRénovation récente" };
steinfort.levels = [
  { id: "l1", kind: "ground", rooms: [room("Hall d'entrée accueillant", "", ""), room("Séjour cathédrale", "", ""), room("Cuisine équipée", "", ""), room("WC séparé", "", "")] },
  { id: "l2", kind: "floor", rooms: [room("Deux chambres", "", ""), room("Salle de bain", "", "")] },
];
steinfort.facts = { renovation_year: 2020, cellar: true, parking_indoor: 2, monthly_charges: 280 };
test("duplex de Steinfort : structure et formules de la reference", () => {
  const g = gen("fr", {}, steinfort);
  assert.equal(g.title, "Superbe appartement duplex 2 chambres à vendre à Steinfort");
  const want = [
    "MAPA Property a le plaisir de vous présenter, en vente exclusive, ce superbe appartement duplex de 2 chambres situé à Steinfort.",
    "Construit en 2004 et rénové en 2020, cet appartement duplex offre un cadre de vie spacieux et lumineux, entre confort moderne et authenticité.",
    "Avec une surface habitable de 115 m², il se compose comme suit :\nAu rez-de-chaussée :",
    "À l'étage :\n- Deux chambres",
    "Les prestations complémentaires :\n- Cave privative\n- Double emplacement intérieur pour le stationnement\n- Charges de copropriété mensuelles actuelles : 280 €",
    "Les atouts de ce bien :\n- Localisation recherchée à Steinfort",
    "Une exclusivité MAPA Property.",
    "Pour toute demande, contactez-nous depuis le bouton ci-dessous.",
    "Julien Brebion, Real Estate Director & Exclusive Sourcing Specialist\nMAPA Property, une marque de MAPA Synergy Sàrl",
    "Service multilingue : luxembourgeois, français, anglais, allemand et italien.",
    "Annonce diffusée en vente exclusive par MAPA Property.",
    "Toute reproduction ou diffusion, totale ou partielle, sans autorisation est interdite.",
  ];
  for (const w of want) assert.ok(g.text.includes(w), `absent : ${w}`);
  assert.ok(g.text.indexOf("Une exclusivité") > g.text.indexOf("Les atouts"));
});
test("un seul niveau : liste directe apres comme suit", () => {
  const d = structuredClone(steinfort);
  d.levels = [d.levels[0]];
  const g = gen("fr", {}, d);
  assert.ok(g.text.includes("il se compose comme suit :\n- Hall d'entrée accueillant\n- Séjour cathédrale"));
  assert.ok(!g.text.includes("Au rez-de-chaussée :"));
});
test("plusieurs niveaux : une section par niveau (sous-sol, etages, combles)", () => {
  const d = emptyListingData();
  d.written.fr.ambiance = "offre de beaux volumes";
  d.levels = [
    { id: "a", kind: "basement", rooms: [room("Buanderie", "Laundry", "Waschküche")] },
    { id: "b", kind: "ground", rooms: [room("Séjour", "Living room", "Wohnzimmer")] },
    { id: "c", kind: "floor", rooms: [room("Deux chambres", "Two bedrooms", "Zwei Schlafzimmer")] },
    { id: "d", kind: "floor", rooms: [room("Bureau", "Study", "Arbeitszimmer")] },
    { id: "e", kind: "attic", rooms: [room("Grenier aménagé", "Converted loft", "Ausgebauter Dachboden")] },
    { id: "f", kind: "mezzanine", rooms: [] },
  ];
  const fr = gen("fr", { property_type: "maison-individuelle" }, d).text;
  for (const h of ["Au sous-sol :\n- Buanderie", "Au rez-de-chaussée :\n- Séjour", "Au 1er étage :\n- Deux chambres", "Au 2e étage :\n- Bureau", "Sous les combles :\n- Grenier aménagé"]) assert.ok(fr.includes(h), h);
  assert.ok(!fr.includes("En mezzanine"), "niveau sans piece retire");
  const en = gen("en", { property_type: "maison-individuelle" }, d).text;
  for (const h of ["In the basement:\n- Laundry", "On the 1st floor:\n- Two bedrooms", "On the 2nd floor:\n- Study", "In the attic:"]) assert.ok(en.includes(h), h);
  const de = gen("de", { property_type: "maison-individuelle" }, d).text;
  for (const h of ["Im Untergeschoss:\n- Waschküche", "Im 1. Obergeschoss:", "Im 2. Obergeschoss:", "Im Dachgeschoss:"]) assert.ok(de.includes(h), h);
});
test("donnees partielles : aucun segment orphelin, aucune ponctuation pendante", () => {
  const g = gen("fr", { year_built: null, city: null, bedrooms: null, living_surface: null }, emptyListingData());
  assert.ok(g.text.startsWith("MAPA Property a le plaisir de vous présenter, en vente exclusive, cet appartement duplex.\n"), g.text.split("\n")[0]);
  assert.ok(!/\{\{|\}\}|\[\[|\]\]/.test(g.text), "syntaxe residuelle");
  assert.ok(!/ ,|, \.|\.\.|:\n\n|\n\n\n/.test(g.text), "ponctuation pendante");
  assert.ok(!g.text.includes("Les prestations complémentaires"), "titre de liste vide retire");
  assert.ok(!g.text.includes("se compose"), "pieces absentes : phrase retiree");
  assert.equal(g.title, "Appartement duplex à vendre");
});

// Chaque famille, un et plusieurs niveaux, donnees partielles.
const FAMILY_CASES: [string, Partial<Cols>, Record<string, unknown>, string[]][] = [
  ["penthouse", { property_type: "penthouse", terrace_surface: 60, floor: "6" }, { top_floor: true, private_elevator: true, building_levels: 6 }, ["Au dernier étage", "Terrasse panoramique de 60 m²", "Vue dégagée sur la vallée", "Ascenseur privatif", "Immeuble de 6 niveaux"]],
  ["maison-plain-pied", { property_type: "maison-plain-pied", land_surface: 720, garden_surface: 450 }, { construction: "massive", orientation: "sw", garage_spaces: 1 }, ["Construction massive", "Terrain de 7,2 ares", "Jardin de 450 m², orienté sud-ouest", "Garage pour une voiture"]],
  ["villa", { property_type: "villa", land_surface: 1200, garden_surface: 900, has_pool: true }, { landscaped_garden: true, home_automation: true }, ["cette superbe villa", "Construite en 2004", "Jardin paysager", "Piscine", "Domotique", "Terrain de 12 ares"]],
  ["chateau", { property_type: "chateau", land_surface: 45000 }, { outbuildings: 3, heritage: "national" }, ["ce superbe château", "Terrain de 4,5 hectares", "3 dépendances", "Bien protégé au titre du patrimoine culturel national", "Le château, édifié au XVIIIe siècle"]],
  ["terrain", { property_type: "terrain", land_surface: 850, year_built: null, bedrooms: 2, living_surface: 115 }, { zone_pag: "HAB-1", servicing: "full" }, ["ce superbe terrain", "Le terrain :", "Surface : 8,5 ares (850 m²)", "Zone du plan d'aménagement général (PAG) : HAB-1", "Terrain viabilisé"]],
  ["local-commercial", { property_type: "local-commercial", usable_surface: 140, floor: "0" }, { shopfront: true, shopfront_length: 8, current_rent: 4200, yield_percent: 5.2 }, ["Surface commerciale : 140 m²", "Vitrine de 8 m", "Au rez-de-chaussée", "Loyers en cours : 4 200 € par mois", "Rendement : 5,2 %"]],
  ["garage", { property_type: "garage", year_built: null, bedrooms: null }, { garage_spaces: 2 }, ["ce superbe garage", "Garage pour 2 voitures"]],
];
for (const [label, cols, facts, wants] of FAMILY_CASES) {
  test(`famille ${label} : bloc propre, donnees du bloc presentes`, () => {
    const d = emptyListingData();
    d.written.fr = { ...d.written.fr, qualifier: "superbe", ambiance: "offre un cadre rare", view: "Vue dégagée sur la vallée", history: "Le château, édifié au XVIIIe siècle, a gardé ses communs." };
    d.facts = facts as never;
    const g = gen("fr", cols, d);
    for (const w of wants) assert.ok(g.text.includes(w), `${label} : absent "${w}"\n${g.text}`);
    assert.ok(!/\{\{|\[\[/.test(g.text + g.title));
    if (label === "terrain") {
      assert.ok(!g.text.includes("chambre") && !g.title.includes("chambre"), "terrain : chambres ignorees");
      assert.ok(!g.text.includes("surface habitable"), "terrain : surface habitable ignoree");
    }
  });
}

test("accords francais : ce, cet, cette, bel, situe, construite", () => {
  const d = emptyListingData();
  d.written.fr.qualifier = "élégant";
  d.written.fr.ambiance = "offre de beaux volumes";
  const villa = gen("fr", { property_type: "villa", transaction: "sale", mandate_type: "simple" }, d).text;
  assert.ok(villa.includes("cette élégante villa de 2 chambres située à Steinfort"), villa.split("\n")[0]);
  assert.ok(villa.includes("Construite en 2004, cette villa offre"));
  const appart = gen("fr", { property_type: "appartement" }, d).text;
  assert.ok(appart.includes("cet élégant appartement de 2 chambres situé à Steinfort"));
  d.written.fr.qualifier = "beau";
  assert.ok(gen("fr", { property_type: "appartement" }, d).text.includes("ce bel appartement"));
  assert.ok(gen("fr", { property_type: "maison-jumelee" }, d).text.includes("cette belle maison jumelée"));
  assert.ok(gen("fr", { property_type: "chateau" }, d).text.includes("ce beau château"));
  assert.ok(gen("fr", { property_type: "propriete-de-prestige" }, d).text.includes("elle se compose") === false);
  assert.equal(frFeminine("lumineux"), "lumineuse");
  assert.equal(frFeminine("spacieux"), "spacieuse");
  assert.equal(frFeminine("neuf"), "neuve");
  assert.equal(frFeminine("exceptionnel"), "exceptionnelle");
  assert.equal(frQualifier("très beau", "m", "appartement"), "très bel");
});
test("place du qualificatif : usage francais (avant ou apres le nom)", () => {
  const q = (qualifier: string, property_type: string) => {
    const d = emptyListingData();
    d.written.fr = { ...d.written.fr, qualifier, ambiance: "offre de beaux volumes" };
    return gen("fr", { property_type, mandate_type: "simple" }, d);
  };
  // Avant le nom.
  assert.ok(q("superbe", "villa").text.includes("cette superbe villa de 2 chambres"));
  assert.ok(q("beau", "appartement").text.includes("ce bel appartement"));
  assert.ok(q("beau", "chateau").text.includes("ce beau château"));
  assert.ok(q("beau", "villa").text.includes("cette belle villa"));
  assert.ok(q("élégant", "maison-de-maitre").text.includes("cette élégante maison de maître"));
  assert.ok(q("rare", "propriete-domaine").text.includes("ce rare domaine"));
  assert.ok(q("charmant", "maison-mitoyenne").text.includes("cette charmante maison mitoyenne"));
  assert.ok(q("magnifique", "penthouse").text.includes("ce magnifique penthouse"));
  assert.ok(q("joli", "studio").text.includes("ce joli studio"));
  assert.ok(q("grand", "appartement").text.includes("ce grand appartement"));
  assert.ok(q("petit", "maison-individuelle").text.includes("cette petite maison individuelle"));
  assert.ok(q("vaste", "terrain").text.includes("ce vaste terrain"));
  assert.ok(q("très beau", "appartement").text.includes("ce très bel appartement"));
  // Apres le nom, accorde.
  assert.ok(q("lumineux", "appartement").text.includes("cet appartement lumineux de 2 chambres"));
  assert.ok(q("lumineux", "villa").text.includes("cette villa lumineuse de 2 chambres"));
  assert.ok(q("spacieux", "maison-jumelee").text.includes("cette maison jumelée spacieuse"));
  assert.ok(q("rénové", "duplex").text.includes("cet appartement duplex rénové"));
  assert.ok(q("contemporain", "villa").text.includes("cette villa contemporaine"));
  assert.ok(q("moderne", "bureau").text.includes("ce bureau moderne"));
  assert.ok(q("entièrement rénové", "maison-individuelle").text.includes("cette maison individuelle entièrement rénovée"));
  // Titres.
  assert.equal(q("lumineux", "appartement").title, "Appartement lumineux 2 chambres à vendre à Steinfort");
  assert.equal(q("contemporain", "villa").title, "Villa contemporaine 2 chambres à vendre à Steinfort");
  assert.equal(q("superbe", "duplex").title, "Superbe appartement duplex 2 chambres à vendre à Steinfort");
});
test("place du qualificatif : anglais et allemand toujours avant le nom", () => {
  const d = emptyListingData();
  d.written.en = { ...d.written.en, qualifier: "bright", ambiance: "offers good volumes" };
  d.written.de = { ...d.written.de, qualifier: "hell", ambiance: "bietet viel Platz" };
  assert.ok(gen("en", { property_type: "appartement" }, d).text.includes("this bright apartment with 2 bedrooms"));
  assert.equal(gen("en", { property_type: "appartement" }, d).title, "Bright 2-bedroom apartment for sale in Steinfort");
  d.written.en.qualifier = "renovated";
  assert.ok(gen("en", { property_type: "villa" }, d).text.includes("this renovated villa"));
  assert.ok(gen("de", { property_type: "appartement" }, d).text.includes("diese helle Wohnung mit 2 Schlafzimmern"));
  assert.ok(gen("de", { property_type: "maison-plain-pied" }, d).text.includes("diesen hellen Bungalow"));
  d.written.de.qualifier = "modern";
  assert.ok(gen("de", { property_type: "maison-individuelle" }, d).text.includes("dieses moderne freistehende Haus"));
  assert.equal(gen("de", { property_type: "maison-individuelle" }, d).title, "Modernes freistehendes Haus mit 2 Schlafzimmern zu verkaufen in Steinfort");
});
test("formule de situation : choix, saisie libre, 3 langues, elision", () => {
  const with_ = (formula: string, custom: Record<string, string> = {}, city = "Steinfort") => {
    const d = emptyListingData();
    d.facts = { location_formula: formula as never };
    for (const l of ["fr", "en", "de"] as const) d.written[l].location_custom = custom[l] ?? "";
    return { fr: gen("fr", { city }, d).text.split("\n")[0], en: gen("en", { city }, d).text.split("\n")[0], de: gen("de", { city }, d).text.split("\n")[0] };
  };
  const v = with_("village");
  assert.ok(v.fr.endsWith("de 2 chambres situé dans le charmant village de Steinfort."), v.fr);
  assert.ok(v.en.endsWith("with 2 bedrooms located in the charming village of Steinfort."), v.en);
  assert.ok(v.de.includes("mit 2 Schlafzimmern im charmanten Dorf Steinfort vorzustellen."), v.de);
  assert.ok(with_("a").fr.endsWith("situé à Steinfort."));
  assert.ok(with_("coeur", {}, "Esch-sur-Alzette").fr.endsWith("situé au cœur d'Esch-sur-Alzette."), "elision");
  assert.ok(with_("quartier", {}, "Belair").fr.endsWith("situé dans le quartier de Belair."));
  assert.ok(with_("quartier", {}, "Belair").en.endsWith("located in the Belair district."));
  assert.ok(with_("centre", {}, "Luxembourg").de.includes("mitten im Zentrum von Luxembourg vorzustellen."));
  const c = with_("custom", { fr: "à deux pas du centre de", en: "a short walk from the centre of", de: "wenige Schritte vom Zentrum von" });
  assert.ok(c.fr.endsWith("situé à deux pas du centre de Steinfort."), c.fr);
  assert.ok(c.en.endsWith("located a short walk from the centre of Steinfort."));
  assert.ok(c.de.includes("wenige Schritte vom Zentrum von Steinfort vorzustellen."));
  assert.ok(with_("custom").fr.endsWith("situé à Steinfort."), "saisie libre vide : à");
  assert.ok(!with_("village", {}, "").fr.includes("village"), "sans commune : formule retiree");
  for (const l of ["fr", "en", "de"] as const) {
    const voc = model(l).vocab as unknown as { location: Record<string, string> };
    for (const k of ["a", "village", "coeur", "quartier", "centre"]) assert.ok(voc.location[k]?.includes("{commune}"), `${l} ${k}`);
    const a = messages[l].admin_listing as Record<string, string>;
    for (const k of ["a", "village", "coeur", "quartier", "centre", "custom"]) assert.ok(a[`location_${k}`], `${l} location_${k}`);
  }
});
test("accords francais en nombre : 1 chambre, 2 chambres, emplacements", () => {
  const d = emptyListingData();
  d.facts = { parking_indoor: 1, parking_outdoor: 3 };
  const g = gen("fr", { bedrooms: 1 }, d);
  assert.ok(g.title.includes("1 chambre à vendre"));
  assert.ok(g.text.includes("de 1 chambre situé"));
  assert.ok(g.text.includes("- Emplacement intérieur pour le stationnement\n- 3 emplacements extérieurs pour le stationnement"));
});
test("accords allemands : diesen, diese, dieses et terminaisons", () => {
  const d = emptyListingData();
  d.written.de.qualifier = "schön";
  d.written.de.ambiance = "bietet viel Licht";
  assert.ok(gen("de", { property_type: "villa" }, d).text.includes("diese schöne Villa mit 2 Schlafzimmern in Steinfort vorzustellen"));
  assert.ok(gen("de", { property_type: "maison-plain-pied" }, d).text.includes("diesen schönen Bungalow"));
  assert.ok(gen("de", { property_type: "maison-individuelle" }, d).text.includes("dieses schöne freistehende Haus"));
  assert.ok(gen("de", { property_type: "maison-plain-pied" }, d).text.includes("Dieser Bungalow wurde 2004 erbaut. Er bietet viel Licht."));
  assert.ok(gen("de", { property_type: "villa" }, d).text.includes("Diese Villa wurde 2004 erbaut. Sie bietet viel Licht."));
  assert.equal(gen("de", { property_type: "maison-individuelle" }, d).title, "Schönes freistehendes Haus mit 2 Schlafzimmern zu verkaufen in Steinfort");
  assert.equal(gen("de", { property_type: "maison-plain-pied", bedrooms: 1 }, d).title, "Schöner Bungalow mit 1 Schlafzimmer zu verkaufen in Steinfort");
  assert.equal(deAdjective("dunkel", "f", "weak_acc"), "dunkle");
  assert.equal(deAdjective("hoch", "m", "strong_nom"), "hoher");
});
test("anglais : this, ordre du titre, montants", () => {
  const d = emptyListingData();
  d.written.en = { ...d.written.en, qualifier: "superb", ambiance: "offers generous volumes" };
  const g = gen("en", { property_type: "villa", transaction: "rent", price: 4500, mandate_type: "simple" }, d);
  assert.equal(g.title, "Superb 2-bedroom villa for rent in Steinfort");
  assert.ok(g.text.includes("MAPA Property is pleased to present, for rent, this superb villa with 2 bedrooms located in Steinfort."));
  assert.ok(g.text.includes("Built in 2004, this villa offers generous volumes."));
  assert.ok(g.text.includes("- Monthly rent: €4,500"));
});
test("formules selon le mandat et la transaction", () => {
  const sale = (m: string) => gen("fr", { mandate_type: m }).text;
  assert.ok(sale("exclusive").includes(", en vente exclusive, "));
  for (const m of ["semi_exclusive", "simple", "autonomous"]) {
    const t = sale(m);
    assert.ok(t.includes(", en vente, "), m);
    assert.ok(!t.includes("Une exclusivité MAPA Property."), `${m} : pas d'exclusivite`);
    assert.ok(!t.includes("Annonce diffusée"), `${m} : pas de mention de diffusion exclusive`);
  }
  const rent = gen("fr", { transaction: "rent", mandate_type: "simple", price: 2400 }).text;
  assert.ok(rent.includes(", en location, "));
  assert.ok(gen("fr", { transaction: "rent", mandate_type: "simple" }).title.includes("à louer"));
  const rentExcl = gen("fr", { transaction: "rent", mandate_type: "exclusive", price: 2400 }).text;
  assert.ok(rentExcl.includes("Une exclusivité MAPA Property.") && rentExcl.includes("Annonce diffusée en location exclusive par MAPA Property."));
  assert.ok(gen("en", { mandate_type: "exclusive" }).text.includes("Listing published as an exclusive sale by MAPA Property."));
  assert.ok(gen("de", { mandate_type: "exclusive" }).text.includes("Anzeige im Exklusivverkauf von MAPA Property veröffentlicht."));
  assert.ok(!gen("de", { mandate_type: "simple" }).text.includes("Exklusiv"));
});
test("location : loyer, charges, garantie, disponibilite", () => {
  const d = emptyListingData();
  d.facts = { rent_charges: 250, deposit_months: 3, available_from: "2026-11-01" };
  const fr = gen("fr", { transaction: "rent", mandate_type: "simple", price: 2400 }, d).text;
  assert.ok(fr.includes("Conditions de location :\n- Loyer mensuel : 2 400 €\n- Charges mensuelles : 250 €\n- Garantie locative : 3 mois de loyer\n- Disponibilité : à partir du 1er novembre 2026"), fr);
  const de = gen("de", { transaction: "rent", mandate_type: "simple", price: 2400 }, d).text;
  assert.ok(de.includes("- Monatliche Miete: 2.400 €") && de.includes("- Verfügbarkeit: ab 1. November 2026"));
  const sale = gen("fr", {}, d).text;
  assert.ok(!sale.includes("Conditions de location"), "vente : pas de conditions de location");
});
test("signature, cloture, service multilingue et copyright identiques pour tous les types", () => {
  const tail = (t: string) => t.slice(t.indexOf("Pour toute demande"));
  const ref = tail(gen("fr", { mandate_type: "simple" }).text);
  for (const pt of LISTING_TYPES.map((x) => x.slug)) assert.equal(tail(gen("fr", { property_type: pt, mandate_type: "simple" }).text), ref, pt);
});
test("assainissement de listing_data : forme fermee, longueurs bornees", () => {
  const d = sanitizeListingData({ written: { fr: { qualifier: "x".repeat(500) } }, levels: [{ kind: "cave", rooms: [{ text: { fr: 3 } }] }], facts: { construction: "beton", yield_percent: 500, available_from: "demain" }, auto: { title_fr: "oui", description_fr: true }, intrus: 1 });
  assert.equal(d.written.fr.qualifier.length, 80);
  assert.equal(d.levels[0].kind, "ground");
  assert.equal(d.levels[0].rooms[0].text.fr, "");
  assert.equal(d.facts.construction, null);
  assert.equal(d.facts.yield_percent, null);
  assert.equal(d.facts.available_from, null);
  assert.deepEqual(d.auto, { description_fr: true });
  assert.ok(!("intrus" in d));
});
test("messages : modeles des 3 langues complets, namespace hors navigateur public", () => {
  for (const l of ["fr", "en", "de"] as const) {
    const m = model(l);
    for (const b of [...LISTING_FAMILIES, "penthouse"]) assert.ok(m.blocks[b], `${l} bloc ${b}`);
    const v = m.vocab as unknown as { types: Record<string, string> };
    for (const t of LISTING_TYPES) assert.ok(v.types[t.slug], `${l} vocab ${t.slug}`);
    const all = JSON.stringify(m);
    assert.ok(!/[–—]/.test(all), `${l} : aucun tiret long ou moyen`);
  }
  const ns = readFileSync(join(root, "lib/i18n-client-messages.ts"), "utf8");
  assert.ok(ns.includes('"listing_model"'));
});
test("Mistral : consigne de redaction transmise a la traduction des annonces", () => {
  const src = readFileSync(join(root, "app/admin/properties/translate-actions.ts"), "utf8");
  assert.ok(src.includes('translateBatch(source, "EN", listingWritingPrompt("en"))') && src.includes('translateBatch(source, "DE", listingWritingPrompt("de"))'));
  const tr = readFileSync(join(root, "lib/translate.ts"), "utf8");
  assert.ok(tr.includes("${extraRules}"));
});
test("SQL 17 : colonne, table, RLS admin seulement", () => {
  const s = readFileSync(join(root, "supabase/manual/execution/17_modeles_annonces.sql"), "utf8");
  assert.ok(s.includes("ADD COLUMN IF NOT EXISTS listing_data jsonb"));
  assert.ok(s.includes("ENABLE ROW LEVEL SECURITY") && s.includes("USING (public.is_mapa_admin())") && s.includes("REVOKE ALL ON public.listing_templates FROM anon"));
  assert.ok(!/[–—]/.test(s));
});

// ---------------------------------------------------------------------------
console.log("\nPartie 3 : controle de redaction des annonces");
const { checkWriting, checkFields, templateLiteral } = await import("../lib/listing/writing-check");
const codes = (t: string, l: Lang = "fr", o = {}) => checkWriting(t, l, o).map((i) => i.code);
const has = (t: string, code: string, l: Lang = "fr", o = {}) => assert.ok(codes(t, l, o).includes(code as never), `${code} attendu pour : ${t}`);
const clean = (t: string, l: Lang = "fr", o = {}) => assert.deepEqual(checkWriting(t, l, o), [], `aucun point attendu pour : ${t}`);
const EM = String.fromCharCode(0x2014), EN_DASH = String.fromCharCode(0x2013);

test("tirets : long et moyen interdits, tiret de phrase interdit, liste et mots composes permis", () => {
  has(`Bel appartement ${EM} lumineux`, "dash");
  has(`Bel appartement ${EN_DASH} lumineux`, "dash");
  has("Steinfort - Luxembourg", "spaced_hyphen");
  has("Prix -- sur demande", "spaced_hyphen");
  clean("Les prestations :\n- Cave privative\n- Rez-de-chaussée orienté sud-ouest");
});
test("puces, emoji, fleches, symboles", () => {
  has("Atouts :\n• Cave", "bullet");
  has("Atouts :\n* Cave", "bullet");
  has("Atouts :\n-Cave", "bullet");
  has("Vue imprenable \u{1F3E1}", "emoji");
  has("Gare → 5 minutes", "symbol");
  has("★ Coup de coeur", "symbol");
  has("✔ Rénové", "symbol");
});
test("point d'exclamation interdit dans les 3 langues", () => {
  has("Une affaire !", "exclamation");
  has("A rare find!", "exclamation", "en");
  has("Ein seltenes Angebot!", "exclamation", "de");
});
test("titres : capitales et majuscules decoratives", () => {
  const o = { title: true, properNouns: ["Steinfort"] };
  has("SUPERBE appartement à Steinfort", "caps_word", "fr", o);
  has("Superbe Appartement Duplex à Vendre à Steinfort", "title_case", "fr", o);
  has("Superb Duplex Apartment For Sale in Steinfort", "title_case", "en", o);
  clean("Superbe appartement duplex 2 chambres à vendre à Steinfort", "fr", o);
  clean("Superb 2-bedroom duplex apartment for sale in Steinfort", "en", o);
  clean("Schöne Maisonette-Wohnung mit 2 Schlafzimmern zu verkaufen in Steinfort", "de", o);
  clean("Appartement en zone HAB-1, MAPA Property", "fr", o);
});
test("formules interdites (francais, liste de Julien)", () => {
  for (const f of ["Maison nichée au calme", "Un vrai havre de paix", "Cette villa n'attend que vous", "Idéal pour les familles", "Alliant à la perfection style et confort", "Une vue à couper le souffle", "Un must à Luxembourg", "Plongez dans le charme", "Laissez-vous séduire par ce bien", "Un véritable joyau", "Un écrin de verdure", "Un niché"]) has(f, "forbidden");
  has("Cette villa n’attend que vous", "forbidden");
  has("Découvrez.", "bare_verb");
  has("Visite sur rendez-vous. Découvrez !", "bare_verb");
  clean("Découvrez le séjour baigné de lumière.");
  clean("Un bien rare au calme, près de la gare.");
});
test("formules interdites proposees (anglais, allemand)", () => {
  for (const f of ["Nestled in a quiet street", "A haven of peace", "This villa awaits you", "Ideal for families", "A breathtaking view", "A true gem", "Discover."]) assert.ok(codes(f, "en").some((c) => c === "forbidden" || c === "bare_verb"), f);
  for (const f of ["Eingebettet im Grünen", "Eine Oase der Ruhe", "Diese Villa wartet auf Sie", "Ideal für Familien", "Ein atemberaubender Blick", "Ein wahres Juwel", "Ein Schmuckstück", "Entdecken Sie."]) assert.ok(codes(f, "de").some((c) => c === "forbidden" || c === "bare_verb"), f);
  clean("A bright apartment close to the station.", "en");
  clean("Eine helle Wohnung in Bahnhofsnähe.", "de");
});
test("trois adjectifs a la suite : regle supprimee (ecriture naturelle permise)", () => {
  clean("Un cadre de vie spacieux, lumineux et chaleureux.");
  clean("A bright, spacious and welcoming home.", "en");
  clean("Eine helle, geräumige und moderne Wohnung.", "de");
  assert.ok(!readFileSync(join(root, "lib/listing/writing-rules.ts"), "utf8").includes("three adjectives"), "consigne Mistral sans la regle");
});
test("typographie francaise : apostrophes, espaces, montants, surfaces", () => {
  has("L'entrée et l’escalier", "apostrophes");
  clean("L'entrée et l'escalier");
  clean("L’entrée et l’escalier");
  has("Charges: 280 €", "space_before");
  has("Vous souhaitez vendre?", "space_before");
  clean("Charges : 280 € ; visite à 10:30 sur https://mapaproperty.lu");
  has("Prix : 1200000 €", "amount");
  has("Prix : 1.200.000 €", "amount");
  has("Prix : 1 200 000€", "amount");
  has("Prix : €1 200 000", "amount");
  has("Prix : 900 euros", "amount");
  clean("Prix : 1 200 000 €, charges : 280 €.");
  has("Surface de 115m2", "area");
  has("Surface de 115 m2", "area");
  has("Surface de 115m²", "area");
  clean("Surface de 115 m², terrasse de 24 m².");
  // Regles typographiques francaises seulement : l'anglais garde ses usages.
  clean("Price: €1,200,000", "en");
});
test("le controle ne modifie jamais le texte", () => {
  const t = `Bel appartement ${EM} SUPERBE !`;
  const copy = String(t);
  checkWriting(t, "fr", { title: true });
  assert.equal(t, copy);
  const src = readFileSync(join(root, "lib/listing/writing-check.ts"), "utf8");
  assert.ok(!/\breplace\(.*text\)\s*;?\s*$/m.test(src.split("export function checkWriting")[1].split("return issues")[0]), "aucune reecriture dans checkWriting");
});
test("modeles par defaut et annonces generees : aucun point a corriger", () => {
  for (const l of ["fr", "en", "de"] as const) {
    const m = model(l);
    for (const [k, v] of Object.entries({ title: m.title, tronc: m.tronc, ...m.blocks })) assert.deepEqual(checkWriting(templateLiteral(v), l, { title: k === "title" }), [], `${l} ${k}`);
  }
  for (const pt of LISTING_TYPES.map((x) => x.slug)) {
    for (const l of ["fr", "en", "de"] as const) {
      for (const [tx, mandate] of [["sale", "exclusive"], ["sale", "simple"], ["rent", "exclusive"]] as const) {
        const d = sanitizeListingData(JSON.parse(JSON.stringify(steinfort)));
        d.written[l] = { ...d.written[l], qualifier: l === "fr" ? "superbe" : l === "en" ? "superb" : "schön", ambiance: l === "fr" ? "offre de beaux volumes" : l === "en" ? "offers generous volumes" : "bietet großzügige Räume" };
        const g = gen(l, { property_type: pt, transaction: tx, mandate_type: mandate, price: tx === "rent" ? 2400 : 720000 }, d);
        const issues = checkFields([{ field: "t", lang: l, text: g.title, title: true }, { field: "d", lang: l, text: g.text }], ["Steinfort"]);
        assert.deepEqual(issues, [], `${pt} ${l} ${tx} ${mandate} : ${JSON.stringify(issues)}`);
      }
    }
  }
});
test("ambiance de la reference acceptee telle quelle", () => {
  const d = sanitizeListingData(JSON.parse(JSON.stringify(steinfort)));
  d.written.fr.ambiance = "offre un cadre de vie spacieux, lumineux et chaleureux, alliant confort moderne et authenticité";
  const g = gen("fr", {}, d);
  assert.deepEqual(checkWriting(g.text, "fr"), []);
  assert.ok(g.text.includes("offre un cadre de vie spacieux, lumineux et chaleureux, alliant confort moderne et authenticité."));
});
test("enregistrement bloque : action serveur et ecran, motif detaille", () => {
  const act = readFileSync(join(root, "app/admin/properties/actions.ts"), "utf8");
  assert.ok(/const writing = await listingWritingFailure\(supabase, id, update\);\s*if \(writing\) return \{ ok: false, error: writing \};/.test(act));
  assert.ok(act.indexOf("listingWritingFailure(supabase, id, update)") < act.indexOf('.from("properties")\n    .update(update)'), "controle avant l'ecriture");
  const form = readFileSync(join(root, "components/admin/PropertyEditForm.tsx"), "utf8");
  assert.ok(form.includes('setError([tl("chk_blocked"), ...describe(blocking)].join("\\n"))'));
  const tpl = readFileSync(join(root, "app/admin/settings/modeles/actions.ts"), "utf8");
  assert.ok(tpl.includes("checkFields([{ field: target.part, lang: target.lang, text: templateLiteral(text)"));
  for (const l of ["fr", "en", "de"]) {
    const a = messages[l].admin_listing as Record<string, string>;
    for (const c of ["dash", "spaced_hyphen", "bullet", "emoji", "symbol", "exclamation", "caps_word", "title_case", "forbidden", "bare_verb", "apostrophes", "space_before", "amount", "area"]) assert.ok(a[`chk_${c}`]?.includes("{excerpt}"), `${l} chk_${c}`);
  }
});

// ---------------------------------------------------------------------------
console.log("\nPartie 4 : rubrique Nos recherches en cours");
const S = await import("../lib/searches/search");
const D = await import("../lib/searches/display");
const { formatMoney } = await import("../lib/listing/language");
const searchModel = (l: Lang) => (messages[l].listing_model as unknown as { search: { title: string; body: string; vocab: never } }).search;
const CLIENT = { name: "Marie Exemple", email: "marie.exemple@example.org", phone: "+352 621 000 000", address: "12 rue Fictive, L-1234 Luxembourg", budget: 873000 };
const baseSearch = {
  reference: "R-2026-001", transaction: "sale" as "sale" | "rent", property_type: "maison", communes: ["Bertrange", "Strassen"],
  budget_min: null as number | null, budget_max: null as number | null, bedrooms_min: 4, surface_min: 180, land_min: 500, delay: "6_months" as const,
  criteria: "Jardin orienté sud\nGarage double",
};
const sr = S.publicBudgetRange(CLIENT.budget, "sale")!;
const searchGen = (l: Lang, over: Partial<typeof baseSearch> = {}) => S.generateSearch({ ...baseSearch, budget_min: sr.min, budget_max: sr.max, ...over }, l, searchModel(l), searchModel(l).vocab);

test("budget publie : fourchette qui encadre le budget exact sans le reveler", () => {
  for (const exact of [180000, 349000, 499999, 500000, 873000, 1200000, 1499999, 2350000, 7800000]) {
    const r = S.publicBudgetRange(exact, "sale")!;
    assert.ok(r.min < exact && exact < r.max, `${exact} dans [${r.min}, ${r.max}]`);
    assert.ok(r.min % 25000 === 0 && r.max % 25000 === 0, "bornes arrondies");
  }
  const rent = S.publicBudgetRange(2600, "rent")!;
  assert.ok(rent.min < 2600 && 2600 < rent.max && rent.min % 250 === 0);
  assert.equal(S.publicBudgetRange(null, "sale"), null);
});
test("texte d'une recherche dans les 3 langues, accords et formules", () => {
  const fr = searchGen("fr");
  assert.equal(fr.title, "Recherche maison 4 chambres à Bertrange ou Strassen");
  assert.ok(fr.text.includes("MAPA Property recherche, pour l'un de ses clients, une maison à acheter à Bertrange ou Strassen."));
  assert.ok(fr.text.includes(`Budget : entre ${formatMoney(sr.min, "fr")} et ${formatMoney(sr.max, "fr")}`), "budget en fourchette");
  assert.ok(fr.text.includes("- 4 chambres au moins\n- Surface habitable de 180 m² au moins\n- Terrain de 5 ares au moins\n- Jardin orienté sud\n- Garage double"));
  assert.ok(fr.text.includes("Référence de la recherche : R-2026-001"));
  assert.ok(searchGen("fr", { property_type: "appartement" }).text.includes("un appartement à acheter"));
  assert.ok(searchGen("fr", { transaction: "rent" }).text.includes("une maison à louer"));
  const en = searchGen("en", { property_type: "appartement", criteria: "" });
  assert.ok(en.text.includes("for an apartment to buy in Bertrange or Strassen."));
  assert.equal(searchGen("en").title, "Wanted: house with at least 4 bedrooms in Bertrange or Strassen");
  const de = searchGen("de", { property_type: "maison-plain-pied", criteria: "" });
  assert.ok(de.text.includes("sucht im Auftrag eines Kunden einen Bungalow zum Kauf in Bertrange oder Strassen."));
  assert.ok(searchGen("de", { property_type: "villa" }).text.includes("eine Villa zum Kauf"));
  assert.ok(searchGen("de", { property_type: "maison-individuelle" }).text.includes("ein freistehendes Haus zum Kauf"));
  assert.ok(searchGen("de").text.includes("- Mindestens 4 Schlafzimmer\n"));
  assert.equal(searchGen("de").title, "Gesucht: Haus mit mindestens 4 Schlafzimmern in Bertrange oder Strassen");
});
test("donnees partielles : segments retires (terrain sans chambres, sans budget)", () => {
  const g = searchGen("fr", { property_type: "terrain", bedrooms_min: 3, surface_min: 200, budget_min: null, budget_max: null, delay: null as never, criteria: "" });
  assert.ok(!g.text.includes("chambre") && !g.text.includes("Surface habitable") && !g.text.includes("Budget") && !g.text.includes("Délai"), g.text);
  assert.ok(g.text.includes("- Terrain de 5 ares au moins"));
});
test("recherches : modele par defaut et textes conformes au controle de redaction", () => {
  for (const l of ["fr", "en", "de"] as const) {
    const m = searchModel(l);
    assert.deepEqual(checkWriting(templateLiteral(m.title), l, { title: true }), []);
    assert.deepEqual(checkWriting(templateLiteral(m.body), l), []);
    for (const t of S.SEARCH_TYPES) {
      const g = searchGen(l, { property_type: t, criteria: "" });
      assert.deepEqual(checkFields([{ field: "t", lang: l, text: g.title, title: true }, { field: "d", lang: l, text: g.text }], baseSearch.communes), [], `${l} ${t}`);
    }
  }
});
test("aucune donnee client publiee : textes, colonnes publiques, pages, donnees structurees", () => {
  // Le texte d'une recherche n'a aucun repere pour les donnees du client.
  const keys = Object.keys(S.searchValues({ ...baseSearch, budget_min: sr.min, budget_max: sr.max }, "fr", searchModel("fr").vocab));
  for (const k of keys) assert.ok(!/client|email|phone|telephone|address|adresse|budget_exact|notes|name/i.test(k), `repere ${k}`);
  for (const l of ["fr", "en", "de"] as const) {
    const g = searchGen(l);
    for (const secret of [CLIENT.name, CLIENT.email, CLIENT.phone, CLIENT.address, "873 000", "873,000", "873.000"]) assert.ok(!g.text.includes(secret) && !g.title.includes(secret), `${l} : ${secret}`);
  }
  // Colonnes lues par le site.
  const cols = S.PUBLIC_SEARCH_COLUMNS.split(",").map((c) => c.trim());
  for (const c of cols) assert.ok(!/client|email|phone|address|budget_exact|notes|search_data|consent_at|created_by/.test(c), `colonne publique ${c}`);
  // Le site ne lit jamais la table privee ni les champs du client.
  const publicFiles = ["lib/searches/data.ts", "lib/searches/display.ts", "components/searches/SearchCard.tsx", "app/[locale]/recherches/page.tsx", "app/[locale]/recherches/[reference]/page.tsx", "app/[locale]/villes/[ville]/page.tsx", "app/sitemap.ts"];
  for (const f of publicFiles) {
    const src = readFileSync(join(root, f), "utf8");
    assert.ok(!/property_search_private|client_name|client_email|client_phone|budget_exact|current_address/.test(src), f);
  }
  assert.ok(readFileSync(join(root, "lib/searches/data.ts"), "utf8").includes(".select(PUBLIC_SEARCH_COLUMNS)"));
  // Donnees structurees : rien que des champs publics.
  const pub = { id: "x", reference: "R-2026-001", status: "published", transaction: "sale", property_type: "maison", communes: ["Bertrange"], budget_min: sr.min, budget_max: sr.max, bedrooms_min: 4, surface_min: 180, land_min: null, delay: null, criteria_fr: null, criteria_en: null, criteria_de: null, title_fr: "t", title_en: null, title_de: null, description_fr: null, description_en: null, description_de: null, published_at: "2026-10-07T10:00:00Z", found_at: null, updated_at: null } as never;
  const ld = D.searchJsonLd(pub, "fr", "Recherche maison 4 chambres à Bertrange", "Texte");
  const json = JSON.stringify(ld);
  assert.equal((ld as { "@type": string })["@type"], "Demand");
  assert.ok(json.includes('"minPrice":' + sr.min) && json.includes('"maxPrice":' + sr.max) && json.includes('"sku":"R-2026-001"'));
  assert.ok(!json.includes("873000"), "jamais le budget exact");
  // Donnees du client : seulement dans property_search_private (action admin).
  const act = readFileSync(join(root, "app/admin/recherches/actions.ts"), "utf8");
  const rowBlock = act.slice(act.indexOf("const row: Record<string, unknown> = {"), act.indexOf("// Controle de redaction"));
  assert.ok(!/client|budget_exact|address|email|phone/.test(rowBlock.replace(/budgetExact|range\?/g, "")), "ligne publique sans donnee du client");
  assert.ok(/from\("property_search_private"\)\.upsert\(/.test(act));
});
test("publication impossible sans accord du client (ecran, action, base)", () => {
  const act = readFileSync(join(root, "app/admin/recherches/actions.ts"), "utf8");
  assert.ok(/if \(\(PUBLIC_SEARCH_STATUSES as readonly string\[\]\)\.includes\(next\) && !row\.consent_anonymous\) throw new ActionFailure\(t\("err_consent"\)\);/.test(act));
  assert.ok(act.includes('if (!row.consent_anonymous && (PUBLIC_SEARCH_STATUSES as readonly string[]).includes((cur as { status: string }).status)) row.status = "paused";'), "accord retire : pause");
  assert.ok(/insert\(\{ \.\.\.row, reference, status: "draft"/.test(act), "creation toujours en brouillon");
  const form = readFileSync(join(root, "components/admin/SearchForm.tsx"), "utf8");
  assert.ok(form.includes('disabled={busy || ((n === "published" || n === "found") && !s.consent)}'));
  const sql = readFileSync(join(root, "supabase/manual/execution/18_recherches_en_cours.sql"), "utf8");
  assert.ok(sql.includes("CHECK (status NOT IN ('published', 'found') OR consent_anonymous)"));
  assert.ok(sql.includes("USING (status IN ('published', 'found') AND consent_anonymous)"));
  for (const l of ["fr", "en", "de"]) assert.ok((messages[l].admin_searches as Record<string, string>).consent_label);
  assert.equal((messages.fr.admin_searches as Record<string, string>).consent_label, "Le client a donné son accord pour publier sa recherche de façon anonyme");
});
test("SQL 18 : RLS lecture publique des seules recherches visibles, colonnes publiques, ecriture admin", () => {
  const sql = readFileSync(join(root, "supabase/manual/execution/18_recherches_en_cours.sql"), "utf8");
  assert.ok(sql.includes("ALTER TABLE public.property_searches ENABLE ROW LEVEL SECURITY") && sql.includes("ALTER TABLE public.property_search_private ENABLE ROW LEVEL SECURITY"));
  assert.ok(sql.includes("REVOKE ALL ON public.property_search_private FROM anon"));
  assert.ok(sql.includes("REVOKE ALL ON public.property_searches FROM anon"));
  const grant = sql.slice(sql.indexOf("GRANT SELECT (id"), sql.indexOf("ON public.property_searches TO anon"));
  for (const c of ["search_data", "consent_at", "created_by", "client", "budget_exact"]) assert.ok(!grant.includes(c), `colonne ${c} non lisible par anon`);
  for (const c of S.PUBLIC_SEARCH_COLUMNS.split(",").map((x) => x.trim())) assert.ok(grant.includes(c), `colonne publique ${c} lisible`);
  assert.equal((sql.match(/USING \(public\.is_mapa_admin\(\)\)/g) ?? []).length, 2);
  assert.ok(!/[–—]/.test(sql));
});
test("demandes : type Proprietaire suite a une recherche, avec la reference", () => {
  const page = readFileSync(join(root, "app/[locale]/recherches/[reference]/page.tsx"), "utf8");
  assert.ok(page.includes('type="owner_search"') && page.includes("propertyRef={s.reference}") && page.includes('id="contact-form"'));
  assert.equal((messages.fr.admin_leads as Record<string, string>).type_owner_search, "Propriétaire suite à une recherche");
  for (const l of ["en", "de"]) assert.ok((messages[l].admin_leads as Record<string, string>).type_owner_search);
  assert.ok(readFileSync(join(root, "components/admin/LeadsTable.tsx"), "utf8").includes('"owner_search"'));
  assert.ok((messages.fr.searches_page as Record<string, string>).cta === "Vous avez ce bien ? Contactez-nous");
});
test("site : menu, pied de page, communes, plan du site, 3 langues", () => {
  for (const f of ["components/layout/Header.tsx", "components/layout/HeaderBurger.tsx", "components/layout/Footer.tsx"]) assert.ok(readFileSync(join(root, f), "utf8").includes('{ href: "/recherches", key: "our_searches" }'), f);
  const ville = readFileSync(join(root, "app/[locale]/villes/[ville]/page.tsx"), "utf8");
  assert.ok(ville.includes("fetchSearchesForCity(city.slug)") && ville.includes("<SearchCard"));
  const sm = readFileSync(join(root, "app/sitemap.ts"), "utf8");
  assert.ok(sm.includes('"/recherches",') && sm.includes("/recherches/${s.reference}"));
  for (const l of ["fr", "en", "de"]) {
    assert.ok((messages[l].nav as Record<string, string>).our_searches);
    assert.ok((messages[l].seo_pages as Record<string, { title: string }>).searches.title);
    const sp = messages[l].searches_page as Record<string, unknown>;
    for (const t of S.SEARCH_TYPES) assert.ok((sp.type as Record<string, string>)[t], `${l} type ${t}`);
  }
  assert.ok(readFileSync(join(root, "lib/i18n-client-messages.ts"), "utf8").includes('"searches_page"'));
});

console.log(`\n${n} PASS, ${failed} FAIL`);
if (failed) process.exit(1);
