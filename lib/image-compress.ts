"use client";

// Compression photo côté navigateur avant upload — canvas natif, aucune
// dépendance. Redimensionne à MAX_WIDTH max (ratio conservé, jamais
// d'agrandissement) et réencode en JPEG qualité ~80%. Utilisé par
// PhotoManager (properties) et OffmarketForm (off-market) pour éviter de
// stocker/servir des photos brutes de plusieurs Mo.

const MAX_WIDTH = 2000;
const JPEG_QUALITY = 0.8;

/**
 * Compresse un fichier image. Retourne toujours un File utilisable :
 * si la compression échoue (format non supporté, navigateur ancien,
 * erreur canvas) ou si le résultat n'est pas plus léger que l'original,
 * retombe sur le fichier d'origine plutôt que de bloquer l'upload.
 */
export async function compressImageFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_WIDTH / bitmap.width);
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (e) {
    console.warn("[image-compress] échec compression, upload original:", e);
    return file;
  }
}
