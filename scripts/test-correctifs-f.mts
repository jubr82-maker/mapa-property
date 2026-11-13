// Petits correctifs (nov. 2026, audit SEO, partie F), sans reseau.
// Lancement : node --import tsx scripts/test-correctifs-f.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

test("F1 : exemples grises neutres, aucun nom de personne", () => {
  const exp = { fr: ["Prénom", "Nom"], en: ["First name", "Last name"], de: ["Vorname", "Nachname"] } as const;
  for (const l of ["fr", "en", "de"] as const) {
    const m = JSON.parse(read(`messages/${l}.json`));
    assert.deepEqual([m.estimate_form.contact_first_name_placeholder, m.estimate_form.contact_last_name_placeholder], exp[l]);
    const walk = (o: unknown, p: string): void => {
      if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) walk(v, `${p}.${k}`);
      else if (typeof o === "string" && /placeholder|_ph$/i.test(p) && !p.includes(".admin_")) assert.ok(!/julien|brebion/i.test(o), `${l}${p}`);
    };
    walk(m, "");
  }
});
test("F2 : bulle d'Elena masquee des qu'elle recouvrirait un bouton", () => {
  const b = read("components/chatbot/ChatbotBubble.tsx");
  assert.ok(b.includes("useBubbleClearance(bubbleRef, !open)") && b.includes("open || clearForButton"));
  const c = read("lib/ui/bubble-clearance.ts");
  assert.ok(c.includes('"scroll"') && c.includes("MutationObserver") && c.includes("button"));
});
test("F3 : bien Vendu ou Loue, ni simulateur ni prix dans la description Google", () => {
  const p = read("app/[locale]/biens/[slug]/page.tsx");
  assert.ok(p.includes('property.transaction !== "rent" && !closed ?'));
  assert.ok(p.includes("price: null } : listingColumnsOf(property)") && p.includes("withoutPrices(rawDescription)"));
});
test("F5 : serveur de test reel sur 127.0.0.1 si permis, sinon en memoire", () => {
  const s = read("tests/seo/in-process-server.ts");
  assert.ok(s.includes('server.listen(0, "127.0.0.1"') && s.includes("SEO_IN_MEMORY"));
});
console.log(`${pass} PASS, 0 FAIL`);
