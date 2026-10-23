// Traductions envoyees au navigateur, par page (oct. 2026, quotas Vercel),
// sans reseau. Calcule depuis les imports les namespaces lus par les
// composants client de chaque point d'entree et verifie que le layout et
// chaque page transmettent exactement ceux-la (un manque = texte absent).
// Lancement : node --import tsx scripts/seo/test-client-messages.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { clientNamespaces, publicEntries } from "./client-namespaces.mjs";
import { LAYOUT_CLIENT_NAMESPACES, SERVER_ONLY_NAMESPACES } from "../../lib/i18n-client-messages";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const messages = JSON.parse(read("messages/fr.json"));
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};
const declared = (file: string): string[] | null => {
  const m = read(file).match(/export default withPageMessages\(\w+, \[([^\]]*)\]\)/);
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]).sort() : null;
};

test("layout : exactement les namespaces de ses composants client", () => {
  assert.deepEqual([...LAYOUT_CLIENT_NAMESPACES].sort(), clientNamespaces("app/[locale]/layout.tsx"));
  assert.ok(read("app/[locale]/layout.tsx").includes("pickMessages((await getMessages()) as Record<string, unknown>, LAYOUT_CLIENT_NAMESPACES)"));
});

test("chaque page : ses namespaces, ni plus ni moins ; pages sans composant traduit : aucun fournisseur", () => {
  for (const e of publicEntries()) {
    if (e.endsWith("layout.tsx")) continue;
    const need = clientNamespaces(e);
    const has = declared(e);
    if (need.length === 0) assert.equal(has, null, `${e} : fournisseur inutile`);
    else assert.deepEqual(has, need, e);
  }
});

test("namespaces declares : existent, jamais reserves au serveur", () => {
  for (const e of publicEntries()) for (const ns of [...(declared(e) ?? []), ...(e.endsWith("layout.tsx") ? LAYOUT_CLIENT_NAMESPACES : [])]) {
    assert.ok(messages[ns], `${e} : ${ns} absent des messages`);
    assert.ok(!SERVER_ONLY_NAMESPACES.has(ns), `${e} : ${ns} reserve au serveur`);
  }
});

test("pages de villes : aucun namespace en plus du layout", () => {
  assert.deepEqual(clientNamespaces("app/[locale]/villes/[ville]/page.tsx"), []);
});

console.log(`${pass} PASS, 0 FAIL`);
