// Page de ville Steinfort (oct. 2026), sans reseau.
// Lancement : node --import tsx scripts/seo/test-city-steinfort.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cities, getCityBySlug, getNearbyCities, luxembourgCities } from "../../lib/cities";
import { cityForPlace } from "../../lib/internal-links";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

const s = getCityBySlug("steinfort")!;

test("donnees : modele des villes du Luxembourg, region Ouest, marche 6 000 a 8 500", () => {
  assert.ok(s && s.country === "LU" && s.region === "Ouest");
  assert.deepEqual(s.priceRange, { floor: 6000, ceiling: 8500 });
  assert.ok(luxembourgCities.includes(s));
  for (const l of ["fr", "en", "de"] as const) {
    assert.ok(s.intro[l].startsWith("Steinfort") && s.intro[l].includes("Kleinbettingen"), l);
    assert.equal(s.highlightsByLang![l].length, 4, l);
  }
  assert.equal(s.intro.fr.split("Steinfort, Hagen, Kleinbettingen et Grass").length, 2);
  const all = JSON.stringify(s);
  assert.ok(!/[–—]/.test(all), "aucun tiret long ou moyen");
});

test("biens et recherches des quatre localites rattaches a la page", () => {
  for (const p of ["Steinfort", "steinfort", "Hagen", "Kleinbettingen", "Grass", "GRASS"]) assert.equal(cityForPlace(p)?.slug, "steinfort", p);
  // Autres villes inchangees.
  for (const [p, slug] of [["Strassen", "strassen"], ["Bartringen", "bertrange"], ["Mamer", "mamer"], ["Luxembourg-Ville", "luxembourg-ville"]]) assert.equal(cityForPlace(p)?.slug, slug, p);
  assert.equal(cityForPlace("Hesperange"), undefined);
});

test("autres villes inchangees : voisines, points cles, aucune localite", () => {
  for (const c of cities.filter((c) => c.slug !== "steinfort")) {
    assert.ok(!(c.aliases ?? []).some((a) => ["Hagen", "Kleinbettingen", "Grass"].includes(a)), c.slug);
    if (c.country === "LU") assert.equal(c.highlightsByLang, undefined, c.slug);
    assert.ok(!getNearbyCities(c.slug, 4).some((n) => n.slug === "steinfort") || c.country !== "LU" || luxembourgCities.indexOf(c) >= 4, c.slug);
  }
  assert.equal(luxembourgCities[luxembourgCities.length - 1].slug, "steinfort");
});

test("page : titre, description et grand titre des modeles, points cles traduits", () => {
  const page = read("app/[locale]/villes/[ville]/page.tsx");
  assert.ok(page.includes('tc(city.country === "LU" ? "city.title" : "city.title_intl"') && page.includes('"city.h1_prefix"'));
  assert.ok(page.includes("(city.highlightsByLang?.[loc] ?? city.highlights)"));
  const fr = JSON.parse(read("messages/fr.json")).seo_pages.city;
  assert.equal(fr.h1_prefix, "Agence immobilière à");
});

test("liens : ville vers articles de la commune, article vers la ville, dans la langue de la page", () => {
  const page = read("app/[locale]/villes/[ville]/page.tsx");
  assert.ok(page.includes("cityForPlace(b.commune)?.slug === city.slug") && page.includes("href={`/blog/${b.slug}`}"));
  const blog = read("app/[locale]/blog/[slug]/page.tsx");
  assert.ok(blog.includes("const city = cityForPlace(post.commune);") && blog.includes("href={`/villes/${city.slug}`}"));
  for (const l of ["fr", "en", "de"]) {
    const x = JSON.parse(read(`messages/${l}.json`)).explore;
    assert.ok(x.city_articles_title && x.article_city_link.includes("{city}"), l);
  }
  // Article modifie : seulement les pages des communes de l'article (avant et apres).
  assert.ok(read("lib/revalidate-property.ts").includes("for (const slug of cities) for (const l of LOCALES) revalidatePath(`/${l}/villes/${slug}`);"));
});

test("sitemap et Marches par ville : liste des villes", () => {
  assert.ok(read("app/sitemap.ts").includes("sitemapCities.map((city)"));
  assert.ok(read("app/[locale]/services/marches-actifs/page.tsx").includes("<ExploreLinks cities={cities}"));
});

console.log(`${pass} PASS, 0 FAIL`);
