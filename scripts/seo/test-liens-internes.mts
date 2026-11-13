// Liens internes complementaires (nov. 2026, audit SEO, partie D), sans
// serveur : articles lies, recherches clients sur les pages de ville,
// aucune ville en noindex dans les blocs de mise en avant.
// Lancement : node --import tsx scripts/seo/test-liens-internes.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { relatedPosts } from "../../lib/blog/related";
import { featuredCities } from "../../lib/internal-links";
import { getNearbyCities } from "../../lib/cities";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};
const P = (slug: string, commune: string | null, date: string, en = true) => ({ slug, commune, published_at: date, is_published: true, title_fr: slug, title_en: en ? slug : null, title_de: slug });

test("articles lies : 3, meme langue, meme ville d'abord puis les plus recents", () => {
  const cur = P("a", "Steinfort", "2026-01-01");
  const all = [cur, P("b", null, "2026-10-01"), P("c", "Steinfort", "2025-01-01"), P("d", "Hagen", "2024-01-01"), P("e", null, "2026-11-01"), P("f", null, "2026-12-01", false)];
  assert.deepEqual(relatedPosts(cur, all, "fr").map((p) => p.slug), ["c", "d", "f"]);
  assert.deepEqual(relatedPosts(cur, all, "en").map((p) => p.slug), ["c", "d", "e"], "sans titre anglais : absent en anglais");
});
test("article : bloc Articles lies affiche", () => {
  const s = read("app/[locale]/blog/[slug]/page.tsx");
  assert.ok(s.includes("data-related-articles") && s.includes('tx("related_articles_title")'));
});
test("pages de ville : bloc Nos clients recherchent ici avec leurs liens", () => {
  const s = read("app/[locale]/villes/[ville]/page.tsx");
  assert.ok(s.includes("data-city-searches") && s.includes('tx("city_searches_here")') && s.includes("/recherches/${s.reference}"));
  assert.equal(JSON.parse(read("messages/fr.json")).explore.city_searches_here, "Nos clients recherchent ici");
});
test("mise en avant : aucune ville en noindex (pied de page, accueil, voisines)", () => {
  assert.ok(featuredCities().every((c) => c.country === "LU"), "villes du Luxembourg : toujours indexables");
  assert.ok(!getNearbyCities("monaco", 4, (c) => c.slug !== "paris").some((c) => c.slug === "paris"));
  assert.ok(read("app/[locale]/villes/[ville]/page.tsx").includes("getNearbyCities(city.slug, 4, (c) => indexableSlugs.has(c.slug))"));
});
console.log(`${pass} PASS, 0 FAIL`);
