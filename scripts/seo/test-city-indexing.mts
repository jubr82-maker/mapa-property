// Indexation des pages de villes (oct. 2026), sans reseau.
// Lancement : node --import tsx scripts/seo/test-city-indexing.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cities, getCityBySlug } from "../../lib/cities";
import { cityHasOwnContent, isCityIndexable, publishedCountByCity } from "../../lib/city-indexing";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};
const city = (slug: string) => getCityBySlug(slug)!;

test("une ville du Luxembourg reste indexable, sans exception", () => {
  for (const c of cities.filter((c) => c.country === "LU")) {
    assert.ok(isCityIndexable(c, 0), c.slug);
    assert.ok(cityHasOwnContent(c), c.slug);
  }
  // Meme sans fourchette de prix : jamais exclue.
  assert.ok(isCityIndexable({ ...city("mamer"), priceRange: undefined }, 0));
});

test("une ville etrangere vide n'est pas indexable", () => {
  for (const s of ["amsterdam", "berlin", "miami", "new-york", "saint-barthelemy", "zurich", "paris"]) {
    assert.equal(cityHasOwnContent(city(s)), false, s);
    assert.equal(isCityIndexable(city(s), 0), false, s);
  }
});

test("une ville etrangere avec un bien publie, ou un contenu propre, l'est", () => {
  assert.ok(isCityIndexable(city("dubai"), 1));
  assert.ok(isCityIndexable(city("amsterdam"), 2));
  assert.ok(isCityIndexable({ ...city("berlin"), priceRange: { floor: 5000, ceiling: 9000 } }, 0));
  // Biens rattaches par la page (nom, slug, localites) : Dubai, Steinfort, Hagen.
  const counts = publishedCountByCity([{ city: "Dubai" }, { city: "Steinfort" }, { city: "Hagen" }, { city: "Downtown Dubai" }, { city: null }]);
  assert.equal(counts.get("dubai"), 1);
  assert.equal(counts.get("steinfort"), 2);
});

test("page : noindex, follow et aucune autre langue declaree ; sitemap filtre ; rafraichi par un bien", () => {
  const page = read("app/[locale]/villes/[ville]/page.tsx");
  assert.ok(page.includes("robots: { index: false, follow: true }") && page.includes("alternates: indexable ? alternates : { canonical: alternates.canonical }"));
  const sm = read("app/sitemap.ts");
  assert.ok(sm.includes("const indexableCities = cities.filter((city) => isCityIndexable(city, cityCounts.get(city.slug) ?? 0));") && sm.includes("indexableCities.map((city)"));
  const rv = read("lib/revalidate-property.ts");
  const fn = rv.slice(rv.indexOf("export function revalidatePublicPropertyPages"), rv.indexOf("export function revalidatePublicBlogPages"));
  assert.ok(fn.includes('revalidatePath("/[locale]/villes/[ville]", "page")') && fn.includes('revalidatePath("/sitemap.xml")') && fn.includes("revalidateTag(PROPERTIES_LIST_TAG"));
  // Menus et listes inchanges : la liste des villes n'est jamais filtree.
  assert.ok(read("app/[locale]/services/marches-actifs/page.tsx").includes("<ExploreLinks cities={cities}"));
});

console.log(`${pass} PASS, 0 FAIL`);
