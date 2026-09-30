// lib/images/process-upload.ts — mission "saisie et affichage des biens"
// (point 4) puis "conversion HEIC fonctionnelle" (correction).
//
// CORRECTIF PROUVÉ : la version precedente pretendait que sharp decodait
// le HEIC nativement, sur la seule foi de l'introspection locale de
// sharp.format.heif — jamais teste sur un vrai fichier. Test reel effectue
// (cf. rapport de mission) : sharp echoue systematiquement sur tout
// fichier HEIC encode en HEVC (le format des photos iPhone), y compris en
// local sur macOS, avec l'erreur :
//   "heif: Error while loading plugin: Support for this compression
//   format has not been built in: HEVC (a suitable decoder plugin is
//   libde265)"
// Confirme par la documentation officielle de sharp (sharp.pixelplumbing.com
// /install) : les binaires precompiles supportent "JPEG, PNG, Ultra HDR,
// WebP, AVIF, TIFF, GIF and SVG" en entree — le HEIC (codec HEVC) est
// absent de cette liste sur TOUTE plateforme, pas seulement Vercel. sharp
// lit le CONTENEUR HEIF (metadonnees) mais pas le codec HEVC qu'il
// contient : d'ou la confusion initiale.
//
// SOLUTION : heic-convert (via libheif-js, compilation WebAssembly
// Emscripten de libheif incluant son propre decodeur HEVC, independante
// du binaire natif de sharp) decode le HEIC en PNG. Le reste du pipeline
// (orientation, redimensionnement, metadonnees, encodage WebP) reste geré
// par sharp, deja valide pour tous les autres formats.
//
// Traite TOUTE photo envoyee depuis l'admin, quel que soit son format
// d'origine (HEIC/HEIF pris directement par un iPhone, JPEG, PNG, WebP,
// TIFF), server-side :
//
//   1. Detection — lecture des 12 premiers octets (boite ISOBMFF "ftyp" +
//      marque) pour distinguer HEIC/HEIF de tout le reste, sans dependre
//      de l'extension du fichier.
//   2. Decodage — heic-convert (HEIC/HEIF) ou sharp directement (tous les
//      autres formats, deja decodables nativement — JPEG/PNG/WebP/TIFF).
//   3. Orientation — pour le chemin HEIC, le tag EXIF Orientation est lu
//      depuis le conteneur d'origine (sharp sait le faire meme sans
//      decoder les pixels) et applique manuellement, puisque le PNG
//      intermediaire ne le porte pas. Pour les autres formats, .rotate()
//      sans argument de sharp applique directement le tag EXIF.
//   4. Redimensionnement — largeur max raisonnable pour le plus grand
//      usage du site (fiche detail / lightbox), jamais d'agrandissement.
//   5. Confidentialite — sharp NE conserve PAS les metadonnees EXIF/GPS
//      par defaut (il faudrait appeler .withMetadata() explicitement
//      pour les garder, ce que ce module ne fait jamais).
//   6. Encodage — WebP qualite elevee.

import sharp, { type Sharp } from "sharp";
import heicConvert from "heic-convert";

const MAX_WIDTH = 2400;
const WEBP_QUALITY = 85;

export interface ProcessedImage {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
  width: number;
  height: number;
}

// Marques ISOBMFF/HEIF reconnues comme HEIC/HEIF (photos Apple et
// conteneur generique). Detection par contenu, jamais par extension.
const HEIF_BRANDS = new Set([
  "heic",
  "heix",
  "hevc",
  "hevx",
  "heim",
  "heis",
  "hevm",
  "hevs",
  "mif1",
  "msf1",
]);

function isHeif(buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  const boxType = buffer.toString("ascii", 4, 8);
  if (boxType !== "ftyp") return false;
  const brand = buffer.toString("ascii", 8, 12).toLowerCase();
  return HEIF_BRANDS.has(brand);
}

// Table standard EXIF Orientation (1-8) -> transformation sharp
// equivalente. Necessaire uniquement pour le chemin HEIC : le PNG produit
// par heic-convert ne porte pas ce tag, contrairement a un JPEG/TIFF que
// sharp sait auto-orienter directement via .rotate().
function applyExifOrientation(
  image: Sharp,
  orientation: number | undefined,
): Sharp {
  switch (orientation) {
    case 2:
      return image.flop();
    case 3:
      return image.rotate(180);
    case 4:
      return image.flip();
    case 5:
      return image.rotate(90).flop();
    case 6:
      return image.rotate(90);
    case 7:
      return image.rotate(270).flop();
    case 8:
      return image.rotate(270);
    default:
      return image;
  }
}

/**
 * Convertit une image quelconque (HEIC/HEIF/JPEG/PNG/WebP/TIFF) en WebP
 * haute qualite, oriente correctement, sans metadonnees EXIF/GPS,
 * redimensionnee au maximum utile pour le site. Lance une erreur
 * explicite si le fichier n'est pas une image decodable (ex. fichier
 * corrompu ou format non supporte) — a la charge de l'appelant de
 * retourner un message clair au visiteur/admin.
 */
export async function processUploadedImage(
  input: Buffer,
): Promise<ProcessedImage> {
  let pipeline: Sharp;

  if (isHeif(input)) {
    // Orientation lue depuis le conteneur HEIF d'origine AVANT decodage
    // (sharp lit les metadonnees du conteneur meme s'il ne sait pas
    // decoder les pixels HEVC — verifie). Best-effort : une image sans
    // tag orientation, ou un echec de lecture de metadonnees, ne bloque
    // jamais la conversion.
    let orientation: number | undefined;
    try {
      const meta = await sharp(input, { failOn: "none" }).metadata();
      orientation = meta.orientation;
    } catch {
      orientation = undefined;
    }

    const pngBuffer = await heicConvert({
      buffer: input,
      format: "PNG",
    });
    pipeline = applyExifOrientation(sharp(pngBuffer), orientation);
  } else {
    // JPEG/PNG/WebP/TIFF : deja decodables nativement par sharp/libvips
    // (verifie pour TIFF et WebP ; JPEG/PNG sont le cas courant de
    // l'ecosysteme sharp). .rotate() sans argument applique directement
    // le tag EXIF Orientation s'il existe.
    pipeline = sharp(input, { failOn: "none" }).rotate();
  }

  const { data, info } = await pipeline
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    contentType: "image/webp",
    extension: "webp",
    width: info.width,
    height: info.height,
  };
}
