// Jeu d'icones du site et de l'admin depuis l'icone carree fournie par
// Julien (oct. 2026, public/brand/icone-source.png : carre arrondi vert sur
// fond transparent). Memes noms, tailles et emplacements que
// scripts/generate-icons.mjs ; seule la source change. Aucun redessin :
// l'image est seulement redimensionnee (sharp, deja present).
//
// Usage : node scripts/generate-icons-square.mjs [source]
//   source : public/brand/icone-source.png par defaut
//
// Sorties :
//   public/icons/icon-{48,96,144,192,288,384,512}.png  fond transparent
//   public/icons/apple-touch-icon.png                 180 px, fond plein #1F221A (iOS)
//   public/icons/icon-maskable-512.png                512 px, fond plein, zone sure 80 %
//   public/favicon.ico et app/favicon.ico             48, 32 et 16 px, fond transparent
//   anciens noms (favicon-16/32/48, apple-touch-icon, pwa-*) reecrits avec
//   la meme image, pour qu'aucune ancienne adresse ne serve l'ancienne icone.
//
// Les fichiers de public/icons sont en cache d'un an : les liens portent un
// numero de version (ICON_VERSION, lib/icons.ts) a augmenter a chaque
// nouvelle generation.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const source = path.resolve(ROOT, process.argv[2] ?? "public/brand/icone-source.png");
const out = (p) => path.join(ROOT, p);

const SQUARE_SIZES = [48, 96, 144, 192, 288, 384, 512];
// 48 px en premier : Next.js declare la taille de la premiere image.
const ICO_SIZES = [48, 32, 16];
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };
const GREEN = { r: 0x1f, g: 0x22, b: 0x1a, alpha: 1 };

/** Carre de `size` px, icone centree sur `ratio` du cote, fond `background`. */
async function square(size, { ratio = 1, background = TRANSPARENT } = {}) {
  const inner = Math.max(1, Math.round(size * ratio));
  const icon = await sharp(source).resize(inner, inner, { fit: "contain", background: TRANSPARENT }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: icon, gravity: "center" }])
    .png()
    .toBuffer();
}

/** Fichier ICO contenant des images PNG (format accepte depuis Windows Vista). */
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  const entries = [];
  let offset = 6 + 16 * pngs.length;
  for (const { size, data } of pngs) {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(e);
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

const write = (p, data) => {
  fs.mkdirSync(path.dirname(out(p)), { recursive: true });
  fs.writeFileSync(out(p), data);
  console.log(`${p} (${data.length} octets)`);
};

const apple = await square(180, { background: GREEN });
const maskable = await square(512, { ratio: 0.8, background: GREEN });

for (const s of SQUARE_SIZES) write(`public/icons/icon-${s}.png`, await square(s));
write("public/icons/apple-touch-icon.png", apple);
write("public/icons/icon-maskable-512.png", maskable);

const icoData = ico(await Promise.all(ICO_SIZES.map(async (size) => ({ size, data: await square(size) }))));
write("public/favicon.ico", icoData);
write("app/favicon.ico", icoData);

// Anciennes adresses : meme image (aucune n'est plus declaree).
for (const s of [16, 32, 48]) write(`public/favicon-${s}.png`, await square(s));
write("public/apple-touch-icon.png", apple);
for (const s of [192, 384, 512]) write(`public/pwa-${s}.png`, await square(s));
write("public/pwa-512-maskable.png", maskable);
