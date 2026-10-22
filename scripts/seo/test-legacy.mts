// Anciennes adresses (oct. 2026) : 301 en une seule etape, jamais de boucle.
// Appelle proxy.ts directement (sans serveur). Biens publies lus avec la
// cle publique ; sans reseau, une ancienne fiche mene a la liste des biens.
// Lancement : NODE_USE_ENV_PROXY=1 node --import tsx scripts/seo/test-legacy.mts
import { strict as assert } from "node:assert";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { OLD_LEGAL_SUBPAGES, OLD_SITE_PAGES, V28_PAGES, legacyPropertyId, resolveLegacyPath } from "../../lib/legacy-redirects";

const root = join(import.meta.dirname, "..", "..");
for (const l of existsSync(join(root, ".env.local")) ? readFileSync(join(root, ".env.local"), "utf8").split("\n") : []) {
  const m = l.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const { default: proxy } = await import("../../proxy");
const B = "https://mapaproperty.lu";
let pass = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  await fn();
  pass++;
  console.log(`PASS ${name}`);
};
const run = async (path: string) => {
  const r = (await proxy(new NextRequest(B + path))) as Response;
  const loc = r.headers.get("location");
  return { status: r.status, to: loc ? new URL(loc).pathname + new URL(loc).search : null };
};
// Pages actuelles : dossiers de app/[locale], segments dynamiques ([type]) compris.
const currentPage = (p: string) => {
  const parts = p.split("?")[0].split("/").filter(Boolean).slice(1);
  let dir = join(root, "app", "[locale]");
  for (const seg of parts) {
    if (existsSync(join(dir, seg))) dir = join(dir, seg);
    else {
      const dyn = readdirSync(dir).find((d) => /^\[[^.\]]+\]$/.test(d));
      if (!dyn) return false;
      dir = join(dir, dyn);
    }
  }
  return existsSync(join(dir, "page.tsx"));
};

await test("separateurs et numero final", () => {
  assert.equal(legacyPropertyId("rental office luxembourg 86682133"), "86682133");
  assert.equal(legacyPropertyId("rental%20office%20luxembourg%2086682133"), "86682133");
  assert.equal(legacyPropertyId("rental/office/luxembourg/86682133"), "86682133");
  assert.equal(legacyPropertyId("vente+immeuble+hesperange+investissement-a-hesperange-4-unites-garages+85878623"), "85878623");
  assert.equal(legacyPropertyId("sale house niederkorn semi-detached-house-in-niederkorn"), null);
  assert.equal(legacyPropertyId("%E9%ZZ 86682133"), "86682133");
});

await test("destinations : pages actuelles, jamais une ancienne adresse", () => {
  for (const to of [...Object.values(OLD_SITE_PAGES), ...Object.values(OLD_LEGAL_SUBPAGES)]) {
    for (const l of ["fr", "en", "de"]) {
      const d = `/${l}${to}`;
      assert.equal(resolveLegacyPath(d.split("?")[0]), null, d);
      assert.ok(currentPage(d), `page absente : ${d}`);
    }
  }
  for (const to of Object.values(V28_PAGES)) assert.ok(currentPage(`/fr${to}`), `page absente : /fr${to}`);
  // Aucune cle d'ancienne page n'est une page actuelle (journal : page de
  // renvoi vers /blog, en dernier recours).
  for (const seg of Object.keys(OLD_SITE_PAGES)) if (seg !== "journal") assert.ok(!existsSync(join(root, "app", "[locale]", seg, "page.tsx")), seg);
});

// Adresses signalees en 404 par la Search Console (2026-10-17).
const SEARCH_CONSOLE: [string, string][] = [
  ["/fr/recherche", "/fr/biens"],
  ["/fr/mentions-legales/honoraires", "/fr/legal/honoraires"],
  ["/en/our-agency", "/en/qui-sommes-nous"],
  ["/en/contact-us", "/en/contact"],
  ["/en/property/sale%20house%20niederkorn%20semi-detached-house-in-niederkorn", "/en/biens"],
  ["/en/property/rental%20office%20luxembourg%2086682133", "/en/biens"],
  ["/en/property/rental%20office%20luxembourg%2086682093", "/en/biens"],
  ["/en/property/sale%20building%20hesperange%2085878623", "/en/biens"],
  ["/en/property/rental%20office%20luxembourg%2085640554", "/en/biens"],
  ["/fr/propriete/vente%20maison%20esch-sur-alzette%2086155464", "/fr/biens"],
  ["/fr/propriete/vente%20immeuble%20hesperange%20investissement-a-hesperange-4-unites-garages%2085878623", "/fr/biens"],
  ["/fr/propriete/location%20bureau%20luxembourg%2086682093", "/fr/biens"],
  ["/fr/propriete/location%20bureau%20luxembourg%2086682133", "/fr/biens"],
];

await test("13 adresses de la Search Console : 301 en une etape vers une page finale", async () => {
  for (const [from, to] of SEARCH_CONSOLE) {
    const r = await run(from);
    assert.equal(r.status, 301, from);
    assert.equal(r.to, to, from);
    const again = await run(r.to!);
    assert.equal(again.to, null, `${r.to} redirige encore vers ${again.to}`);
  }
});

await test("bien publie : adresse actuelle de la fiche, meme langue, une etape", async () => {
  const r = await run("/fr/propriete/location+bureau+luxembourg+86816538");
  assert.equal(r.status, 301);
  assert.match(r.to ?? "", /^\/fr\/biens(\/[a-z0-9-]+-86816538)?$/);
  const de = await run("/de/immobilie/verkauf%20haus%20steinfort%2086388715.html");
  assert.match(de.to ?? "", /^\/de\/biens(\/[a-z0-9-]+-86388715)?$/);
  for (const d of [r.to!, de.to!]) assert.equal((await run(d)).to, null, `${d} redirige encore`);
});

await test("parametres : ceux de la destination gardes, ceux d'une ancienne fiche retires", async () => {
  assert.equal((await run("/fr/ventes")).to, "/fr/biens?transaction=sale");
  assert.equal((await run("/en/our-agency?utm_source=x")).to, "/en/qui-sommes-nous?utm_source=x");
  assert.equal((await run("/fr/propriete/vente+maison+esch+86155464?ref=apimo")).to, "/fr/biens");
});

await test("pages actuelles : aucune redirection", async () => {
  for (const p of ["/fr/biens", "/fr/recherches", "/fr/contact", "/en/contact", "/fr/legal/honoraires", "/en/qui-sommes-nous", "/fr/legal/mentions-legales", "/de/biens"]) {
    assert.equal((await run(p)).to, null, p);
  }
});

console.log(`${pass} PASS, 0 FAIL`);
