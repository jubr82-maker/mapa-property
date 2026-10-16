// Textes alternatifs des images (oct. 2026, etape 7), sans reseau.
// Lancement : node --import tsx scripts/seo/test-alts.mts
// Controle sur le rendu : node scripts/seo/check-alts.mjs (apres build).
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fillEmptyImageAlts } from "../../lib/blog/image-alts";
import { photoAlt } from "../../lib/listing/listing-seo";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
const seo = (l: string) => JSON.parse(read(`messages/${l}.json`)).listing_model.seo;

// Photos de biens : type, localite, piece ; jamais d'adresse ; allemand avec majuscules.
assert.equal(photoAlt({ index: 2, typeLabel: "Maison", city: "Steinfort", title: "t" }, seo("fr")), "Maison à Steinfort, photo 3");
assert.equal(photoAlt({ index: 0, typeLabel: "Freistehendes Haus", city: "Steinfort", title: "t" }, seo("de")), "Freistehendes Haus in Steinfort, Foto 1");
assert.equal(photoAlt({ index: 0, room: "Séjour", typeLabel: "Maison", city: "Steinfort", title: "t" }, seo("fr")), "Séjour, maison à Steinfort");
assert.equal(photoAlt({ index: 0, custom: "Vue du jardin", typeLabel: "Maison", city: "Steinfort", title: "t" }, seo("fr")), "Vue du jardin", "alt saisi jamais remplace");
const paths = read("lib/listing/property-paths.ts");
assert.ok(paths.includes("export function coverAlts(") && !/address|street|rue/i.test(paths.slice(paths.indexOf("export function coverAlts("))));
// Vignettes de la galerie et cartes : texte genere, plus d'alt vide.
const gallery = read("components/property/PropertyGallery.tsx");
assert.ok(!gallery.includes('alt=""') && gallery.includes("alt={it.alt ?? title}"));
assert.ok(read("components/property/PropertyCard.tsx").includes("alt={property.alts?.[locale] || title}"));
assert.ok(read("components/home/FeaturedCarousel.tsx").includes('alt={item.alts?.[locale] || item.title || ""}'));
// Logo de la fiche imprimable : decoratif (le logo de l'en-tete porte deja "MAPA Property").
assert.ok(read("app/[locale]/biens/[slug]/page.tsx").includes('<img src="/logos/mapa-logo-fond-clair.svg" alt="" aria-hidden="true" />'));
// Images d'article sans alt : titre de l'article, alt existant conserve, echappement.
assert.equal(fillEmptyImageAlts('<p><img src="a.webp" alt=""></p>', 'Vivre "au" Luxembourg'), '<p><img src="a.webp" alt="Vivre &quot;au&quot; Luxembourg"></p>');
assert.equal(fillEmptyImageAlts('<img src="a.webp">', "Titre"), '<img alt="Titre" src="a.webp">');
assert.equal(fillEmptyImageAlts('<img src="a.webp" alt="Vue">', "Titre"), '<img src="a.webp" alt="Vue">');
{
  const page = read("app/[locale]/blog/[slug]/page.tsx");
  assert.ok(/contentHtml=\{fillEmptyImageAlts\(\s*sanitizeArticleHtml\(/.test(page) && page.includes("            title,\n          )}"));
}
console.log("  PASS textes alternatifs : photos de biens, cartes, vignettes, logo imprime, images d'article\n\n1 PASS, 0 FAIL");
