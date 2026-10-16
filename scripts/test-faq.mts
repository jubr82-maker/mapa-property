// Tests du module Questions frequentes (oct. 2026), sans reseau.
// Lancement : node --import tsx scripts/test-faq.mts
import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FAQ_FIXED_KEYS, blogFaqKey, cityFaqKey, faqPagePaths, isFaqPageKey, slugKey } from "../lib/faq/keys";

const root = join(import.meta.dirname, "..");
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

test("page_key : valeurs fermees, villes et articles en minuscules sans accents", () => {
  for (const k of FAQ_FIXED_KEYS) assert.ok(isFaqPageKey(k), k);
  assert.ok(isFaqPageKey("ville:luxembourg-ville") && isFaqPageKey("blog:immobilier-steinfort"));
  for (const bad of ["", "Agence", "contact", "ville:", "blog:Immobilier-Steinfort", "blog:a b", "ville:x;drop", "autre:x"]) assert.ok(!isFaqPageKey(bad), bad);
  assert.equal(blogFaqKey("Immobilier-Steinfort"), "blog:immobilier-steinfort");
  assert.equal(slugKey("Différdange Été"), "differdange-ete");
  assert.equal(cityFaqKey("Esch-sur-Alzette"), "ville:esch-sur-alzette");
  assert.deepEqual(faqPagePaths("blog:immobilier-steinfort"), ["/blog/immobilier-steinfort"]);
  assert.deepEqual(faqPagePaths("mandat-recherche"), ["/mandats/recherche"]);
});

test("SQL 23 : table, contrainte identique a la liste du code, lecture publique des lignes publiees seulement, ecriture admin", () => {
  const sql = read("supabase/sql/23_faq.sql");
  for (const k of FAQ_FIXED_KEYS) assert.ok(sql.includes(`'${k}'`), k);
  assert.ok(sql.includes("^(ville|blog):[a-z0-9]+(-[a-z0-9]+)*$"));
  assert.ok(/CREATE POLICY "faqs_public_read"[\s\S]*?FOR SELECT[\s\S]*?USING \(published\);/.test(sql));
  assert.ok(/CREATE POLICY "faqs_admin_all"[\s\S]*?USING \(public\.is_mapa_admin\(\)\)[\s\S]*?WITH CHECK \(public\.is_mapa_admin\(\)\);/.test(sql));
  assert.ok(sql.includes("REVOKE ALL ON public.faqs FROM anon;") && sql.includes("GRANT SELECT ON public.faqs TO anon;"));
  for (const c of ["id uuid", "page_key text", "question_fr", "answer_fr", "question_en", "answer_en", "question_de", "answer_de", "position integer", "published boolean", "created_at", "updated_at"]) assert.ok(sql.includes(c), c);
});

test("SQL 24 : questions d'origine reprises mot pour mot (FR, EN, DE), Steinfort extrait avec garde-fous", () => {
  const sql = read("supabase/sql/24_faq_reprise.sql");
  const sets: [string, string, number][] = [["agency", "agence", 5], ["sell", "vendre", 4], ["buy", "acheter", 4], ["rent", "louer", 4], ["search", "mandat-recherche", 4], ["broker", "broker-international", 4]];
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${l}.json`)).intent_pages;
    for (const [intent, key, count] of sets) {
      for (let i = 1; i <= count; i++) {
        for (const f of ["faq_q", "faq_a"]) {
          const v = String(m[intent][`${f}${i}`]).replace(/'/g, "''");
          assert.ok(sql.includes(`'${v}'`), `${l} ${key} ${f}${i}`);
        }
      }
    }
  }
  assert.ok(!/blog_posts|steinfort/i.test(sql), "24 ne touche a aucun article");
  assert.ok(/BEGIN;[\s\S]*COMMIT;/.test(sql));
  const b = read("supabase/sql/24b_faq_steinfort.sql");
  assert.ok(b.includes("'blog:immobilier-steinfort'") && b.includes("(attendu 4). Rien n''a ete modifie."));
  assert.ok(b.includes("real estate director") && b.includes("(sources?|quellen)"), "fin d'article jamais prise dans une reponse");
  assert.ok(/BEGIN;[\s\S]*COMMIT;/.test(b) && b.includes("AU\n-- MOMENT DU DEPLOIEMENT"));
});

test("site : une section par page, une seule FAQPage, rien sans question publiee", () => {
  const section = read("components/faq/FaqSection.tsx");
  assert.ok(section.includes("if (items.length === 0) return null;"));
  assert.equal((section.match(/faqPage\(/g) ?? []).length, 1);
  const intent = read("components/seo/IntentSections.tsx");
  assert.ok(intent.includes("const faq = faqKey ? [] : await intentFaq(locale, intent);") && intent.includes("...(faq.length ? [faqPage(faq)] : [])"));
  const pages: [string, string][] = [
    ["app/[locale]/agence-immobiliere-luxembourg/page.tsx", 'faqKey="agence"'],
    ["app/[locale]/services/vendre/page.tsx", 'faqKey="vendre"'],
    ["app/[locale]/services/acheter/page.tsx", 'faqKey="acheter"'],
    ["app/[locale]/services/louer/page.tsx", 'faqKey="louer"'],
    ["app/[locale]/mandats/[type]/page.tsx", 'faqKey="mandat-recherche"'],
    ["app/[locale]/services/broker-international/page.tsx", 'faqKey="broker-international"'],
    ["app/[locale]/services/estimer/page.tsx", 'pageKey="estimer"'],
    ["app/[locale]/off-market/page.tsx", 'pageKey="off-market"'],
    ["app/[locale]/villes/[ville]/page.tsx", "pageKey={cityFaqKey(city.slug)}"],
    ["app/[locale]/blog/[slug]/page.tsx", "pageKey={blogFaqKey(post.slug)}"],
    ["app/[locale]/faq/page.tsx", 'pageKey="faq-generale"'],
  ];
  for (const [f, needle] of pages) assert.ok(read(f).includes(needle), f);
  // Accueil : valeur disponible, aucune section affichee (choix de Julien).
  assert.ok(!/FaqSection|faqKey/.test(read("app/[locale]/page.tsx")));
  assert.ok(!/<IntentSections locale=\{locale\} intent="[a-z]+" \/>/.test(pages.map(([f]) => read(f)).join("\n")), "plus aucune FAQ ecrite en dur");
  const data = read("lib/faq/data.ts");
  assert.ok(data.includes('.eq("published", true)') && data.includes(".filter((r) => r.question && r.answer)"), "jamais de repli sur une autre langue");
});

test("page /faq : sitemap, pied de page, fil d'Ariane, textes dans les trois langues sans tiret long", () => {
  assert.ok(read("app/sitemap.ts").includes('"/faq",'));
  assert.ok(read("components/layout/Footer.tsx").includes('{ href: "/faq", key: "faq" }'));
  assert.ok(read("lib/breadcrumbs.ts").includes('"/faq": "faq"'));
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${l}.json`));
    for (const ns of ["faq", "admin_faq"]) for (const [k, v] of Object.entries(m[ns] as Record<string, string>)) assert.ok(!/[–—]/.test(v), `${l} ${ns}.${k}`);
    assert.ok(m.nav.faq && m.breadcrumb.faq && m.admin_nav.faq);
    assert.ok(m.faq.meta_description.length <= 155);
  }
});

test("admin : menu Gestion, garde admin sur chaque action, tirets longs refuses, pages admin gardees", () => {
  assert.ok(read("components/admin/admin-nav.ts").includes('{ href: "/admin/faq", key: "faq"'));
  const actions = read("app/admin/faq/actions.ts");
  assert.ok(actions.startsWith('"use server";'));
  for (const fn of ["saveFaq", "deleteFaq", "moveFaq"]) {
    const body = actions.slice(actions.indexOf(`export async function ${fn}`));
    assert.ok(/^[^\n]*\n  const admin = await requireAdmin\(\);\n  if \(!admin\.ok\) return sessionFailure\(\);/.test(body), fn);
  }
  assert.ok(actions.includes("const DASHES = /[–—]/;") && actions.includes("isFaqPageKey(input?.page_key)"));
  for (const f of ["app/admin/faq/page.tsx", "app/admin/faq/new/page.tsx", "app/admin/faq/[id]/page.tsx"]) assert.ok(read(f).includes("await requireAdminPage();"), f);
  assert.ok(read("app/admin/blog/[id]/edit/page.tsx").includes("<BlogFaqBlock pageKey={faqKey} items={faqItems} />"));
  assert.ok(read("app/admin/blog/actions.ts").includes('.update({ page_key: blogFaqKey(payload.slug) }).eq("page_key", blogFaqKey(oldSlug))'), "les questions suivent l'adresse de l'article");
  assert.ok(existsSync(join(root, "components/admin/faq/FaqForm.tsx")));
});

console.log(`\n${n} PASS, ${failed} FAIL`);
if (failed) process.exit(1);
