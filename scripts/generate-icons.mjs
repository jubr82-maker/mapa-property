// Jeu d'icones du site et de l'admin (oct. 2026), genere SANS redessiner a
// partir de l'image fournie par Julien (brand-sources/logo-sombre.png).
// Le logo complet (embleme + "MAPA PROPERTY", 2131 x 738) est illisible a
// 48 px : seul l'embleme dore (partie gauche) est retenu, choix montre a
// Julien. L'image est seulement recadree sur l'embleme (pixels dores
// detectes automatiquement), completee en carre avec la couleur de fond de
// l'image elle-meme (opaque, la source n'a pas de transparence) et
// redimensionnee (sharp, deja present dans node_modules).
//
// Usage : node scripts/generate-icons.mjs [source]
//   source : brand-sources/logo-sombre.png par defaut
//
// Sorties (adresses stables, sans empreinte) :
//   public/icons/icon-{48,96,144,192,288,384,512}.png  carres, multiples de 48
//   public/icons/apple-touch-icon.png                 180 px, fond opaque
//   public/icons/icon-maskable-512.png                512 px, zone sure 80 %
//   public/favicon.ico et app/favicon.ico             16, 32 et 48 px
//   anciens noms (favicon-16/32/48, apple-touch-icon, pwa-*) reecrits avec
//   la meme image, pour qu'aucune ancienne adresse ne serve l'ancienne icone.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const source = path.resolve(ROOT, process.argv[2] ?? "brand-sources/logo-sombre.png");
const out = (p) => path.join(ROOT, p);

const SQUARE_SIZES = [48, 96, 144, 192, 288, 384, 512];
// 48 px en premier : Next.js declare la taille de la premiere image.
const ICO_SIZES = [48, 32, 16];

/** Couleur du coin superieur gauche : fond de l'image source. */
let background = { r: 255, g: 255, b: 255 };

/** Embleme dore recadre (40 % gauche de l'image, pixels nettement orange). */
async function trimmed() {
  const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  background = { r: data[0], g: data[1], b: data[2] };
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < Math.round(info.width * 0.4); x++) {
      const i = (y * info.width + x) * 3;
      if (data[i] - data[i + 2] > 40 && data[i] > 120) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
  }
  if (x1 < 0) throw new Error("embleme dore introuvable dans la source");
  console.log(`embleme : x ${x0} a ${x1}, y ${y0} a ${y1}`);
  return sharp(source).removeAlpha().extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }).png().toBuffer();
}

/** Carre opaque de `size` px, embleme centre sur `ratio` du cote. */
async function square(input, size, { ratio = 0.88 } = {}) {
  const inner = Math.max(1, Math.round(size * ratio));
  const logo = await sharp(input)
    .resize(inner, inner, { fit: "contain", background })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 3, background },
  })
    .composite([{ input: logo, gravity: "center" }])
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

const logo = await trimmed();

for (const s of SQUARE_SIZES) write(`public/icons/icon-${s}.png`, await square(logo, s));
write("public/icons/apple-touch-icon.png", await square(logo, 180, { ratio: 0.8 }));
write("public/icons/icon-maskable-512.png", await square(logo, 512, { ratio: 0.7 }));

const icoData = ico(await Promise.all(ICO_SIZES.map(async (size) => ({ size, data: await square(logo, size) }))));
write("public/favicon.ico", icoData);
write("app/favicon.ico", icoData);

// Anciennes adresses : meme image (aucune n'est plus declaree).
for (const s of [16, 32, 48]) write(`public/favicon-${s}.png`, await square(logo, s));
write("public/apple-touch-icon.png", await square(logo, 180, { ratio: 0.8 }));
for (const s of [192, 384, 512]) write(`public/pwa-${s}.png`, await square(logo, s));
write("public/pwa-512-maskable.png", await square(logo, 512, { ratio: 0.7 }));
