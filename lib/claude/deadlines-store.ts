// Lecture et memoire des echeances Claude (nov. 2026), serveur seulement.
// public.claude_reminders (SQL 42) : date d'expiration de la cle API et
// paliers d'e-mail deja envoyes. public.claude_credit (SQL 40) : montant et
// date d'achat du credit. Tables absentes : rien ne plante, cle au
// 31/12/2027 par defaut, credit "date d'achat pas encore renseignee",
// aucun e-mail (sans memoire, il partirait chaque jour).
import type { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE, formatDateOnly } from "@/lib/datetime";
import { missingTable } from "@/lib/claude/usage";
import {
  DEFAULT_API_KEY_EXPIRES_ON,
  addOneYear,
  isIsoDay,
  pruneSent,
  remindersDue,
  type ClaudeDeadlines,
  type ReminderToSend,
} from "@/lib/claude/deadlines";

export async function loadClaudeDeadlines(supabase: SupabaseClient): Promise<ClaudeDeadlines> {
  const out: ClaudeDeadlines = { remindersReady: false, creditReady: false, apiKeyExpiresOn: DEFAULT_API_KEY_EXPIRES_ON, credit: null, sent: [] };
  try {
    const r = await supabase.from("claude_reminders").select("api_key_expires_on, sent").eq("id", 1).maybeSingle();
    if (!r.error) {
      out.remindersReady = true;
      const row = r.data as { api_key_expires_on: string | null; sent: unknown } | null;
      const day = row?.api_key_expires_on ? String(row.api_key_expires_on).slice(0, 10) : null;
      if (isIsoDay(day)) out.apiKeyExpiresOn = day;
      if (Array.isArray(row?.sent)) out.sent = row.sent.filter((s): s is string => typeof s === "string");
    } else if (!missingTable(r.error)) {
      console.error("[claude/deadlines] lecture rappels", { code: r.error.code });
    }
  } catch {
    // Base injoignable : valeurs par defaut.
  }
  try {
    const c = await supabase.from("claude_credit").select("amount_usd, loaded_on").eq("id", 1).maybeSingle();
    if (!c.error) {
      out.creditReady = true;
      const row = c.data as { amount_usd: number | string; loaded_on: string } | null;
      const day = row?.loaded_on ? String(row.loaded_on).slice(0, 10) : null;
      if (row && isIsoDay(day)) out.credit = { amountUsd: Number(row.amount_usd) || 0, purchasedOn: day, expiresOn: addOneYear(day) };
    }
  } catch {
    // idem
  }
  return out;
}

/** Enregistre la date d'expiration de la cle (la cle elle-meme n'est jamais touchee). */
export async function saveApiKeyExpiry(supabase: SupabaseClient, day: string): Promise<{ ok: true } | { ok: false; reason: "not_ready" | "error" }> {
  const { error } = await supabase
    .from("claude_reminders")
    .upsert({ id: 1, api_key_expires_on: day, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (!error) return { ok: true };
  return { ok: false, reason: missingTable(error) ? "not_ready" : "error" };
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

export type ReminderDeps = {
  load: () => Promise<ClaudeDeadlines>;
  /** Libelles admin_claude_reminders (injectables pour les tests). */
  t?: Translate;
  saveSent: (sent: string[]) => Promise<boolean>;
  /** "skipped" : envoi d'e-mails non configure (rien a marquer, pas un echec). */
  send: (subject: string, text: string) => Promise<boolean | "skipped">;
};

/** Textes d'un e-mail de rappel (admin_claude_reminders). */
export async function reminderMail(r: ReminderToSend, tr?: Translate): Promise<{ subject: string; text: string }> {
  const t: Translate = tr ?? ((await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_claude_reminders" })) as unknown as Translate);
  const date = formatDateOnly(r.date);
  const purchased = r.purchasedOn ? formatDateOnly(r.purchasedOn) : "";
  const state = r.tier === "d0" ? (r.days === 0 ? "today" : "expired") : "soon";
  return {
    subject: t(`mail_${r.kind}_subject_${state}`, { date }),
    text: [t(`${r.kind}_${state === "soon" ? "notice" : state}`, { date, days: r.days, purchased }), "", t(`${r.kind}_todo`), "", t("mail_footer")].join("\n"),
  };
}

/**
 * Tache quotidienne : un e-mail par palier (J-60, J-15, jour J) et par
 * echeance, memorise dans claude_reminders.sent. La marque n'est posee
 * qu'apres un envoi reussi (nouvel essai le lendemain sinon).
 */
export async function runClaudeReminders(now: Date, deps: ReminderDeps): Promise<{ ok: boolean; detail: string }> {
  const d = await deps.load();
  if (!d.remindersReady) return { ok: true, detail: "not_ready" };
  const due = remindersDue(d, now);
  if (due.length === 0) return { ok: true, detail: "nothing_due" };
  let sent = pruneSent(d.sent, d);
  const done: string[] = [];
  let failed = 0;
  let skipped = 0;
  for (const r of due) {
    const mail = await reminderMail(r, deps.t);
    const res = await deps.send(mail.subject, mail.text);
    if (res === "skipped") skipped++;
    else if (res) {
      sent = [...new Set([...sent, ...r.marks])];
      done.push(`${r.kind}_${r.tier}`);
    } else failed++;
  }
  if (skipped && !done.length && !failed) return { ok: true, detail: "smtp_not_configured" };
  if (done.length && !(await deps.saveSent(sent))) return { ok: false, detail: `sent_not_saved:${done.join(",")}` };
  return { ok: failed === 0, detail: [done.length ? `sent:${done.join(",")}` : "", failed ? `mail_failed:${failed}` : ""].filter(Boolean).join(" ") };
}

/** Branchement reel : base en service_role, e-mail via la couche SMTP existante. */
export async function sendClaudeReminders(now = new Date()): Promise<{ ok: boolean; detail: string }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: true, detail: "stubbed" };
  const { supabaseService } = await import("@/lib/supabase-service");
  const { sendMail, INTERNAL_NOTIFICATION_RECIPIENTS } = await import("@/lib/email/smtp");
  const sb = supabaseService();
  return runClaudeReminders(now, {
    load: () => loadClaudeDeadlines(sb),
    async saveSent(sent) {
      const upd = await sb.from("claude_reminders").update({ sent, updated_at: new Date().toISOString() }).eq("id", 1).select("id");
      if (upd.error) return false;
      if ((upd.data ?? []).length) return true;
      // Ligne pas encore creee : la date de la cle est alors celle par defaut.
      const ins = await sb.from("claude_reminders").insert({ id: 1, api_key_expires_on: DEFAULT_API_KEY_EXPIRES_ON, sent, updated_at: new Date().toISOString() });
      return !ins.error;
    },
    async send(subject, text) {
      const r = await sendMail({ to: INTERNAL_NOTIFICATION_RECIPIENTS, subject, text, kind: "claude_reminder" });
      if (!r.ok && r.error === "smtp_not_configured") return "skipped";
      return r.ok;
    },
  });
}
