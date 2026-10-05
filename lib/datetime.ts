// Utilitaire UNIQUE de date et d'heure (oct. 2026) : admin, exports et
// e-mails internes. Fuseau Europe/Luxembourg impose, quel que soit le fuseau
// du serveur (Vercel = UTC) : l'heure d'ete et l'heure d'hiver sont gerees
// par Intl (base de fuseaux IANA), jamais par un decalage fixe.
//
// Format : celui de la langue (Intl), avec en francais la notation
// typographique de l'heure "14 h 32" (ex. "2 octobre 2026 à 14 h 32").

export const ADMIN_TIME_ZONE = "Europe/Luxembourg";

/** Langue de l'admin (seule langue a ce jour). */
export const ADMIN_LOCALE = "fr";

type DateInput = string | number | Date | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2 octobre 2026 à 14 h 32" (fr), "2 October 2026 at 14:32" (en)... */
export function formatDateTime(value: DateInput, locale: string = ADMIN_LOCALE): string {
  const d = toDate(value);
  if (!d) return "";
  const parts = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: ADMIN_TIME_ZONE,
  }).formatToParts(d);
  const isFrench = locale.toLowerCase().startsWith("fr");
  return parts
    .map((p, i) => {
      // Separateur heure/minute : "14 h 32" en francais.
      if (isFrench && p.type === "literal" && parts[i - 1]?.type === "hour" && parts[i + 1]?.type === "minute") {
        return " h ";
      }
      return p.value;
    })
    .join("");
}

/** Version courte pour les listes : "02/10/2026 14 h 32" (fr). */
export function formatDateTimeShort(value: DateInput, locale: string = ADMIN_LOCALE): string {
  const d = toDate(value);
  if (!d) return "";
  const parts = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: ADMIN_TIME_ZONE,
  }).formatToParts(d);
  const isFrench = locale.toLowerCase().startsWith("fr");
  return parts
    .map((p, i) => {
      if (isFrench && p.type === "literal" && parts[i - 1]?.type === "hour" && parts[i + 1]?.type === "minute") {
        return " h ";
      }
      if (p.type === "literal" && parts[i - 1]?.type === "year" && parts[i + 1]?.type === "hour") {
        return " ";
      }
      return p.value;
    })
    .join("");
}

/** Jour et mois abreges pour les axes de graphiques : "02 oct." (fr). */
export function formatDayMonth(value: DateInput, locale: string = ADMIN_LOCALE): string {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", timeZone: ADMIN_TIME_ZONE }).format(d);
}

/** Date seule, sans heure (champs de type date : debut et fin de mandat). */
export function formatDateOnly(value: DateInput, locale: string = ADMIN_LOCALE): string {
  const d = toDate(value);
  if (!d) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: ADMIN_TIME_ZONE,
  }).format(d);
}

/**
 * Date de derniere modification d'une ligne : `updated_at` si la colonne
 * existe, sinon la derniere entree horodatee de `workflow_history`.
 */
export function lastModifiedAt(row: {
  updated_at?: string | null;
  workflow_history?: unknown;
}): string | null {
  if (row.updated_at) return row.updated_at;
  if (!Array.isArray(row.workflow_history)) return null;
  let last: string | null = null;
  for (const e of row.workflow_history) {
    const at = (e as { at?: unknown })?.at;
    if (typeof at === "string" && (!last || at > last)) last = at;
  }
  return last;
}

/**
 * Pour les cellules Excel (sans fuseau) : Date dont les composantes UTC
 * valent l'heure murale de Luxembourg. Excel affiche ainsi 14:32 pour un
 * evenement survenu a 14 h 32, heure de Luxembourg.
 */
export function luxembourgWallClockDate(value: DateInput): Date | null {
  const d = toDate(value);
  if (!d) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: ADMIN_TIME_ZONE,
  }).formatToParts(d);
  const n = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second")));
}
