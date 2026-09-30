// heic-convert ne fournit pas ses propres types. Declaration minimale
// pour l'unique usage fait ici (lib/images/process-upload.ts) : decoder
// un fichier HEIC/HEIF (HEVC) en PNG via libheif-js (WASM), la seule
// bibliotheque du projet capable de lire ce codec — sharp/libvips ne
// l'embarque pas dans ses binaires precompiles (verifie, cf. rapport de
// mission "conversion HEIC fonctionnelle").
declare module "heic-convert" {
  interface HeicConvertOptions {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality?: number;
  }
  function convert(options: HeicConvertOptions): Promise<Buffer>;
  export default convert;
}
