// Maillage des pages de ville (nov. 2026, audit SEO du 12/11/2026), sans
// serveur ni reseau. Calcul sur les composants : chaque page de ville
// indexable du Luxembourg recoit au moins 3 liens internes depuis d'AUTRES
// pages (pages distinctes). Sources comptees :
//  - pied de page et accueil (villes mises en avant, FEATURED_CITY_SLUGS) :
//    present sur toutes les pages, compte pour l'accueil, une page de
//    service et une fiche (3 pages) ;
//  - page des marches (/services/marches-actifs) : liste de toutes les
//    villes et communes reliees a leur page ;
//  - pages de ville : voisines par distance, quartiers de Luxembourg-Ville,
//    lien "Tous les quartiers", lien vers la commune.
// Les fiches de biens, articles et recherches (liens selon la base) ne sont
// pas comptes : minimum garanti par le code seul.
// Lancement : node --import tsx scripts/seo/test-maillage-villes.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cities, getNearbyCities, luxembourgCities } from "../../lib/cities";
import { FEATURED_CITY_SLUGS, cityForPlace } from "../../lib/internal-links";
import { communeCityOf, isQuartierCity, quartierCities } from "../../lib/city-links";
import { luxembourgCommunes } from "../../lib/markets";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

const inbound = new Map<string, Set<string>>();
const link = (from: string, to: string) => {
  if (from === `/villes/${to}`) return;
  if (!inbound.has(to)) inbound.set(to, new Set());
  inbound.get(to)!.add(from);
};

// Pied de page et accueil.
for (const s of FEATURED_CITY_SLUGS) for (const from of ["/", "/services", "/biens/(fiche)"]) link(from, s);
// Page des marches : toutes les villes (ExploreLinks) et les communes.
for (const c of cities) link("/services/marches-actifs", c.slug);
for (const name of luxembourgCommunes) {
  const page = cityForPlace(name);
  if (page) link("/services/marches-actifs", page.slug);
}
// Pages de ville (villes du Luxembourg toujours indexables).
for (const c of cities) {
  const from = `/villes/${c.slug}`;
  for (const n of getNearbyCities(c.slug, 4, (x) => x.country === "LU" || c.country !== "LU")) link(from, n.slug);
  if (c.slug === "luxembourg-ville") for (const q of quartierCities()) link(from, q.slug);
  if (isQuartierCity(c)) link(from, "luxembourg-ville");
  const commune = communeCityOf(c);
  if (commune) link(from, commune.slug);
}

const weak = luxembourgCities.filter((c) => (inbound.get(c.slug)?.size ?? 0) < 3);
console.log("Liens entrants par ville du Luxembourg :");
for (const c of luxembourgCities) console.log(`  ${c.slug.padEnd(18)} ${inbound.get(c.slug)?.size ?? 0}`);

test("chaque ville indexable du Luxembourg recoit au moins 3 liens d'autres pages", () => {
  assert.deepEqual(weak.map((c) => c.slug), []);
});
test("voisines par distance (Steinfort : Mamer d'abord ; Kirchberg : quartiers proches)", () => {
  assert.equal(getNearbyCities("steinfort")[0].slug, "mamer");
  assert.ok(getNearbyCities("kirchberg").every((c) => c.country === "LU"));
  assert.ok(!getNearbyCities("mamer", 4, (c) => c.slug !== "bertrange").some((c) => c.slug === "bertrange"), "ville non indexable jamais proposee");
});
test("Luxembourg-Ville liste ses 16 quartiers qui ont une page", () => {
  assert.equal(quartierCities().length, 16);
  assert.ok(quartierCities().some((c) => c.slug === "belair") && !quartierCities().some((c) => c.slug === "luxembourg-ville"));
});
test("page des marches : plus aucun lien vers /biens?country=LU&city=", () => {
  assert.ok(!read("app/[locale]/services/marches-actifs/page.tsx").includes("/biens?country=LU&city="));
});

console.log(`${pass} PASS, 0 FAIL`);
