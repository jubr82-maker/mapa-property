// Detection du type de fichier par sa signature binaire (oct. 2026) :
// OWASP ASVS 12.2.1 (verifier le type par le contenu, pas par l'extension
// ni par le type MIME declare par le navigateur).

export type DetectedFile =
  | { kind: "pdf"; mime: "application/pdf"; ext: "pdf" }
  | { kind: "png"; mime: "image/png"; ext: "png" }
  | { kind: "jpeg"; mime: "image/jpeg"; ext: "jpg" }
  | { kind: "webp"; mime: "image/webp"; ext: "webp" }
  | { kind: "ooxml"; mime: string; ext: "docx" | "xlsx" | "pptx" }
  | { kind: "ole"; mime: string; ext: "doc" | "xls" | "ppt" }
  | { kind: "mp4"; mime: "video/mp4"; ext: "mp4" }
  | { kind: "webm"; mime: "video/webm"; ext: "webm" };

const startsWith = (b: Uint8Array, sig: number[], offset = 0) =>
  sig.every((v, i) => b[offset + i] === v);

const OOXML: Record<string, { ext: "docx" | "xlsx" | "pptx"; mime: string }> = {
  docx: { ext: "docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  xlsx: { ext: "xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  pptx: { ext: "pptx", mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation" },
};

const OLE: Record<string, { ext: "doc" | "xls" | "ppt"; mime: string }> = {
  doc: { ext: "doc", mime: "application/msword" },
  xls: { ext: "xls", mime: "application/vnd.ms-excel" },
  ppt: { ext: "ppt", mime: "application/vnd.ms-powerpoint" },
};

/**
 * @param bytes debut du fichier (au moins 16 octets)
 * @param originalName nom d'origine : sert UNIQUEMENT a distinguer
 *   docx / xlsx / pptx (meme conteneur zip), jamais a decider du type.
 */
export function detectFileType(bytes: Uint8Array, originalName = ""): DetectedFile | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { kind: "pdf", mime: "application/pdf", ext: "pdf" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { kind: "png", mime: "image/png", ext: "png" };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { kind: "jpeg", mime: "image/jpeg", ext: "jpg" };
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { kind: "webp", mime: "image/webp", ext: "webp" };
  }
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) return { kind: "mp4", mime: "video/mp4", ext: "mp4" };
  if (startsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3])) return { kind: "webm", mime: "video/webm", ext: "webm" };
  if (startsWith(bytes, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
    const ext = originalName.toLowerCase().split(".").pop() ?? "";
    const o = OLE[ext];
    return o ? { kind: "ole", mime: o.mime, ext: o.ext } : null;
  }
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    const ext = originalName.toLowerCase().split(".").pop() ?? "";
    const o = OOXML[ext];
    return o ? { kind: "ooxml", mime: o.mime, ext: o.ext } : null;
  }
  return null;
}
