// lib/admin/exports/format.ts — petits formatteurs partages par les
// exports admin (Excel + PDF). Aucune dependance a exceljs/pdfkit ici.

/** "2026-09-20T10:00:00Z" -> Date | null (pour cellule Excel format date). */
export function toDateOrNull(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2026-09-20T10:00:00Z" -> "20 septembre 2026" (texte, pour PDF). */
export function fmtDateFr(iso: string | null | undefined): string {
  const d = toDateOrNull(iso);
  if (!d) return "—";
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** "2026-09-20T10:00:00Z" -> "20/09/2026 10:00" (texte, pour PDF). */
export function fmtDateTimeFr(iso: string | null | undefined): string {
  const d = toDateOrNull(iso);
  if (!d) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtEuro(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function fullName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return [first, last].filter(Boolean).join(" ") || "—";
}

export function orDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
