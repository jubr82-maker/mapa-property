// Donnees de l'agence pour Google et les IA (oct. 2026), sans reseau.
// Lancement : node --import tsx scripts/seo/test-agency-data.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { realEstateAgent } from "../../lib/seo";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");

const [fr, en, de] = ["fr", "en", "de"].map((l) => realEstateAgent(l) as Record<string, unknown>);
// Creation de MAPA Property : janvier 2023 (la societe date d'avril 2020).
assert.equal(fr.foundingDate, "2023-01");
// Memes faits dans les trois langues (seule la description est traduite).
const facts = (o: Record<string, unknown>) => JSON.stringify({ ...o, description: undefined });
assert.equal(facts(en), facts(fr));
assert.equal(facts(de), facts(fr));
// Aucune coordonnee ni valeur absente du site (telephone, horaires, position).
for (const k of ["telephone", "email", "openingHoursSpecification", "geo"]) assert.ok(!(k in fr), k);
// Fiche Google Business Profile (oct. 2026) : carte et identifiants, une
// seule fois dans le code, profils existants conserves.
const MAP = "https://www.google.com/maps?cid=3582051223520001281";
const KG = "https://www.google.com/search?kgmid=/g/11m5ysphb_";
assert.equal(fr.hasMap, MAP);
assert.deepEqual(fr.sameAs, ["https://www.linkedin.com/showcase/mapa-property/", "https://www.instagram.com/mapa_property", "https://www.facebook.com/people/MAPA-Property/61559121213209/", MAP, KG]);
const src = read("lib/seo.ts");
assert.equal(src.split("3582051223520001281").length - 1, 2, "CID : constante et commentaire seulement");
assert.equal(src.split(MAP).length - 1, 1, "adresse de la carte : une seule constante");
assert.equal(src.split(KG).length - 1, 1, "adresse Knowledge Graph : une seule constante");
// Un seul bloc RealEstateAgent : le layout ; ni la page Agence ni les
// mentions legales n'en publient un second.
assert.ok(!read("app/[locale]/agence-immobiliere-luxembourg/page.tsx").includes("realEstateAgent("));
const legal = read("app/[locale]/legal/mentions-legales/page.tsx");
assert.ok(!/"@type": "RealEstateAgent"|foundingDate/.test(legal) && legal.includes('"@id": `${LEGAL_SITE_URL}#organization`'));
// Plus aucune creation en 2024 dans les textes, la meta et llms.txt.
for (const l of ["fr", "en", "de"]) {
  const m = JSON.parse(read(`messages/${l}.json`));
  for (const v of [m.about_page.para_1, m.intent_pages.agency.meta_description, m.intent_pages.agency.answer]) assert.ok(!/2024/.test(v) && /2023/.test(v), v);
}
const llms = read("public/llms.txt");
assert.ok(llms.includes("- Création de MAPA Property : janvier 2023") && llms.includes("société créée en avril 2020") && !/Fondation : 2024/.test(llms));
assert.ok(llms.includes("https://mapaproperty.lu/fr/faq") && llms.includes("https://mapaproperty.lu/fr/recherches") && llms.includes("/fr/villes/"));
assert.ok(!/[–—]/.test(llms) && !/\+352|@mapagroup|tel:|mailto:/i.test(llms), "llms.txt : aucun tiret long, aucune coordonnee");
console.log("  PASS donnees de l'agence : creation 2023-01, fiche Google (hasMap, sameAs), identiques en FR, EN, DE, un seul bloc, llms.txt a jour\n\n1 PASS, 0 FAIL");
