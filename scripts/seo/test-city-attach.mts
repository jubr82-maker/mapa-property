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
  for (const f of ["app/sitemap.ts", "app/[locale]/villes/[ville]/page.tsx"]) assert.ok(read(f).includes("publishedCountByCity(await fetchAllPropertiesWithCoverStrict())"), f);
  assert.ok(read("lib/data.ts").includes("city_page:listing_data->facts->>city_page"));
  // Fiche, page de ville et sitemap : meme rattachement.
  assert.ok(read("app/[locale]/biens/[slug]/page.tsx").includes("cityForProperty({ city: property.city"));
  // Publier, modifier, depublier, archiver, supprimer : pages de villes et sitemap rafraichis.
  const actions = read("app/admin/properties/actions.ts");
  for (const fn of ["setPropertyPublishedImpl", "updateProperty", "archiveProperty", "restoreProperty", "deleteProperty", "createProperty"]) {
    const body = actions.slice(actions.indexOf(`function ${fn}(`));
    const end = body.indexOf("\nexport async function", 10);
    assert.ok(/revalidatePublicPropertyPages\(|revalidatePropertyPaths\(/.test(body.slice(0, end > 0 ? end : undefined)), fn);
  }
  const rv = read("lib/revalidate-property.ts");
  assert.ok(rv.includes('revalidatePath("/[locale]/villes/[ville]", "page")') && rv.includes('revalidatePath("/sitemap.xml")'));
});

console.log(`${pass} PASS, 0 FAIL`);
