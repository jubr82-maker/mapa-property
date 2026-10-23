// Titres et descriptions Google (oct. 2026, etape 6), sans reseau.
// Lancement : node --import tsx scripts/seo/test-titles.mts
// Controle sur le rendu : node scripts/seo/check-titles.mjs (apres build).
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cities } from "../../lib/cities";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const msgs = (l: string) => JSON.parse(read(`messages/${l}.json`));
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? "");

for (const l of ["fr", "en", "de"] as const) {
  const m = msgs(l);
  const c = m.seo_pages.city;
  for (const city of cities) {
    const lu = city.country === "LU";
    const title = `${fill(lu ? c.title : c.title_intl, { city: city.name[l] })}, MAPA Property`;
    const desc = fill(lu ? c.description : c.description_intl, { city: city.name[l] });
    assert.ok(title.length <= 60, `${l} ${city.slug} titre ${title.length}`);
    assert.ok(desc.length <= 155, `${l} ${city.slug} description ${desc.length}`);
    assert.ok(!/prestige/i.test(title + desc) && !/[–—]/.test(title + desc), `${l} ${city.slug}`);
  }
  assert.ok(m.about_page.meta_title.length <= 60);
  assert.ok(m.intent_pages.agency.meta_description.length <= 155, `${l} agence`);
  assert.equal(m.listing_model.seo.brand, ", MAPA Property");
  assert.ok(!/\| MAPA Property/.test(m.mentions_acquisition.meta_title));
  for (const t of ["exclusif", "semi_exclusif", "simple", "autonome"]) assert.ok(m[`mandate_${t}`].meta_description.length <= 155, `${l} ${t}`);
  assert.ok(m.waitlist_page.meta_description.length <= 155);
}
assert.ok(/agence immobilière/i.test(msgs("fr").about_page.meta_title) && /Luxembourg/.test(msgs("fr").about_page.meta_title));
assert.ok(/real estate agency/i.test(msgs("en").about_page.meta_title) && /Luxembourg/.test(msgs("en").about_page.meta_title));
assert.ok(/Immobilienagentur/.test(msgs("de").about_page.meta_title) && /Luxemburg/.test(msgs("de").about_page.meta_title));
assert.ok(read("app/[locale]/qui-sommes-nous/page.tsx").includes('title: t("meta_title"),'));
// Accueil : un seul H1, qui contient la ligne "Agence immobilière au Luxembourg".
const hero = read("components/home/Hero.tsx");
assert.equal((hero.match(/<h1\b/g) ?? []).length, 1);
const h1 = hero.slice(hero.indexOf("<h1"), hero.indexOf("</h1>"));
assert.ok(h1.includes("{subtitle}") && h1.includes("<SignatureLine />") && h1.includes("{titleLine1}"));
assert.ok(h1.includes('className="flex flex-col items-start gap-3 md:gap-8"'), "memes ecarts que la colonne du hero");
for (const l of ["fr", "en", "de"] as const) {
  const m = msgs(l);
  assert.ok(m.meta.default_title.length <= 60 && /Luxemb/.test(m.meta.default_title), `${l} titre accueil`);
  assert.ok(m.seo_pages.city.h1_prefix && m.seo_pages.city.h1_prefix_intl);
}
// Villes : petite ligne dans le style de la ligne "LUXEMBOURG · SUD".
const ville = read("app/[locale]/villes/[ville]/page.tsx");
assert.ok(ville.includes('font-mono text-[11px] font-normal uppercase leading-normal tracking-[0.3em] text-ink-soft">\n              {fr(`${tc(city.country === "LU" ? "city.h1_prefix" : "city.h1_prefix_intl")} `, "").trim()}'));
console.log("  PASS titres et descriptions : villes, Qui sommes-nous, Agence, mandats, liste d'attente, fiches (virgule)\n\n1 PASS, 0 FAIL");
