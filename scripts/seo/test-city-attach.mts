// Rattachement des biens aux pages de villes (oct. 2026), sans reseau.
// Lancement : node --import tsx scripts/seo/test-city-attach.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cities, getCityBySlug } from "../../lib/cities";
import { cityForPlace, cityForProperty, cityPageOptions } from "../../lib/internal-links";
import { normPlace } from "../../lib/city-match";
import { sanitizeListingData } from "../../lib/listing/listing-data";
import { isCityIndexable, publishedCountByCity } from "../../lib/city-indexing";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

const MANDATORY: Record<string, string[]> = {
  dubai: ["Dubai", "Downtown Dubai", "Dubai Marina", "Palm Jumeirah", "Business Bay"],
  steinfort: ["Hagen", "Kleinbettingen", "Grass"],
  "saint-tropez": ["Saint Tropez", "St-Tropez", "St Tropez"],
  monaco: ["Monte-Carlo", "Monte Carlo"],
  geneve: ["Genf", "Geneva"],
};

test("referentiel unique : identifiant, 3 noms, alias obligatoires", () => {
  for (const [slug, aliases] of Object.entries(MANDATORY)) {
    const c = getCityBySlug(slug)!;
    assert.ok(c && c.name.fr && c.name.en && c.name.de, slug);
    for (const a of aliases) {
      assert.ok(c.aliases?.includes(a), `${slug} alias ${a}`);
      assert.equal(cityForPlace(a)?.slug, slug, a);
    }
  }
  // Aucun alias ne designe deux pages.
  const seen = new Map<string, string>();
  for (const c of cities) for (const k of cityPageOptions().find((o) => o.slug === c.slug)!.keys) {
    assert.ok(!seen.has(k) || seen.get(k) === c.slug, `${k} : ${seen.get(k)} et ${c.slug}`);
    seen.set(k, c.slug);
  }
});

test("comparaison sans accents, majuscules, espaces ni traits d'union", () => {
  for (const v of ["downtown dubai", "DOWNTOWN-DUBAI", "  Downtown   Dubai ", "Dubaï"]) assert.equal(cityForPlace(v)?.slug, "dubai", v);
  for (const v of ["Saint Tropez", "saint-tropez", "SAINT TROPEZ", "st tropez"]) assert.equal(cityForPlace(v)?.slug, "saint-tropez", v);
  assert.equal(cityForPlace("Genève")?.slug, "geneve");
  assert.equal(cityForPlace("monte carlo")?.slug, "monaco");
  assert.equal(normPlace("Rivière Noire"), "riviere-noire");
  assert.equal(cityForPlace("Hesperange"), undefined);
});

test("adresses des pages inchangees", () => {
  for (const s of ["luxembourg-ville", "steinfort", "dubai", "saint-tropez", "monaco", "geneve", "paris"]) assert.ok(getCityBySlug(s), s);
});

test("choix de l'admin : prioritaire, aucune page, ou automatique", () => {
  assert.equal(cityForProperty({ city: "Hesperange", city_page: "luxembourg-ville" })?.slug, "luxembourg-ville");
  assert.equal(cityForProperty({ city: "Downtown Dubai", city_page: "none" }), undefined);
  assert.equal(cityForProperty({ city: "Downtown Dubai", city_page: null })?.slug, "dubai");
  assert.equal(cityForProperty({ city: "Downtown Dubai", city_page: "page-inconnue" })?.slug, "dubai");
  // Enregistre dans listing_data.facts.city_page, forme fermee.
  assert.equal(sanitizeListingData({ facts: { city_page: "steinfort" } }).facts.city_page, "steinfort");
  assert.equal(sanitizeListingData({ facts: { city_page: "none" } }).facts.city_page, "none");
  assert.equal(sanitizeListingData({ facts: { city_page: "<script>" } }).facts.city_page, null);
});

test("admin : liste fermee a cote de la ville, etat affiche, champ ville conserve", () => {
  const sel = read("components/admin/CityPageSelect.tsx");
  assert.ok(sel.includes('t("city_page_attached", { city: page.label })') && sel.includes('t("city_page_missing")') && !/border|rounded-2xl|shadow/.test(sel.replace(/className=\{className\}/g, "")));
  const create = read("components/admin/PropertyCreateForm.tsx");
  assert.ok(create.includes('<CitySuggestInput\n            name="city"') && create.includes('name="city_page"'));
  assert.ok(read("components/admin/PropertyEditForm.tsx").includes("<CityPageSelect"));
  for (const l of ["fr", "en", "de"]) {
    const a = JSON.parse(read(`messages/${l}.json`)).admin_properties;
    for (const k of ["f_city_page", "city_page_auto", "city_page_none_option", "city_page_attached", "city_page_missing"]) assert.ok(a[k], `${l} ${k}`);
  }
  assert.equal(JSON.parse(read("messages/fr.json")).admin_properties.city_page_attached, "Rattaché à la page : {city}");
});

test("activation : un bien publie suffit, sa suppression la retire ; lecture en echec sans repli", () => {
  const dubai = getCityBySlug("dubai")!;
  assert.equal(isCityIndexable(dubai, publishedCountByCity([{ city: "Downtown Dubai" }]).get("dubai") ?? 0), true);
  assert.equal(isCityIndexable(dubai, publishedCountByCity([]).get("dubai") ?? 0), false);
  assert.ok(read("app/sitemap.ts").includes("indexableCities(await fetchAllPropertiesWithCoverStrict())"));
  // Page de ville : ses biens seulement (cache par ville), lecture sans repli.
  assert.ok(read("app/[locale]/villes/[ville]/page.tsx").includes("(await fetchCityPropertiesStrict(city.slug)).length"));
  assert.ok(read("lib/data.ts").includes('["city-properties-v1", citySlug]') && read("lib/data.ts").includes("tags: [cityPropertiesTag(citySlug)]"));
  assert.ok(read("lib/data.ts").includes("city_page:listing_data->facts->>city_page"));
  // Fiche, page de ville et sitemap : meme rattachement.
  assert.ok(read("app/[locale]/biens/[slug]/page.tsx").includes("cityForProperty({ city: property.city"));
  // Publier, modifier, depublier, archiver, supprimer : pages de villes et sitemap rafraichis.
  const actions = read("app/admin/properties/actions.ts");
  for (const fn of ["setPropertyPublishedImpl", "updateProperty", "archiveProperty", "restoreProperty", "deleteProperty", "createProperty"]) {
    const body = actions.slice(actions.indexOf(`function ${fn}(`));
    const end = body.indexOf("\nexport async function", 10);
    assert.ok(/revalidatePropertyChange\(|revalidatePropertyPaths\(/.test(body.slice(0, end > 0 ? end : undefined)), fn);
  }
  const rv = read("lib/revalidate-property.ts");
  // Ville actuelle et ancienne seulement (lignes avant et apres), jamais toutes les villes.
  assert.ok(rv.includes("revalidateTag(cityPropertiesTag(slug), { expire: 0 })") && rv.includes('revalidatePath("/sitemap.xml")'));
  assert.ok(!rv.includes('"/[locale]/villes/[ville]"'));
});

const MU = ["Maurice", "Mauritius", "Ile Maurice", "Grand Baie", "Grand-Baie", "Tamarin", "Rivière Noire", "Riviere Noire", "Black River", "Flic en Flac", "Bel Ombre", "Port-Louis", "Moka", "Pereybere", "Trou aux Biches"];
// Textes definitifs (2026-10-23) : un paragraphe par langue, 4 points cles
// par langue (highlights = points francais), sans tiret long ou moyen ni
// fourchette de prix (indexation par bien publie seulement).
const neutral = (slug: string) => {
  const c = getCityBySlug(slug)!;
  for (const l of ["fr", "en", "de"] as const) {
    assert.equal(c.highlightsByLang?.[l].length, 4, `${slug} ${l} : 4 points cles`);
    assert.ok(c.intro[l].length > 300 && !c.intro[l].includes("\n"), `${slug} ${l} : un paragraphe`);
  }
  assert.deepEqual(c.highlights, c.highlightsByLang?.fr);
  assert.ok(!/[\u2013\u2014]/.test(JSON.stringify([c.intro, c.highlightsByLang])), `${slug} : tiret long ou moyen`);
  assert.equal(c.priceRange, undefined, `${slug} : pas de fourchette de prix`);
};

test("Ile Maurice : page, noms, pays, alias ; noindex et hors sitemap sans bien", () => {
  const c = getCityBySlug("ile-maurice")!;
  assert.deepEqual(c.name, { fr: "Île Maurice", en: "Mauritius", de: "Mauritius" });
  assert.equal(c.country, "MU");
  for (const a of MU) assert.equal(cityForPlace(a)?.slug, "ile-maurice", a);
  assert.equal(isCityIndexable(c, 0), false);
  assert.equal(isCityIndexable(c, publishedCountByCity([{ city: "Grand Baie" }]).get("ile-maurice") ?? 0), true);
  neutral("ile-maurice");
});

test("Metz et Algarve : pages, alias, biens 86430704 et 85603229 rattaches, indexables avec leur bien", () => {
  const metz = getCityBySlug("metz")!, algarve = getCityBySlug("algarve")!;
  assert.deepEqual(metz.name, { fr: "Metz", en: "Metz", de: "Metz" });
  assert.deepEqual(algarve.name, { fr: "Algarve", en: "Algarve", de: "Algarve" });
  assert.equal(metz.country, "FR");
  assert.equal(algarve.country, "PT");
  for (const a of ["Metz", "Montigny-lès-Metz", "Montigny-les-Metz", "Woippy", "Marly", "Moulins-lès-Metz", "Thionville"]) assert.equal(cityForPlace(a)?.slug, "metz", a);
  for (const a of ["Algarve", "Portimão", "Portimao", "Lagos", "Albufeira", "Vilamoura", "Faro", "Lagoa", "Carvoeiro", "Alvor", "Tavira", "Loulé", "Loule", "Quinta do Lago", "Vale do Lobo", "Praia da Rocha"]) assert.equal(cityForPlace(a)?.slug, "algarve", a);
  // Biens publies (ville saisie en base) : Metz 86430704, Portimão 85603229.
  const counts = publishedCountByCity([{ city: "Metz" }, { city: "Portimão" }]);
  assert.equal(isCityIndexable(metz, counts.get("metz") ?? 0), true);
  assert.equal(isCityIndexable(algarve, counts.get("algarve") ?? 0), true);
  assert.equal(isCityIndexable(metz, 0), false);
  assert.equal(isCityIndexable(algarve, 0), false);
  neutral("metz");
  neutral("algarve");
  // Francais : "en Algarve", jamais "a Algarve".
  assert.equal(algarve.prepositionFr, "en");
});

console.log(`${pass} PASS, 0 FAIL`);
