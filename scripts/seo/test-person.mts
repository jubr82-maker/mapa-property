// Entite Person de Julien Brebion dans les donnees structurees (oct. 2026).
// Lancement (apres un build) : node --import tsx scripts/seo/test-person.mts
import { strict as assert } from "node:assert";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { JULIEN_LINKEDIN_URL, JULIEN_PERSON_ID, personJulien, realEstateAgent } from "../../lib/seo";

const root = join(import.meta.dirname, "..", "..");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

type Node = Record<string, unknown>;
/** Tous les objets JSON-LD d'une page HTML (blocs et objets imbriques). */
function ldNodes(html: string): Node[] {
  const out: Node[] = [];
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    const stack: unknown[] = [JSON.parse(m[1])];
    while (stack.length) {
      const x = stack.pop();
      if (Array.isArray(x)) stack.push(...x);
      else if (x && typeof x === "object") {
        out.push(x as Node);
        stack.push(...Object.values(x as Node));
      }
    }
  }
  return out;
}
const typed = (nodes: Node[], t: string) => nodes.filter((n) => n["@type"] === t);

test("entite Person : identifiant, nom, poste, agence, LinkedIn seul, aucune coordonnee", () => {
  const p = personJulien("fr", { image: "/images/julien-brebion-2026-portrait.webp" });
  assert.ok(JULIEN_PERSON_ID.endsWith("/#julien-brebion"));
  assert.equal(p.name, "Julien Brebion");
  assert.equal(p.jobTitle, "Real Estate Director & Exclusive Sourcing Specialist");
  assert.ok(String((p.worksFor as Node)["@id"]).endsWith("#organization"));
  assert.deepEqual(p.sameAs, ["https://www.linkedin.com/in/julien-brebion-re"]);
  assert.equal(JULIEN_LINKEDIN_URL, "https://www.linkedin.com/in/julien-brebion-re");
  assert.ok(p.url.endsWith("/fr/qui-sommes-nous") && personJulien("de").url.endsWith("/de/qui-sommes-nous"));
  assert.ok(String(p.image).endsWith("/images/julien-brebion-2026-portrait.webp"));
  assert.equal("image" in personJulien("en"), false);
  const s = JSON.stringify(p);
  assert.ok(!/telephone|email|address|instagram|facebook|\+352|@/.test(s.replace(/"@(context|type|id)"/g, "")));
  // Agence : reference par identifiant seulement, sameAs inchanges.
  const a = realEstateAgent("fr");
  assert.deepEqual(a.employee, { "@id": JULIEN_PERSON_ID });
  assert.deepEqual(a.founder, { "@id": JULIEN_PERSON_ID });
  assert.ok(!a.sameAs.some((u) => /julien/i.test(u)));
});

const app = join(root, ".next/server/app");
if (existsSync(app)) {
  test("build : Qui sommes-nous (3 langues) = une Person et une agence ; ailleurs aucune Person", () => {
    for (const l of ["fr", "en", "de"]) {
      const nodes = ldNodes(readFileSync(join(app, l, "qui-sommes-nous.html"), "utf8"));
      const persons = typed(nodes, "Person");
      assert.equal(persons.length, 1, `${l} : une Person`);
      assert.equal(typed(nodes, "RealEstateAgent").length, 1, `${l} : une agence`);
      const p = persons[0];
      assert.deepEqual(p.sameAs, [JULIEN_LINKEDIN_URL]);
      assert.ok(String(p.url).endsWith(`/${l}/qui-sommes-nous`));
      assert.ok(String(p.image).endsWith("/images/julien-brebion-2026-portrait.webp"));
      for (const k of ["telephone", "email", "address"]) assert.equal(k in p, false, `${l} ${k}`);
      const agency = typed(nodes, "RealEstateAgent")[0];
      assert.equal((agency.employee as Node)["@id"], p["@id"]);
    }
    for (const f of ["fr.html", "fr/contact.html", "en/villes/mamer.html"]) {
      const nodes = ldNodes(readFileSync(join(app, f), "utf8"));
      assert.equal(typed(nodes, "Person").length, 0, f);
      assert.equal(typed(nodes, "RealEstateAgent").length, 1, f);
    }
  });

  test("build : aucun compte personnel Instagram ou Facebook de Julien", () => {
    const bad = /instagram\.com\/julien_brebion|facebook\.com\/julien\.brebion/i;
    const walk = (d: string): string[] =>
      readdirSync(d).flatMap((f) => {
        const p = join(d, f);
        return statSync(p).isDirectory() ? walk(p) : [p];
      });
    const files = [...walk(join(root, ".next/server")), ...walk(join(root, ".next/static"))].filter((f) => /\.(html|rsc|js|json|meta|body|txt)$/.test(f));
    for (const f of files) assert.ok(!bad.test(readFileSync(f, "utf8")), f);
    for (const d of ["app", "components", "lib", "messages", "public"]) for (const f of walk(join(root, d)).filter((x) => /\.(ts|tsx|json|txt|md)$/.test(x))) assert.ok(!bad.test(readFileSync(f, "utf8")), f);
  });
} else {
  console.log("NON VERIFIE : pas de build (.next absent)");
}

console.log(`${pass} PASS, 0 FAIL`);
