// lib/admin/exports/format.ts — formatteurs partagés par les exports
// admin (Excel + PDF). Aucune dépendance à exceljs/pdfkit ici.
//
// DÉFAUT CORRIGÉ (2026-09-22) : les montants ne doivent JAMAIS passer par
// `toLocaleString("fr-FR", {style:"currency", ...})` ni par
// `Intl.NumberFormat("fr-FR")` pour un rendu texte destiné à un PDF —
// depuis les mises à jour ICU récentes, ce formateur utilise une ESPACE
// FINE INSÉCABLE (U+202F) comme séparateur de milliers, un caractère
// absent de l'encodage WinAnsi des polices standard PDF (pdfkit) : il
// s'affichait comme un glyphe erroné ("700 /000 €" au lieu de
// "700 000 €"). Tous les formatteurs ci-dessous construisent la chaîne
// à la main avec une ESPACE ASCII normale (U+0020), jamais via Intl.
// Le formatage des dates est également construit à la main (pas de
// toLocaleDateString) pour ne dépendre d'aucun comportement ICU.

/** "2026-09-20T10:00:00Z" -> Date | null (pour cellule Excel format date). */
export function toDateOrNull(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** "2026-09-20T17:51:00Z" -> "20/09/2026" */
export function fmtDateShort(iso: string | null | undefined): string {
  const d = toDateOrNull(iso);
  if (!d) return "—";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** "2026-09-20T17:51:00Z" -> "20/09/2026 17:51" */
export function fmtDateTimeShort(iso: string | null | undefined): string {
  const d = toDateOrNull(iso);
  if (!d) return "—";
  return `${fmtDateShort(iso)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Regroupe les milliers avec une espace ASCII normale (jamais U+202F). */
function groupThousands(n: number): string {
  const rounded = Math.round(n);
  const sign = rounded < 0 ? "-" : "";
  const digits = Math.abs(rounded).toString();
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}${grouped}`;
}

/** 1250000 -> "1 250 000 €" (espace ASCII, jamais insécable étroite). */
export function fmtEuro(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${groupThousands(n)} €`;
}

/** 186 -> "186 m²" */
export function fmtSurface(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${groupThousands(n)} m²`;
}

/** 3 -> "3 %" */
export function fmtPercent(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${groupThousands(n)} %`;
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
