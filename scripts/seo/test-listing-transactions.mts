// Pages "biens a vendre" et "biens a louer" (nov. 2026, audit SEO, partie B),
// sans serveur : adresse reconnue seulement avec le SEUL parametre
// transaction, robots.txt les autorise, anciennes adresses en une etape.
// Lancement : node --import tsx scripts/seo/test-listing-transactions.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { listingTransaction, LISTING_TRANSACTION_PATHS } from "../../lib/search/url";
import { QUERY_ALLOW, QUERY_DISALLOW } from "../../lib/robots-rules";
import { OLD_SITE_PAGES, V28_PAGES, resolveLegacyPath } from "../../lib/legacy-redirects";
import { pageAlternates } from "../../lib/seo";

const root = join(import.meta.dirname, "..", "..");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

test("seul parametre transaction=sale|rent : page a part entiere", () => {
  assert.equal(listingTransaction({ transaction: "sale" }), "sale");
  assert.equal(listingTransaction({ transaction: "rent" }), "rent");
  assert.equal(listingTransaction({ transaction: "sale", city: "Steinfort" }), null);
  assert.equal(listingTransaction({ transaction: "offmarket" }), null);
  assert.equal(listingTransaction({}), null);
  assert.equal(listingTransaction({ city: "Mamer" }), null);
});
test("canonical et hreflang vers les memes adresses, x-default vers /fr", () => {
  const a = pageAlternates("en", "/biens?transaction=rent");
  assert.equal(a.canonical, "/en/biens?transaction=rent");
  assert.equal(a.languages["x-default"], "/fr/biens?transaction=rent");
  assert.equal(a.languages.de, "/de/biens?transaction=rent");
});
test("robots.txt : autorisees exactement, les autres variantes bloquees", () => {
  assert.deepEqual([...QUERY_ALLOW], ["/*/biens?transaction=sale$", "/*/biens?transaction=rent$"]);
  assert.ok(QUERY_DISALLOW.includes("/*/biens?"));
});
test("anciennes adresses : une seule etape vers ces pages", () => {
  assert.deepEqual(resolveLegacyPath("/fr/ventes"), { kind: "path", to: "/fr/biens?transaction=sale" });
  assert.deepEqual(resolveLegacyPath("/de/vermietung"), { kind: "path", to: "/de/biens?transaction=rent" });
  for (const to of [...Object.values(OLD_SITE_PAGES), ...Object.values(V28_PAGES)]) {
    if (to.includes("?")) assert.ok((LISTING_TRANSACTION_PATHS as readonly string[]).includes(to), to);
  }
});
test("sitemap : les 6 adresses", () => {
  const s = readFileSync(join(root, "lib/sitemaps.ts"), "utf8");
  assert.ok(s.includes("LISTING_TRANSACTION_PATHS"));
});
console.log(`${pass} PASS, 0 FAIL`);
