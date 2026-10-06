// Journal de securite compact (telephone, oct. 2026). Module pur, sans
// acces a la base : filtres, regroupement et resume sur les entrees deja
// chargees par loadJournal (lib/pilotage/journal.ts). Teste par
// pnpm test:security (section P).
import { ADMIN_TIME_ZONE } from "@/lib/datetime";
import type { JournalEntry } from "@/lib/pilotage/journal";

export const JOURNAL_PAGE_SIZE = 20;

export type JournalTypeFilter = "all" | JournalEntry["source"];
export type JournalResultFilter = "all" | "ok" | "failed";
export type JournalView = "essential" | "all";

export const JOURNAL_TYPE_FILTERS: JournalTypeFilter[] = ["all", "auth", "admin", "offmarket"];
export const JOURNAL_RESULT_FILTERS: JournalResultFilter[] = ["all", "failed", "ok"];

/** Connexion menee a son terme (second facteur ou Passkey). */
const COMPLETED_SIGN_IN = ["mfa", "passkey_login"];
/** Evenements de connexion courants : regroupes par jour s'ils reussissent. */
const ROUTINE_AUTH = ["login", "mfa", "passkey_login", "passkey_step", "logout", "idle_logout"];

/** Evenements sensibles, affiches un par un meme quand ils reussissent. */
const SENSITIVE: Record<JournalEntry["source"], string[]> = {
  auth: ["password_change", "password_reset", "reset_request", "factor_add", "factor_remove", "passkey_add", "passkey_rename", "passkey_remove"],
  admin: [
    "property_price_changed",
    "property_published",
    "property_unpublished",
    "property_archived",
    "property_restored",
    "property_deleted",
    "document_deleted",
    "settings_content_changed",
    "settings_design_changed",
  ],
  offmarket: ["offmarket_delete", "request_status_change"],
};

export function isFailure(e: JournalEntry): boolean {
  return e.success === false;
}

export function isSensitive(e: JournalEntry): boolean {
  return isFailure(e) || SENSITIVE[e.source].includes(e.event);
}

export function isRoutineSignIn(e: JournalEntry): boolean {
  return e.source === "auth" && e.success !== false && ROUTINE_AUTH.includes(e.event);
}

/** Jour (AAAA-MM-JJ) a Luxembourg. */
export function luxembourgDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ADMIN_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

/** Heure courte "JJ/MM HH:MM" a Luxembourg. */
export function shortTime(iso: string): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: ADMIN_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const v = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  return `${v("day")}/${v("month")} ${v("hour")}:${v("minute")}`;
}

/** Compte abrege : trois premiers caracteres, puis le domaine. */
export function abbreviateAccount(email: string | null): string {
  if (!email) return "";
  const at = email.indexOf("@");
  if (at < 0) return email.length > 6 ? `${email.slice(0, 3)}…` : email;
  const local = email.slice(0, at);
  return `${local.length > 3 ? `${local.slice(0, 3)}…` : local}${email.slice(at)}`;
}

export type JournalLine =
  | { kind: "event"; at: string; entry: JournalEntry }
  | { kind: "sign_ins"; at: string; day: string; count: number };

export function journalLines(
  entries: JournalEntry[],
  opts: { type: JournalTypeFilter; result: JournalResultFilter; view: JournalView },
): JournalLine[] {
  const filtered = entries
    .filter((e) => opts.type === "all" || e.source === opts.type)
    .filter((e) => (opts.result === "all" ? true : opts.result === "ok" ? e.success === true : e.success === false));
  if (opts.view === "all") return filtered.map((e) => ({ kind: "event", at: e.at, entry: e }));

  const lines: JournalLine[] = [];
  const byDay = new Map<string, { at: string; count: number }>();
  for (const e of filtered) {
    if (isRoutineSignIn(e)) {
      const day = luxembourgDay(e.at);
      const g = byDay.get(day) ?? { at: e.at, count: 0 };
      if (COMPLETED_SIGN_IN.includes(e.event)) g.count += 1;
      if (e.at > g.at) g.at = e.at;
      byDay.set(day, g);
      continue;
    }
    if (isSensitive(e)) lines.push({ kind: "event", at: e.at, entry: e });
  }
  for (const [day, g] of byDay) if (g.count > 0) lines.push({ kind: "sign_ins", at: g.at, day, count: g.count });
  return lines.sort((a, b) => b.at.localeCompare(a.at));
}

export function paginate<T>(items: T[], page: number, size = JOURNAL_PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: items.slice((current - 1) * size, current * size), page: current, pages };
}

/** Resume des 7 derniers jours (ou `days`). */
export function journalSummary(entries: JournalEntry[], days = 7, now = Date.now()) {
  const since = now - days * 86_400_000;
  const recent = entries.filter((e) => new Date(e.at).getTime() >= since);
  return {
    signIns: recent.filter((e) => e.source === "auth" && e.success && COMPLETED_SIGN_IN.includes(e.event)).length,
    failures: recent.filter(isFailure).length,
    devices: recent.filter((e) => e.source === "auth" && e.success && ["factor_add", "passkey_add"].includes(e.event)).length,
    sensitive: recent.filter((e) => e.success !== false && isSensitive(e) && e.source !== "auth").length,
  };
}

export function parseJournalParams(sp: Record<string, string | string[] | undefined>) {
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const type = JOURNAL_TYPE_FILTERS.includes(one(sp.type) as JournalTypeFilter) ? (one(sp.type) as JournalTypeFilter) : "all";
  const result = JOURNAL_RESULT_FILTERS.includes(one(sp.result) as JournalResultFilter) ? (one(sp.result) as JournalResultFilter) : "all";
  const view: JournalView = one(sp.vue) === "tout" ? "all" : "essential";
  const page = Number(one(sp.page)) || 1;
  return { type, result, view, page };
}
