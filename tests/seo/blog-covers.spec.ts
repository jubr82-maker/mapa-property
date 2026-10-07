// Couvertures du blog (oct. 2026). Echoue si un article publie liste sur
// /fr/blog, /en/blog ou /de/blog (ou dans l'apercu de l'accueil) est rendu
// sans son image de couverture, si la couverture ne vise pas Supabase
// Storage, ou si l'og:image d'un article ne pointe pas vers sa couverture.
// Les pages sont lues dans le build de production (HTML genere avec les
// articles en base au moment du build).
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const APP = path.join(ROOT, ".next/server/app");
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

function cards(html: string, locale: string) {
  const out: { slug: string; img: string | null }[] = [];
  const re = new RegExp(`<a[^>]*href="/${locale}/blog/([^"/?#]+)"[^>]*>([\\s\\S]*?)</a>`, "g");
  for (const m of html.matchAll(re)) {
    const img = m[2].match(/<img[^>]*data-blog-cover[^>]*>/)?.[0] ?? null;
    out.push({ slug: m[1], img });
  }
  return out;
}

test("chaque article publie liste est rendu avec sa couverture (3 langues, liste et accueil)", () => {
  let checked = 0;
  for (const l of ["fr", "en", "de"]) {
    for (const file of [`${l}/blog.html`, `${l}.html`]) {
      const p = path.join(APP, file);
      if (!fs.existsSync(p)) continue;
      const list = cards(fs.readFileSync(p, "utf8"), l);
      for (const c of list) {
        checked++;
        expect(c.img, `${file} : article ${c.slug} sans image de couverture`).not.toBeNull();
        const src = decode(c.img!.match(/\ssrc="([^"]+)"/)?.[1] ?? "");
        expect(decodeURIComponent(src), `${file} : ${c.slug}`).toMatch(/dutfkblygfvhhwpzxmfz\.supabase\.co\/storage\/v1\/object\/public\/blog-covers\//);
      }
    }
  }
  if (!checked) console.log("NON VERIFIE : aucun article dans le build (base injoignable au moment du build)");
});

test("repli : couverture rechargee directement si l'optimiseur la refuse ; og:image = couverture", () => {
  const cover = fs.readFileSync(path.join(ROOT, "components/blog/CoverImage.tsx"), "utf8");
  expect(cover).toMatch(/onError=\{\(\) => \{\s*if \(!direct\) setDirect\(true\);/);
  expect(cover).toContain("unoptimized={direct}");
  for (const f of ["app/[locale]/blog/page.tsx", "components/home/BlogTeaser.tsx", "components/blog/BookletReader.tsx"]) {
    expect(fs.readFileSync(path.join(ROOT, f), "utf8"), f).toContain("<CoverImage");
  }
  const article = fs.readFileSync(path.join(ROOT, "app/[locale]/blog/[slug]/page.tsx"), "utf8");
  expect(article).toContain("const shareImage = displayableImageSrc(post.cover_image) ?? siteShareImage();");
  expect(article).toMatch(/images: \[\{ url: shareImage/);
  // Politique de securite et optimiseur : Supabase Storage public autorise.
  const config = fs.readFileSync(path.join(ROOT, "next.config.ts"), "utf8");
  expect(config).toContain("img-src 'self' data: https: blob:");
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, ".next/images-manifest.json"), "utf8"));
  expect(JSON.stringify(manifest.images.remotePatterns)).toContain("dutfkblygfvhhwpzxmfz");
});
