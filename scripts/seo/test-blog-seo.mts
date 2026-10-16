// Titres et descriptions Google du blog par langue (oct. 2026), sans reseau.
// Lancement : node --import tsx scripts/seo/test-blog-seo.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { blogSeoMeta } from "../../lib/blog/seo-meta";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let n = 0;
let failed = 0;
function test(name: string, fn: () => void) {
  try {
    fn();
    n++;
    console.log(`  PASS ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL ${name}\n       ${e instanceof Error ? e.message : String(e)}`);
  }
}
const FB = { title: "Blog, MAPA Property", description: "Blog description" };
const long = "Une description francaise volontairement longue ".repeat(6).trim();

test("champs Google de la langue de la page utilises tels quels", () => {
  const post = { seo_title_en: "Selling in Luxembourg in 2026: prices, valuation, mistakes", seo_description_en: "Selling a property.", title_fr: "Vendre", excerpt_fr: "Resume" };
  assert.deepEqual(blogSeoMeta(post, "en", FB), { title: "Selling in Luxembourg in 2026: prices, valuation, mistakes", description: "Selling a property." });
});

test("vides : titre et resume de la MEME langue, jamais le francais pour EN et DE", () => {
  const post = { title_fr: "Titre FR", excerpt_fr: "Resume FR", seo_title_fr: "Titre Google FR", seo_description_fr: "Description FR", title_de: "Titel DE", excerpt_de: "Zusammenfassung DE" };
  assert.deepEqual(blogSeoMeta(post, "de", FB), { title: "Titel DE, MAPA Property", description: "Zusammenfassung DE" });
  const en = blogSeoMeta(post, "en", FB);
  assert.deepEqual(en, FB, "aucun texte francais en anglais");
});

test("jamais de points de suspension ajoutes, texte repris entier", () => {
  const r = blogSeoMeta({ seo_description_fr: long }, "fr", FB);
  assert.equal(r.description, long);
  assert.ok(!r.description.includes("…"));
  const src = read("lib/blog/seo-meta.ts");
  assert.ok(!/metaDescription\(/.test(src));
});

test("page article : meta, og et twitter depuis blogSeoMeta, plus de meta_title francais", () => {
  const page = read("app/[locale]/blog/[slug]/page.tsx");
  const meta = page.slice(page.indexOf("export async function generateMetadata"), page.indexOf("export default"));
  assert.ok(meta.includes("blogSeoMeta(post, locale,") && meta.includes("withSocial(locale, {") && meta.includes("title: { absolute: title },"));
  assert.ok(!/meta_title|meta_description|pickLang/.test(meta));
});

test("SQL 25 : six colonnes, valeurs fournies reprises a l'identique, aucun tiret long", () => {
  const sql = read("supabase/sql/25_seo_blog_langues.sql");
  for (const c of ["seo_title_fr", "seo_title_en", "seo_title_de", "seo_description_fr", "seo_description_en", "seo_description_de"]) assert.ok(sql.includes(`ADD COLUMN IF NOT EXISTS ${c} text`), c);
  const rows = JSON.parse(read("scripts/seo/blog-seo-2026-10.json")) as string[][];
  for (const r of rows) {
    assert.ok(sql.includes(`WHERE lower(slug) = '${r[0]}';`), r[0]);
    for (const v of r.slice(1)) {
      assert.ok(sql.includes(`'${v.replace(/'/g, "''")}'`), v);
      assert.ok(!/[–—…]/.test(v), v);
    }
  }
});

test("formulaire Blog : Titre Google et Description Google par langue, compteurs 60 et 155", () => {
  const form = read("components/admin/BlogPostForm.tsx");
  assert.ok(form.includes('setText("seo_title", lang, v)') && form.includes('setText("seo_description", lang, v)'));
  assert.ok(form.includes("advised={SEO_TITLE_ADVISED}") && form.includes("advised={SEO_DESCRIPTION_ADVISED}"));
  const src = read("lib/blog/seo-meta.ts");
  assert.ok(src.includes("SEO_TITLE_ADVISED = 60") && src.includes("SEO_DESCRIPTION_ADVISED = 155"));
  const actions = read("app/admin/blog/actions.ts");
  for (const l of ["fr", "en", "de"]) for (const f of ["seo_title", "seo_description"]) assert.ok(actions.includes(`${f}_${l}: seoText(formData.get("${f}_${l}")`), `${f}_${l}`);
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${l}.json`)).admin_blog;
    for (const k of ["field_seo_title", "field_seo_description", "seo_counter", "seo_over", "seo_hint"]) assert.ok(m[k] && !/[–—]/.test(m[k]), `${l} ${k}`);
  }
  assert.equal(JSON.parse(read("messages/fr.json")).admin_blog.field_seo_title, "Titre Google ({lang})");
});

console.log(`\n${n} PASS, ${failed} FAIL`);
if (failed) process.exit(1);
