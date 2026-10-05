// Declinaisons de l'image d'accueil (oct. 2026), servies par le site au lieu de
// r2.dev. Source : public/images/hero/mapa-showcase-poster.jpg (1920 x 1080).
// Meme cadrage (redimensionnement seul, aucun recadrage). Relancer apres
// remplacement de la source : node scripts/generate-hero-images.mjs
import sharp from "sharp";
const src = "public/images/hero/mapa-showcase-poster.jpg";
const widths = [640, 828, 1080, 1280, 1920];
for (const w of widths) {
  const base = sharp(src).resize({ width: w, withoutEnlargement: true });
  await base.clone().avif({ quality: 50, effort: 6 }).toFile(`public/images/hero/mapa-showcase-poster-${w}.avif`);
  await base.clone().webp({ quality: 74 }).toFile(`public/images/hero/mapa-showcase-poster-${w}.webp`);
}
await sharp(src).resize({ width: 1280 }).jpeg({ quality: 78, mozjpeg: true }).toFile("public/images/hero/mapa-showcase-poster-1280.jpg");
