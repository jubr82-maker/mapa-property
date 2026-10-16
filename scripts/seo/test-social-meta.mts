// Garde-fou des balises de partage (oct. 2026), sans reseau : chaque page
// qui definit ses metadonnees passe par withSocial (directement ou via
// buildPageMetadata, seoPageMetadata, intentMetadata,
// offmarketFicheMetadata), sinon elle reprendrait l'Open Graph de l'accueil.
// Preuve sur le rendu : node scripts/seo/check-social.mjs --build | --base.
// Lancement : node --import tsx scripts/seo/test-social-meta.mts
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { ogLocale } from "../../lib/seo-page-meta";

const root = join(import.meta.dirname, "..", "..");
const walk = (d: string, out: string[] = []): string[] => {
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (f === "page.tsx") out.push(p);
  }
  return out;
};
const HELPERS = /withSocial\(|buildPageMetadata\(|seoPageMetadata\(|intentMetadata\(|offmarketFicheMetadata\(/;
const missing: string[] = [];
for (const f of walk(join(root, "app", "[locale]"))) {
  const src = readFileSync(f, "utf8");
  if (!src.includes("export async function generateMetadata")) continue;
  if (/test-scroll/.test(f)) continue;
  if (!HELPERS.test(src)) missing.push(relative(root, f));
}
assert.deepEqual(missing, [], `pages sans balises de partage propres : ${missing.join(", ")}`);
assert.equal(ogLocale("fr"), "fr_LU");
assert.equal(ogLocale("en"), "en_GB");
assert.equal(ogLocale("de"), "de_LU");
const layout = readFileSync(join(root, "app", "[locale]", "layout.tsx"), "utf8");
assert.ok(layout.includes("locale: ogLocale(locale),"));
console.log("  PASS balises de partage : toutes les pages passent par withSocial, og:locale fr_LU / en_GB / de_LU\n\n1 PASS, 0 FAIL");
