// Resume d'un import d'annonce (nov. 2026), garde dans le navigateur
// (sessionStorage) le temps d'ouvrir le brouillon : aucune table, aucun SQL.
// Sur un autre appareil, la fiche affiche seulement les champs a completer
// (calcules par la page a partir du brouillon enregistre).
import type { ImportSummary } from "@/app/admin/properties/import-actions";

export type StoredImportSummary = ImportSummary & {
  photosImported: number;
  photosTotal: number;
  photoFailures: string[];
  enhanced: boolean;
};

export const importSummaryKey = (propertyId: string) => `mapa-import-summary:${propertyId}`;

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif", tif: "image/tiff", tiff: "image/tiff", avif: "image/avif", gif: "image/gif" };

/** Type d'image d'apres l'extension (fichiers sortis d'un zip). */
export function mimeOfName(name: string): string {
  return MIME[(name.split(".").pop() ?? "").toLowerCase()] ?? "";
}
