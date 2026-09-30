// lib/images/process-upload.ts — mission "saisie et affichage des biens",
// point 4 (photos dans tous les formats).
//
// Traite TOUTE photo envoyee depuis l'admin, quel que soit son format
// d'origine (HEIC/HEIF pris directement par un iPhone, JPEG, PNG, WebP,
// TIFF), server-side, via sharp (deja resolu par le projet, utilise par
// next/image — voir rapport de mission pour la justification complete) :
//
//   1. Decodage — sharp/libvips embarque libheif (HEIC/HEIF) et libtiff
//      (TIFF) en plus des formats courants. Detection par contenu, pas
//      par extension : un .heic mal nomme est quand meme decode.
//   2. Orientation — .rotate() sans argument applique la rotation/
//      symetrie decrite par le tag EXIF Orientation directement sur les
//      pixels, puis le tag devient inutile et n'est pas reecrit.
//   3. Redimensionnement — largeur max raisonnable pour le plus grand
//      usage du site (fiche detail / lightbox), jamais d'agrandissement.
//   4. Confidentialite — sharp NE conserve PAS les metadonnees EXIF/GPS
//      par defaut (il faudrait appeler .withMetadata() explicitement
//      pour les garder, ce que ce module ne fait jamais) : la position
//      GPS d'un bien off-market ne peut donc pas fuiter via une photo.
//   5. Encodage — WebP qualite elevee : format moderne, large support
//      navigateur, sensiblement plus leger qu'un JPEG a qualite visuelle
//      equivalente. next/image (deja utilise partout sur le site) sait
//      ensuite decliner ce fichier source en plusieurs tailles a la
//      demande, par ecran — c'est ce mecanisme existant qui etait cassé
//      pour du HEIC/TIFF non decodable, pas une limite de next/image
//      elle-meme.

import sharp from "sharp";

const MAX_WIDTH = 2400;
const WEBP_QUALITY = 85;

export interface ProcessedImage {
  buffer: Buffer;
  contentType: "image/webp";
  extension: "webp";
  width: number;
  height: number;
}

/**
 * Convertit une image quelconque (HEIC/HEIF/JPEG/PNG/WebP/TIFF) en WebP
 * haute qualite, oriente correctement, sans metadonnees EXIF/GPS,
 * redimensionnee au maximum utile pour le site. Lance une erreur
 * explicite si le fichier n'est pas une image decodable par sharp (ex.
 * fichier corrompu ou format non supporte) — a la charge de l'appelant
 * de retourner un message clair au visiteur/admin.
 */
export async function processUploadedImage(
  input: Buffer,
): Promise<ProcessedImage> {
  const pipeline = sharp(input, { failOn: "none" })
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

  return {
    buffer: data,
    contentType: "image/webp",
    extension: "webp",
    width: info.width,
    height: info.height,
  };
}
