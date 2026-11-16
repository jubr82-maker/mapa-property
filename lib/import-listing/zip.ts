// Lecture d'un fichier .zip de photos (nov. 2026), dans le navigateur, sans
// paquet : repertoire central du zip, fichiers "stockes" ou "compresses"
// (deflate, decompresse par DecompressionStream, natif des navigateurs et
// de Node). Seules les images sont gardees, dans l'ordre alphabetique des
// noms (cf. sortByName). Zip64 et zips chiffres non pris en charge : le
// fichier est refuse avec un message clair.

export type ZipImage = { name: string; data: Uint8Array };

const IMAGE_NAME = /\.(jpe?g|png|webp|heic|heif|tiff?|avif|gif)$/i;

/** Fichier image a garder (dossiers systeme et fichiers caches exclus). */
export function isImageName(path: string): boolean {
  const parts = path.split("/");
  const base = parts[parts.length - 1] ?? "";
  if (!base || base.startsWith(".") || parts.some((p) => p === "__MACOSX" || p.startsWith("."))) return false;
  return IMAGE_NAME.test(base);
}

const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });

/** Ordre alphabetique des noms de fichiers ("photo-2" avant "photo-10"), puis du chemin. */
export function sortByName<T>(items: T[], name: (x: T) => string): T[] {
  const base = (x: T) => name(x).split("/").pop() ?? "";
  return [...items].sort((a, b) => collator.compare(base(a), base(b)) || collator.compare(name(a), name(b)));
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export class ZipError extends Error {}

/** Images d'un zip, triees par nom. Lance ZipError si le fichier n'est pas lisible. */
export async function readZipImages(buffer: ArrayBuffer, maxFiles = 200): Promise<ZipImage[]> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  // Fin du repertoire central (signature 0x06054b50), cherchee depuis la fin.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ZipError("not_zip");
  const count = view.getUint16(eocd + 10, true);
  let p = view.getUint32(eocd + 16, true);
  if (count === 0xffff || p === 0xffffffff) throw new ZipError("zip64");
  const decoder = new TextDecoder("utf-8");
  const out: ZipImage[] = [];
  for (let n = 0; n < count; n++) {
    if (p + 46 > bytes.length || view.getUint32(p, true) !== 0x02014b50) throw new ZipError("corrupt");
    const flags = view.getUint16(p + 8, true);
    const method = view.getUint16(p + 10, true);
    const compSize = view.getUint32(p + 20, true);
    const nameLen = view.getUint16(p + 28, true);
    const extraLen = view.getUint16(p + 30, true);
    const commentLen = view.getUint16(p + 32, true);
    const local = view.getUint32(p + 42, true);
    const name = decoder.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith("/") || !isImageName(name)) continue;
    if (flags & 0x1) throw new ZipError("encrypted");
    if (local + 30 > bytes.length || view.getUint32(local, true) !== 0x04034b50) throw new ZipError("corrupt");
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const raw = bytes.subarray(start, start + compSize);
    if (method === 0) out.push({ name, data: raw.slice() });
    else if (method === 8) out.push({ name, data: await inflateRaw(raw) });
    else throw new ZipError("method");
  }
  return sortByName(out, (x) => x.name).slice(0, maxFiles);
}
