// Adresses de fiches reconnues par le proxy (oct. 2026, quotas Vercel), sans reseau.
// Lancement : node --import tsx scripts/seo/test-property-lookup.mts
import { strict as assert } from "node:assert";
import { matchPropertySegment, type PropertyPathsByLang } from "../../lib/published-property-keys";

let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

const apimo: PropertyPathsByLang = { fr: "/biens/appartement-duplex-2-chambres-steinfort-86388715", en: "/biens/duplex-apartment-2-bedrooms-steinfort-86388715", de: "/biens/duplex-wohnung-2-zimmer-steinfort-86388715" };
const admin: PropertyPathsByLang = { fr: "/biens/maison-4-chambres-mamer-1a2b3c4d", en: "/biens/house-4-bedrooms-mamer-1a2b3c4d", de: "/biens/haus-4-zimmer-mamer-1a2b3c4d" };
const map = new Map<string, PropertyPathsByLang>([
  ["86388715", apimo],
  ["villa-mamer-1a2b3c4d", admin],
  ["appartement-duplex-2-chambres-steinfort-86388715", apimo],
  ["maison-4-chambres-mamer-1a2b3c4d", admin],
]);
const slugs = ["86388715", "villa-mamer-1a2b3c4d"];
const m = (s: string) => matchPropertySegment(map, slugs, s);

test("adresse actuelle et slug : cle exacte", () => {
  assert.equal(m("appartement-duplex-2-chambres-steinfort-86388715"), apimo);
  assert.equal(m("86388715"), apimo);
});

test("ancienne adresse lisible ou majuscules : retrouvee par la reference (301, jamais 404)", () => {
  assert.equal(m("appartement-3-chambres-hagen-86388715"), apimo);
  assert.equal(m("APPARTEMENT-DUPLEX-2-CHAMBRES-STEINFORT-86388715"), apimo);
  assert.equal(m("maison-3-chambres-strassen-1A2B3C4D"), admin);
  // UUID en majuscules.
  const byId = new Map([["0f8c2d4e-1a2b-4c3d-9e8f-001122334455", admin]]);
  assert.equal(matchPropertySegment(byId, [], "0F8C2D4E-1A2B-4C3D-9E8F-001122334455"), admin);
});

test("reference inconnue ou ambigue : inconnue", () => {
  assert.equal(m("appartement-steinfort-99999999"), undefined);
  assert.equal(m("page-sans-reference"), undefined);
  const twice = ["a-1a2b3c4d", "b-1a2b3c4d"];
  assert.equal(matchPropertySegment(new Map([["a-1a2b3c4d", admin], ["b-1a2b3c4d", apimo]]), twice, "x-1a2b3c4d"), undefined);
});

console.log(`${pass} PASS, 0 FAIL`);
