// Recherche (nov. 2026, partie C3), sans reseau : analyseur unique
// (lib/search/parse-query.ts) et regles d'affichage (lib/search/engine.ts).
// Lancement : node --import tsx scripts/test-search.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseQuery } from "../lib/search/parse-query";
import { criteriaFromParsed, runSearch, type SearchableProperty } from "../lib/search/engine";
import { searchFromParams } from "../lib/search/url";
import { ZONES } from "../lib/search/zones";

let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};
const places = (q: string) => parseQuery(q).places.map((p) => `${p.kind}:${p.name}`);

// ------------------------------------------------------------ analyseur
test("Steinfort : la commune", () => assert.deepEqual(places("Steinfort"), ["lu-commune:Steinfort"]));
test("steinfor : faute toleree", () => assert.deepEqual(places("steinfor"), ["lu-commune:Steinfort"]));
test("8410 : code postal vers sa localite", () => assert.deepEqual(places("8410"), ["lu-commune:Steinfort"]));
test("Hagen : localite de Steinfort", () => {
  const p = parseQuery("Hagen").places;
  assert.equal(p.length, 1);
  assert.equal(p[0].kind, "lu-locality");
  assert.equal(p[0].commune, "Steinfort");
});
test("Esch/Alzette : barre oblique", () => assert.deepEqual(places("Esch/Alzette"), ["lu-commune:Esch-sur-Alzette"]));
test("Belair : quartier de la Ville", () => assert.deepEqual(places("Belair"), ["lu-quartier:Belair"]));
test("Luxembourg seul : le pays", () => assert.deepEqual(places("Luxembourg"), ["lu-country:Luxembourg"]));
test("appartement de luxe : jamais le Luxembourg", () => {
  const r = parseQuery("appartement de luxe");
  assert.deepEqual(r.places, []);
  assert.deepEqual(r.types, ["appartement"]);
  assert.equal(r.luxury, true);
  for (const w of ["luxe", "luxueux", "luxury", "luxueuse villa"]) assert.deepEqual(parseQuery(w).places, [], w);
});
test("appartement : type seul, aucun lieu", () => {
  const r = parseQuery("appartement");
  assert.deepEqual(r.types, ["appartement"]);
  assert.deepEqual(r.places, []);
});
test("maison 3 chambres Steinfort ou Mamer max 900k", () => {
  const r = parseQuery("maison 3 chambres Steinfort ou Mamer max 900k");
  assert.deepEqual(r.places.map((p) => p.name), ["Steinfort", "Mamer"]);
  assert.deepEqual(r.types, ["maison"]);
  assert.equal(r.bedroomsMin, 3);
  assert.equal(r.budgetMax, 900000);
});
test("louer appartement Strassen 2000 € par mois", () => {
  const r = parseQuery("louer appartement Strassen 2000 € par mois");
  assert.equal(r.transaction, "rent");
  assert.deepEqual(r.types, ["appartement"]);
  assert.deepEqual(r.places.map((p) => p.name), ["Strassen"]);
  assert.equal(r.budgetMax, 2000);
});
test("pres de Mamer : proximite", () => {
  const r = parseQuery("près de Mamer");
  assert.equal(r.near, true);
  assert.deepEqual(r.places.map((p) => p.name), ["Mamer"]);
});
test("dans le sud : zone", () => assert.deepEqual(parseQuery("dans le sud").zones, ["sud"]));
test("Dubai : ville etrangere", () => assert.deepEqual(parseQuery("Dubaï").places.map((p) => [p.kind, p.country]), [["foreign-city", "AE"]]));
test("villa Cannes", () => {
  const r = parseQuery("villa Cannes");
  assert.deepEqual(r.types, ["villa"]);
  assert.deepEqual(r.places.map((p) => [p.kind, p.name, p.country]), [["foreign-city", "Cannes", "FR"]]);
});
test("Haus mieten Bertrange", () => {
  const r = parseQuery("Haus mieten Bertrange");
  assert.deepEqual(r.types, ["maison"]);
  assert.equal(r.transaction, "rent");
  assert.deepEqual(r.places.map((p) => p.name), ["Bertrange"]);
});
test("flat Kirchberg 2 bedrooms", () => {
  const r = parseQuery("flat Kirchberg 2 bedrooms");
  assert.deepEqual(r.types, ["appartement"]);
  assert.deepEqual(r.places.map((p) => `${p.kind}:${p.name}`), ["lu-quartier:Kirchberg"]);
  assert.equal(r.bedroomsMin, 2);
});
test("joli truc : incompris", () => {
  const r = parseQuery("joli truc");
  assert.equal(r.understood, false);
  assert.deepEqual(r.places, []);
});
test("budgets : formats FR, EN, DE", () => {
  const b = (q: string) => [parseQuery(q).budgetMin, parseQuery(q).budgetMax];
  assert.deepEqual(b("800k"), [null, 800000]);
  assert.deepEqual(b("800 000"), [null, 800000]);
  assert.deepEqual(b("1,2 million"), [null, 1200000]);
  assert.deepEqual(b("1.2M"), [null, 1200000]);
  assert.deepEqual(b("max 900 000"), [null, 900000]);
  assert.deepEqual(b("moins de 1M"), [null, 1000000]);
  assert.deepEqual(b("entre 600 et 800k"), [600000, 800000]);
  assert.deepEqual(b("900,000 €"), [null, 900000]);
});
test("chambres et surface : FR, EN, DE", () => {
  assert.equal(parseQuery("3 ch").bedroomsMin, 3);
  assert.equal(parseQuery("3 Schlafzimmer").bedroomsMin, 3);
  assert.equal(parseQuery("2-bedroom").bedroomsMin, 2);
  assert.equal(parseQuery("100 m²").surfaceMin, 100);
  assert.equal(parseQuery("100m2").surfaceMin, 100);
});
test("equipements FR, EN, DE ; garage seul = type", () => {
  assert.deepEqual(parseQuery("maison avec jardin, terrasse et piscine").amenities, ["piscine", "jardin", "terrasse"]);
  assert.deepEqual(parseQuery("Haus mit Garten und Aufzug").amenities, ["jardin", "ascenseur"]);
  assert.deepEqual(parseQuery("flat with lift and garage").amenities.sort(), ["ascenseur", "garage"]);
  assert.deepEqual(parseQuery("garage").types, ["garage"]);
});
test("off-market : renvoi", () => assert.equal(parseQuery("villa off-market").offmarket, true));
test("zones : liste unique demandee", () => {
  assert.deepEqual(ZONES.nord.cantons, ["CLERVAUX", "WILTZ", "VIANDEN", "DIEKIRCH"]);
  assert.deepEqual(ZONES.centre.cantons, ["LUXEMBOURG", "LUXEMBOURG-VILLE", "MERSCH"]);
  assert.deepEqual(ZONES.sud.cantons, ["ESCH-SUR-ALZETTE"]);
  assert.deepEqual(ZONES.ouest.cantons, ["CAPELLEN", "REDANGE"]);
  assert.deepEqual(ZONES.est.cantons, ["ECHTERNACH", "GREVENMACHER", "REMICH"]);
});

// ------------------------------------------------------------ regles
let n = 0;
const P = (city: string, extra: Partial<SearchableProperty> = {}): SearchableProperty => ({
  id: `p${++n}`,
  country: "Luxembourg",
  city,
  transaction: "sale",
  property_type: "appartement",
  price: 700000,
  bedrooms: 2,
  surface: 80,
  ...extra,
});
const pool = [
  P("Steinfort", { id: "steinfort" }),
  P("Hagen", { id: "hagen" }),
  P("Mamer", { id: "mamer", property_type: "maison-individuelle", bedrooms: 3, price: 880000 }),
  P("Capellen", { id: "capellen" }),
  P("Belair", { id: "belair" }),
  P("Luxembourg", { id: "ville" }),
  P("Strassen", { id: "strassen", transaction: "rent", price: 1900 }),
  P("Esch-sur-Alzette", { id: "esch" }),
  P("Cannes", { id: "cannes", country: "France", property_type: "villa", price: 3000000 }),
  P("Paris", { id: "paris", country: "France" }),
  P("Dubai", { id: "dubai", country: "Émirats arabes unis" }),
];
const run = (q: string, choice: null | "LU" | "FR" | "autre" | "tous" = null) => runSearch(pool, criteriaFromParsed(parseQuery(q), { text: q, countryChoice: choice }));
const ids = (l: SearchableProperty[]) => l.map((p) => p.id);

test("regle 2 : commune, localite du meme nom d'abord", () => assert.deepEqual(ids(run("Steinfort").main), ["steinfort", "hagen"]));
test("regle 1 : localite avec biens, seulement les siens", () => assert.deepEqual(ids(run("Hagen").main), ["hagen"]));
test("regle 1 : localite sans bien, message et a proximite", () => {
  const r = run("Kleinbettingen");
  assert.deepEqual(r.main, []);
  assert.equal(r.emptyPlace?.name, "Kleinbettingen");
  assert.deepEqual(ids(r.nearby).slice(0, 2).sort(), ["hagen", "steinfort"], "meme commune d'abord");
  assert.ok(ids(r.nearby).includes("mamer"), "puis meme canton");
});
test("regle 3 : quartier d'abord, puis le reste de la Ville", () => assert.deepEqual(ids(run("Belair").main), ["belair", "ville"]));
test("regle 4 : Luxembourg seul = tout le pays + suggestion", () => {
  const r = run("Luxembourg");
  assert.equal(r.suggestCity, true);
  assert.ok(!ids(r.main).includes("cannes"));
  assert.equal(r.main.length, 8);
});
test("regle 5 : ville etrangere puis reste du pays", () => assert.deepEqual(ids(run("villa Cannes").main), ["cannes"]));
test("regle 5 : Paris puis la France", () => assert.deepEqual(ids(run("Paris").main), ["paris", "cannes"]));
test("regle 6 : pays", () => assert.deepEqual(ids(run("France").main).sort(), ["cannes", "paris"]));
test("regle 7 : aucun lieu, Luxembourg d'abord et question du pays", () => {
  const r = run("appartement");
  assert.equal(r.askCountry, true);
  assert.equal(r.main[0].country, "Luxembourg");
  assert.equal(run("appartement", "FR").askCountry, false);
  assert.deepEqual(ids(run("appartement", "FR").main), ["paris"]);
  assert.equal(run("Steinfort").askCountry, false);
});
test("regle 8 : plusieurs lieux = leur ensemble", () => assert.deepEqual(ids(run("maison 3 chambres Steinfort ou Mamer max 900k").main), ["mamer"]));
test("regle 9 : pres de Mamer, par distance", () => {
  const r = ids(run("près de Mamer").main);
  assert.equal(r[0], "mamer");
  assert.ok(r.includes("capellen") && !r.includes("esch"));
});
test("regle 10 : zone sud", () => assert.deepEqual(ids(run("dans le sud").main), ["esch"]));
test("regle 11 : equipements demandes d'abord", () => {
  const withGarden = [P("Bertrange", { id: "b1" }), P("Bertrange", { id: "b2", garden_surface: 50 })];
  const r = runSearch(withGarden, criteriaFromParsed(parseQuery("Bertrange avec jardin"), { text: "x" }));
  assert.deepEqual(ids(r.main), ["b2", "b1"]);
});
test("regle 12 : demande incomprise, jamais tous les biens", () => {
  const r = run("joli truc");
  assert.equal(r.notUnderstood, true);
  assert.deepEqual(r.main, []);
});
test("regle 13 : un critere relache a la fois, et annonce", () => {
  const r = run("Mamer 5 chambres");
  assert.deepEqual(r.relaxed, ["bedrooms"]);
  assert.deepEqual(ids(r.main), ["mamer", "capellen"], "commune de Mamer : Mamer puis Capellen");
  const b = run("maison Mamer max 800k");
  assert.deepEqual(b.relaxed, ["budget"], "880 000 <= 800 000 x 1,15");
  // Localite sans maison : regle 1 (a proximite, meme canton), rien a relacher.
  const c = run("maison Hagen");
  assert.deepEqual(c.relaxed, []);
  assert.equal(c.emptyPlace?.name, "Hagen");
  assert.deepEqual(ids(c.nearby), ["mamer"]);
  // Rien dans le canton non plus : lieu elargi (commune puis canton), puis tous les biens.
  const d = run("villa Hagen");
  assert.deepEqual(d.relaxed, ["all"], "jamais de page vide");
  assert.ok(d.main.length > 0);
});
test("transaction : sans precision, vente et location, la vente d'abord", () => {
  const r = runSearch([P("Strassen", { id: "loc", transaction: "rent" }), P("Strassen", { id: "vente" })], criteriaFromParsed(parseQuery("Strassen"), { text: "Strassen" }));
  assert.deepEqual(ids(r.main), ["vente", "loc"]);
});
test("regle 16 : champ Ville / quartier de la liste = memes regles", () => {
  const s = searchFromParams({ city: "steinfor" });
  assert.deepEqual(s.criteria.places.map((p) => p.name), ["Steinfort"]);
  assert.deepEqual(ids(runSearch(pool, s.criteria).main), ["steinfort", "hagen"]);
  assert.equal(searchFromParams({ q: "joli truc" }).criteria.notUnderstood, true);
});
test("aucune liste de lieux en dur dans la recherche", () => {
  const root = join(import.meta.dirname, "..");
  for (const f of ["lib/search/parse-query.ts", "lib/search/engine.ts", "lib/search/url.ts", "app/api/search-ia/route.ts"]) {
    const s = readFileSync(join(root, f), "utf8").replace(/^\s*\/\/.*$/gm, "");
    for (const name of ["Steinfort", "Belair", "Kirchberg", "Mamer", "Cannes", "Dubai", "Strassen", "Bertrange"]) assert.ok(!s.includes(name), `${f} : ${name}`);
  }
});

console.log(`${pass} PASS, 0 FAIL`);
