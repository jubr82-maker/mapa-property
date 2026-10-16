// Fin d'article standard (oct. 2026, etape 8), sans reseau.
// Lancement : node --import tsx scripts/seo/test-ending.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { applyStandardEnding, type StandardEnding } from "../../lib/blog/standard-ending";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const E = {
  heading_fr: "La position de Mapa Property", heading_en: "Mapa Property's position", heading_de: "Die Position von Mapa Property",
  text_commune_fr: "<p>Nous connaissons {commune} rue par rue.</p>", text_general_fr: "<p>Nous connaissons le marché.</p>",
  text_commune_en: "<p>C</p>", text_general_en: "<p>G</p>", text_commune_de: "<p>C</p>", text_general_de: "<p>G</p>",
  signature_fr: "Julien Brebion, Real Estate Director, Mapa Property", signature_en: "Julien Brebion, Real Estate Director, Mapa Property", signature_de: "Julien Brebion, Real Estate Director, Mapa Property",
} as StandardEnding;
const body = "<p>Texte.</p><h2>Conclusion</h2><p>Fin.</p><blockquote><p>Citation.</p></blockquote><p><strong>Sources :</strong> STATEC.</p>";

// Rubrique avant la conclusion, signature avant les sources, citation et sources intactes.
const out = applyStandardEnding(body, E, { lang: "fr", show: true, commune: "Steinfort" });
assert.ok(out.indexOf("<h2>La position de Mapa Property</h2>") < out.indexOf("<h2>Conclusion</h2>"));
assert.ok(out.includes("<p>Nous connaissons Steinfort rue par rue.</p>"));
assert.ok(out.indexOf("<blockquote>") < out.indexOf("<p><em>Julien Brebion, Real Estate Director, Mapa Property</em></p>") && out.indexOf("<p><em>Julien") < out.indexOf("<p><strong>Sources"));
assert.ok(out.includes("<blockquote><p>Citation.</p></blockquote>") && out.includes("<p><strong>Sources :</strong> STATEC.</p>"));
// Sans commune : version generale ; reglage desactive : signature seule.
assert.ok(applyStandardEnding(body, E, { lang: "fr", show: true }).includes("<p>Nous connaissons le marché.</p>"));
const off = applyStandardEnding(body, E, { lang: "fr", show: false });
assert.ok(!off.includes("La position de Mapa Property") && off.includes("<p><em>Julien Brebion"));
// Jamais en double : rubrique propre du meme titre, ou signature encore ecrite a la main.
const own = "<h2>Mapa Property's position</h2><p>Own.</p><h2>Conclusion</h2><p><em>Julien Brebion — Real Estate Director, Mapa Property</em></p>";
const r = applyStandardEnding(own, E, { lang: "en", show: true });
assert.equal((r.match(/position<\/h2>/g) ?? []).length, 1);
assert.equal((r.match(/Julien Brebion/g) ?? []).length, 1);
// Pas de fin standard (table absente) : texte inchange.
assert.equal(applyStandardEnding(body, null, { lang: "fr", show: true }), body);
// Page article : fin appliquee avant le nettoyage du HTML.
assert.ok(read("app/[locale]/blog/[slug]/page.tsx").includes("applyStandardEnding(content, ending, {"));
// SQL : 27 structure et textes de Steinfort sans tiret long ; 28 sauvegarde a part, controles stricts.
const s27 = read("supabase/sql/27_blog_fin_article.sql");
assert.ok(s27.includes("CREATE TABLE IF NOT EXISTS public.blog_standard_ending") && s27.includes("ADD COLUMN IF NOT EXISTS commune text") && s27.includes("ADD COLUMN IF NOT EXISTS show_standard_ending boolean NOT NULL DEFAULT true"));
assert.ok(s27.includes("ON CONFLICT (id) DO NOTHING") && !/[–—]/.test(s27));
assert.ok(s27.includes("<a href=\"/fr/services/estimer\"") && s27.includes("<a href=\"/en/services/estimer\"") && s27.includes("<a href=\"/de/services/estimer\""));
const s28 = read("supabase/sql/28_migration_fin_articles.sql");
const firstCommit = s28.indexOf("COMMIT;");
assert.ok(s28.indexOf("CREATE TABLE IF NOT EXISTS public.blog_posts_avant_28") < firstCommit && s28.indexOf("DO $fin$") > firstCommit, "sauvegarde validee avant la migration");
assert.ok(s28.includes("ne correspond pas exactement a la fin standard. Rien n''a ete modifie.") && s28.includes("(attendu 1). Rien n''a ete modifie."));
assert.ok(s28.includes("fin_du_texte_avant") && s28.includes("fin_du_texte_apres"));
// Admin : action gardee, page gardee, tirets refuses.
const act = read("app/admin/blog/ending-actions.ts");
assert.ok(act.startsWith('"use server";') && /export async function saveStandardEnding[^\n]*\n  const admin = await requireAdmin\(\);\n  if \(!admin\.ok\) return sessionFailure\(\);/.test(act) && act.includes("const DASHES = /[–—]/;"));
assert.ok(read("app/admin/blog/fin-standard/page.tsx").includes("await requireAdminPage();"));
console.log("  PASS fin d'article standard : place, commune, reglage, jamais en double, SQL 27 et 28, admin\n\n1 PASS, 0 FAIL");
