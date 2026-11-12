// Bandeaux Sous compromis, Vendu, Loue (nov. 2026, partie A), sans reseau.
// Lancement : node --import tsx scripts/test-bandeaux.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { availableFirst, bannerOf, bannersFor, checkBanner, isClosed, DIAGONAL_ANGLE } from "../lib/property-banner";
import { realEstateListing } from "../lib/seo";

const root = join(import.meta.dirname, "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

test("listes fermees selon la transaction", () => {
  assert.deepEqual(bannersFor("sale"), ["under_compromise", "sold"]);
  assert.deepEqual(bannersFor("rent"), ["rented"]);
  assert.equal(checkBanner("sale", "sold", "straight", "sapin"), null);
  assert.equal(checkBanner("sale", "under_compromise", "diagonal", "blanc"), null);
  assert.equal(checkBanner("sale", null, "straight", "sapin"), null);
  assert.equal(checkBanner("rent", "rented", "diagonal", "creme"), null);
  assert.equal(checkBanner("sale", "rented", "straight", "sapin"), "banner_transaction");
  assert.equal(checkBanner("rent", "sold", "straight", "sapin"), "banner_transaction");
  assert.equal(checkBanner("rent", "under_compromise", "straight", "sapin"), "banner_transaction");
  assert.equal(checkBanner("sale", "vendu", "straight", "sapin"), "banner_invalid");
  assert.equal(checkBanner("sale", "sold", "oblique", "sapin"), "banner_invalid");
  assert.equal(checkBanner("sale", "sold", "straight", "rouge"), "banner_invalid");
});

test("lecture tolerante : colonnes absentes = aucun bandeau", () => {
  assert.equal(bannerOf({ transaction: "sale" }), null);
  assert.equal(bannerOf({ transaction: "sale", status_banner: null }), null);
  assert.deepEqual(bannerOf({ transaction: "sale", status_banner: "sold", banner_position: null, banner_color: null }), { kind: "sold", position: "straight", color: "sapin" });
  assert.equal(bannerOf({ transaction: "rent", status_banner: "sold" }), null, "combinaison incoherente ignoree");
});

test("Vendu et Loue apres les disponibles, ordre des autres inchange", () => {
  const list = [
    { id: "a", transaction: "sale", status_banner: "sold" },
    { id: "b", transaction: "sale" },
    { id: "c", transaction: "sale", status_banner: "under_compromise" },
    { id: "d", transaction: "rent", status_banner: "rented" },
    { id: "e", transaction: "rent" },
  ];
  assert.deepEqual(availableFirst(list).map((p) => p.id), ["b", "c", "e", "a", "d"]);
  assert.equal(isClosed(list[2]), false, "sous compromis reste disponible");
});

test("angles de la diagonale : 4:3 et 16:9", () => {
  assert.equal(DIAGONAL_ANGLE.card, Math.round((Math.atan(3 / 4) * 180) / Math.PI * 100) / 100);
  assert.equal(DIAGONAL_ANGLE.gallery, Math.round((Math.atan(9 / 16) * 180) / Math.PI * 100) / 100);
});

test("donnees structurees : Vendu ou Loue = plus disponible, sans prix", () => {
  const base = { name: "x", description: "y", url: "https://mapaproperty.lu/fr/biens/x", locale: "fr", price: 500000, transaction: "sale" };
  const open = realEstateListing(base) as { offers: { availability: string; price?: number } };
  const closed = realEstateListing({ ...base, available: false }) as { offers: { availability: string; price?: number } };
  assert.equal(open.offers.availability, "https://schema.org/InStock");
  assert.equal(closed.offers.availability, "https://schema.org/SoldOut");
  assert.equal(closed.offers.price, undefined);
});

test("textes FR, EN, DE exacts", () => {
  const m = (l: string) => JSON.parse(read(`messages/${l}.json`)).status_banner;
  const fr = m("fr"), en = m("en"), de = m("de");
  assert.deepEqual([fr.under_compromise_main, fr.under_compromise_signature, fr.sold_main, fr.sold_signature, fr.rented_main, fr.rented_signature], ["SOUS COMPROMIS", "MAPA PROPERTY", "VENDU", "PAR MAPA PROPERTY", "LOUÉ", "PAR MAPA PROPERTY"]);
  assert.deepEqual([en.under_compromise_main, en.under_compromise_signature, en.sold_main, en.sold_signature, en.rented_main, en.rented_signature], ["UNDER OFFER", "MAPA PROPERTY", "SOLD", "BY MAPA PROPERTY", "LET", "BY MAPA PROPERTY"]);
  assert.deepEqual([de.under_compromise_main, de.under_compromise_signature, de.sold_main, de.sold_signature, de.rented_main, de.rented_signature], ["RESERVIERT", "MAPA PROPERTY", "VERKAUFT", "DURCH MAPA PROPERTY", "VERMIETET", "DURCH MAPA PROPERTY"]);
  assert.deepEqual([fr.sold_price, fr.rented_price, en.sold_price, en.rented_price, de.sold_price, de.rented_price], ["Vendu par MAPA Property", "Loué par MAPA Property", "Sold by MAPA Property", "Let by MAPA Property", "Verkauft durch MAPA Property", "Vermietet durch MAPA Property"]);
});

test("composant unique : carte, fiche (premiere photo), accueil ; etiquette masquee", () => {
  const card = read("components/property/PropertyCard.tsx");
  const gallery = read("components/property/PropertyGallery.tsx");
  const home = read("components/home/FeaturedCarousel.tsx");
  assert.ok(card.includes("<StatusBanner banner={banner} variant=\"card\" />") && card.includes("{!banner && (() => {"));
  assert.ok(gallery.includes('banner && active === 0 && current.type === "image" && <StatusBanner'));
  assert.ok(home.includes("!isOffmarket && !banner &&"));
  const sb = read("components/property/StatusBanner.tsx");
  assert.ok(sb.includes('letterSpacing: "0.42em"') && sb.includes('letterSpacing: "0.5em"') && sb.includes("all-small-caps"));
  assert.ok(sb.includes("pointer-events-none") && sb.includes("aria-label") && sb.includes("whitespace-nowrap") && sb.includes("overflow-hidden"));
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(sb), "aucune couleur en dur dans le composant");
});

test("SQL 35 : trois colonnes, contraintes, aucun droit modifie", () => {
  const sql = read("supabase/sql/35_bandeaux_biens.sql");
  for (const s of ["ADD COLUMN IF NOT EXISTS status_banner text", "DEFAULT 'straight'", "DEFAULT 'sapin'", "('under_compromise', 'sold', 'rented')", "('straight', 'diagonal')", "('sapin', 'cuivre', 'creme', 'blanc')"]) assert.ok(sql.includes(s), s);
  assert.ok(!/\b(GRANT|REVOKE|POLICY|ROW LEVEL)\b/i.test(sql.replace(/^--.*$/gm, "")), "aucune modification des droits");
});

console.log(`${pass} PASS, 0 FAIL`);
