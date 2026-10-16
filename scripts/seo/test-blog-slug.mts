// Adresses des articles en minuscules (oct. 2026), sans reseau.
// Lancement : node --import tsx scripts/seo/test-blog-slug.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { blogLowercaseRedirect, blogSlugLower } from "../../lib/blog/slug";

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

test("redirection : toute adresse d'article avec majuscules vers sa forme en minuscules, trois langues", () => {
  for (const l of ["fr", "en", "de"]) {
    assert.equal(blogLowercaseRedirect(`/${l}/blog/Immobilier-Steinfort`), `/${l}/blog/immobilier-steinfort`);
    assert.equal(blogLowercaseRedirect(`/${l}/blog/Immobilier-Steinfort/`), `/${l}/blog/immobilier-steinfort`);
    assert.equal(blogLowercaseRedirect(`/${l}/blog/immobilier-steinfort`), null, "deja en minuscules : pas de boucle");
  }
  assert.equal(blogLowercaseRedirect("/fr/blog/%C3%89t%C3%A9-2026"), "/fr/blog/ete-2026");
  for (const p of ["/fr/blog", "/fr/Blog", "/fr/biens/Maison", "/it/blog/Test", "/fr/blog/a/b", "/blog", "/blog/"]) assert.equal(blogLowercaseRedirect(p), null, p);
  assert.equal(blogSlugLower("Immobilier-Steinfort"), "immobilier-steinfort");
});

test("ancienne adresse sans langue : une seule 301 directe vers /fr/blog/<minuscules>, jamais de boucle", () => {
  assert.equal(blogLowercaseRedirect("/blog/Immobilier-Steinfort"), "/fr/blog/immobilier-steinfort");
  assert.equal(blogLowercaseRedirect("/blog/Immobilier-Steinfort/"), "/fr/blog/immobilier-steinfort");
  assert.equal(blogLowercaseRedirect("/blog/immobilier-steinfort"), "/fr/blog/immobilier-steinfort");
  // Une seule etape : la destination n'est jamais redirigee a son tour.
  const samples = ["/blog/Immobilier-Steinfort", "/en/blog/Immobilier-Steinfort", "/de/blog/%C3%89t%C3%A9", "/blog/vendre-luxembourg-2026-prix-estimation"];
  for (const s of samples) {
    const to = blogLowercaseRedirect(s);
    assert.ok(to, s);
    assert.equal(blogLowercaseRedirect(to), null, `${to} ne doit pas rediriger a nouveau`);
  }
  // Adresses deja correctes : jamais redirigees.
  for (const ok of ["/fr/blog/immobilier-steinfort", "/en/blog/vendre-luxembourg-2026-prix-estimation", "/de/blog/off-market-luxembourg-fin-modele-informel"]) assert.equal(blogLowercaseRedirect(ok), null, ok);
});

test("proxy : redirection 301 placee avant les autres traitements des pages publiques", () => {
  const proxy = read("proxy.ts");
  const i = proxy.indexOf("const blogLower = blogLowercaseRedirect(pathname);");
  assert.ok(i > 0 && proxy.includes("return NextResponse.redirect(url, 301);"));
  assert.ok(i < proxy.indexOf("const legacy = resolveLegacyPath(pathname);") && i < proxy.indexOf("return intlMiddleware(request);"));
});

test("lecture : article trouve sans tenir compte des majuscules, adresse renvoyee en minuscules partout", () => {
  const data = read("lib/data.ts");
  const fn = data.slice(data.indexOf("export async function fetchBlogPostBySlug"));
  assert.ok(fn.includes('.ilike("slug", pattern)') && fn.includes("withLowerSlug(post)"));
  assert.ok(!/\.eq\("slug", slug\)/.test(fn));
  assert.equal((data.match(/\.map\(withLowerSlug\)/g) ?? []).length, 2, "liste du blog et derniers articles");
});

test("admin : adresse enregistree en minuscules, sans accents ni espaces", () => {
  const actions = read("app/admin/blog/actions.ts");
  assert.ok(actions.includes('const slug = slugify(String(formData.get("slug") ?? "").trim() || titleFr);'));
  const slugify = actions.slice(actions.indexOf("function slugify"), actions.indexOf("function buildPostPayload"));
  assert.ok(slugify.includes(".toLowerCase()") && slugify.includes('.normalize("NFD")'));
  assert.ok(read("components/admin/BlogPostForm.tsx").includes("onBlur={() => setSlug((v) => slugKey(v))}"));
});

test("sitemap : chaque article publie, revalide toutes les heures et a chaque enregistrement", () => {
  assert.ok(read("app/sitemap.ts").includes("export const revalidate = 3600;"));
  assert.ok(read("lib/revalidate-property.ts").includes('revalidatePath("/sitemap.xml");'));
  assert.ok(read("app/sitemap.ts").includes("fetchAllBlogPosts()"));
});

test("SQL 26 : une seule valeur modifiee, garde-fous, a executer apres la mise en ligne", () => {
  const sql = read("supabase/sql/26_slug_steinfort.sql");
  assert.ok(sql.includes("SET slug = 'immobilier-steinfort'") && sql.includes("(attendu 1). Rien n''a ete modifie."));
  assert.ok(sql.includes("A EXECUTER APRES la mise en ligne du code de l'etape 4"));
  assert.ok(!/DELETE|DROP|blog_posts_steinfort_avant_24b\s+SET/i.test(sql.replace(/^--.*$/gm, "")), "aucune suppression");
  assert.ok(!/[–—]/.test(sql));
});

console.log(`\n${n} PASS, ${failed} FAIL`);
if (failed) process.exit(1);
