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

console.log(`\n${n} PASS, ${failed} FAIL`);
if (failed) process.exit(1);
