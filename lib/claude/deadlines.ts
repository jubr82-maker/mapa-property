// Echeances Claude (nov. 2026) : expiration de la cle API "site-traduction"
// et des credits prepayes (1 an apres l'achat, recharge automatique
// desactivee). Seules des DATES sont gardees : la cle elle-meme n'est
// jamais lue, affichee ni ecrite ici. Module pur (ecran, serveur, tests).

/** Expiration de la cle API "site-traduction" (date fixe connue). */
export const DEFAULT_API_KEY_EXPIRES_ON = "2027-12-31";
/** Bandeau discret a partir de J-60, urgent a partir de J-15. */
export const NOTICE_DAYS = 60;
export const URGENT_DAYS = 15;
/** Credit presque epuise : solde estime sous 10 % du credit saisi. */
export const LOW_CREDIT_RATIO = 0.1;

const TZ = "Europe/Luxembourg";
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDay(s: unknown): s is string {
  return typeof s === "string" && ISO_DAY.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

/** Jour courant a Luxembourg (AAAA-MM-JJ). */
export function luxToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Date d'achat + 1 an (29 fevrier -> 28 fevrier). */
export function addOneYear(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  const last = new Date(Date.UTC(y + 1, m, 0)).getUTCDate();
  return `${y + 1}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}

/** Jours entre aujourd'hui (Luxembourg) et l'echeance : 0 le jour meme, negatif apres. */
export function daysUntil(day: string, now: Date): number {
  return Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${luxToday(now)}T00:00:00Z`)) / 86_400_000);
}

export type DeadlineLevel = "notice" | "urgent" | "expired";

/** Aucun bandeau avant J-60 ; discret J-60 a J-16 ; urgent J-15 a J0 ; rouge apres. */
export function deadlineLevel(days: number): DeadlineLevel | null {
  if (days < 0) return "expired";
  if (days <= URGENT_DAYS) return "urgent";
  if (days <= NOTICE_DAYS) return "notice";
  return null;
}

/** Palier d'e-mail atteint : J-60, J-15, jour de l'echeance (et apres). */
export type ReminderTier = "d60" | "d15" | "d0";
export const TIERS: readonly ReminderTier[] = ["d60", "d15", "d0"];

export function reminderTier(days: number): ReminderTier | null {
  if (days <= 0) return "d0";
  if (days <= URGENT_DAYS) return "d15";
  if (days <= NOTICE_DAYS) return "d60";
  return null;
}

export type ClaudeDeadlines = {
  /** Table des rappels (SQL 42) presente. */
  remindersReady: boolean;
  /** Table du credit (SQL 40) presente. */
  creditReady: boolean;
  apiKeyExpiresOn: string;
  credit: { amountUsd: number; purchasedOn: string; expiresOn: string } | null;
  /** Paliers d'e-mail deja envoyes ("key:2027-12-31:d60"). */
  sent: string[];
};

export type ClaudeAlert =
  | { kind: "key"; level: DeadlineLevel; date: string; days: number }
  | { kind: "credit"; level: DeadlineLevel; date: string; days: number; purchasedOn: string }
  | { kind: "credit_low"; level: "notice"; remainingUsd: number };

/** Bandeaux a afficher (tableau de bord, Sante du site). */
export function claudeAlerts(d: ClaudeDeadlines, remainingUsd: number | null, now: Date): ClaudeAlert[] {
  const out: ClaudeAlert[] = [];
  const keyDays = daysUntil(d.apiKeyExpiresOn, now);
  const keyLevel = deadlineLevel(keyDays);
  if (keyLevel) out.push({ kind: "key", level: keyLevel, date: d.apiKeyExpiresOn, days: keyDays });
  if (d.credit) {
    const days = daysUntil(d.credit.expiresOn, now);
    const level = deadlineLevel(days);
    if (level) out.push({ kind: "credit", level, date: d.credit.expiresOn, days, purchasedOn: d.credit.purchasedOn });
    const expired = level === "expired";
    if (!expired && remainingUsd != null && d.credit.amountUsd > 0 && remainingUsd < d.credit.amountUsd * LOW_CREDIT_RATIO) {
      out.push({ kind: "credit_low", level: "notice", remainingUsd: Math.max(0, remainingUsd) });
    }
  }
  return out;
}

/** Echeance depassee qui bloque la traduction (avant tout appel a Claude). */
export function blockingExpiry(d: ClaudeDeadlines, now: Date): { kind: "key" | "credit"; date: string } | null {
  if (daysUntil(d.apiKeyExpiresOn, now) < 0) return { kind: "key", date: d.apiKeyExpiresOn };
  if (d.credit && daysUntil(d.credit.expiresOn, now) < 0) return { kind: "credit", date: d.credit.expiresOn };
  return null;
}

export type ReminderToSend = { kind: "key" | "credit"; tier: ReminderTier; date: string; days: number; purchasedOn?: string; marks: string[] };

/**
 * E-mails a envoyer aujourd'hui : un seul par echeance, au palier le plus
 * avance pas encore envoye ; les paliers inferieurs sont marques en meme
 * temps (pas trois e-mails le meme jour si la date est saisie tard).
 */
export function remindersDue(d: ClaudeDeadlines, now: Date): ReminderToSend[] {
  const items: { kind: "key" | "credit"; date: string; purchasedOn?: string }[] = [{ kind: "key", date: d.apiKeyExpiresOn }];
  if (d.credit) items.push({ kind: "credit", date: d.credit.expiresOn, purchasedOn: d.credit.purchasedOn });
  const out: ReminderToSend[] = [];
  for (const it of items) {
    const days = daysUntil(it.date, now);
    const tier = reminderTier(days);
    if (!tier) continue;
    const mark = (x: ReminderTier) => `${it.kind}:${it.date}:${x}`;
    if (d.sent.includes(mark(tier))) continue;
    const marks = TIERS.slice(0, TIERS.indexOf(tier) + 1).map(mark);
    out.push({ kind: it.kind, tier, date: it.date, days, purchasedOn: it.purchasedOn, marks });
  }
  return out;
}

/** Memoire des envois : ne garde que les marques des echeances en cours. */
export function pruneSent(sent: string[], d: Pick<ClaudeDeadlines, "apiKeyExpiresOn" | "credit">): string[] {
  const keep = new Set([`key:${d.apiKeyExpiresOn}:`, ...(d.credit ? [`credit:${d.credit.expiresOn}:`] : [])]);
  return [...new Set(sent)].filter((s) => [...keep].some((k) => s.startsWith(k)));
}
