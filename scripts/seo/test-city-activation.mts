// Activation automatique des pages de villes (oct. 2026), simulations sans
// base : liste de biens publies -> pages du sitemap et balise robots, avec
// les memes fonctions que le site (lib/city-indexing.ts).
// Lancement : node --import tsx scripts/seo/test-city-activation.mts
import { strict as assert } from "node:assert";
import { cities, getCityBySlug } from "../../lib/cities";
import { indexableCities, isCityIndexable, publishedCountByCity } from "../../lib/city-indexing";

let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};
type P = { city: string; city_page?: string | null };
const inSitemap = (props: P[], slug: string) => indexableCities(props).some((c) => c.slug === slug);
const robotsIndex = (props: P[], slug: string) => isCityIndexable(getCityBySlug(slug)!, publishedCountByCity(props).get(slug) ?? 0);
// Situation de depart : les 13 biens publies aujourd'hui (villes saisies en base).
const TODAY: P[] = ["Downtown Dubai", "Steinfort", "Downtown Dubai", "Hesperange", "Metz", "Dubai", "Bettembourg", "Fentange", "Steinfort", "Portimão", "Mondorf les bains", "Luxembourg", "Luxembourg"].map((city) => ({ city }));

const cycle = (place: string, slug: string) => {
  assert.equal(inSitemap(TODAY, slug), false, `${slug} absent au depart`);
  assert.equal(robotsIndex(TODAY, slug), false, `${slug} noindex au depart`);
  const published = [...TODAY, { city: place }];
  assert.equal(inSitemap(published, slug), true, `${place} publie : ${slug} dans le sitemap`);
  assert.equal(robotsIndex(published, slug), true, `${place} publie : ${slug} indexable`);
  // Depublie : retour a la liste de depart.
  assert.equal(inSitemap(TODAY, slug), false);
  assert.equal(robotsIndex(TODAY, slug), false);
};

test("un bien publie a Saint Tropez active Saint-Tropez ; depublie, retour en noindex", () => cycle("Saint Tropez", "saint-tropez"));
test("Grand Baie active Ile Maurice ; depublie, retour en noindex", () => cycle("Grand Baie", "ile-maurice"));

test("Downtown Dubai active Dubai ; sans aucun bien a Dubai, noindex", () => {
  const noDubai = TODAY.filter((p) => !/dubai/i.test(p.city));
  assert.equal(inSitemap(noDubai, "dubai"), false);
  assert.equal(robotsIndex(noDubai, "dubai"), false);
  const one = [...noDubai, { city: "Downtown Dubai" }];
  assert.equal(inSitemap(one, "dubai"), true);
  assert.equal(robotsIndex(one, "dubai"), true);
  assert.equal(inSitemap(TODAY, "dubai"), true, "aujourd'hui : 3 biens a Dubai");
});

test("Metz et Algarve indexables avec leur bien, noindex sans bien", () => {
  for (const slug of ["metz", "algarve"]) {
    assert.equal(inSitemap(TODAY, slug), true, slug);
    assert.equal(robotsIndex(TODAY, slug), true, slug);
  }
  const none = TODAY.filter((p) => p.city !== "Metz" && p.city !== "Portimão");
  for (const slug of ["metz", "algarve"]) {
    assert.equal(inSitemap(none, slug), false, slug);
    assert.equal(robotsIndex(none, slug), false, slug);
  }
});

test("une ville du Luxembourg reste indexable sans aucun bien", () => {
  for (const c of cities.filter((c) => c.country === "LU")) {
    assert.equal(inSitemap([], c.slug), true, c.slug);
    assert.equal(robotsIndex([], c.slug), true, c.slug);
  }
});

test("choix de l'admin : rattachement force ou retire", () => {
  assert.equal(inSitemap([{ city: "Cap Ferrat", city_page: "nice" }], "nice"), true);
  assert.equal(inSitemap([{ city: "Downtown Dubai", city_page: "none" }], "dubai"), false);
});

test("compte : 25 villes du Luxembourg, Dubai, Metz, Algarve aujourd'hui", () => {
  const slugs = indexableCities(TODAY).map((c) => c.slug);
  assert.equal(slugs.length, 28);
  assert.ok(["dubai", "metz", "algarve"].every((s) => slugs.includes(s)) && !slugs.includes("ile-maurice"));
});

console.log(`${pass} PASS, 0 FAIL`);
