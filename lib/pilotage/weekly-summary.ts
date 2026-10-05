// Resume hebdomadaire (oct. 2026), envoye le lundi matin aux destinataires
// internes existants (lib/email/smtp.ts) par la tache quotidienne. Texte
// brut, libelles en traductions (namespace admin_summary).
import { getTranslations } from "next-intl/server";
import { sendMail, INTERNAL_NOTIFICATION_RECIPIENTS } from "@/lib/email/smtp";
import { ADMIN_LOCALE, formatDateTime } from "@/lib/datetime";
import { loadLeadsControl } from "@/lib/pilotage/leads-control";
import { loadSeoHistory } from "@/lib/pilotage/seo";
import { loadFormHealth, loadEmailLog } from "@/lib/pilotage/health";
import { loadJournal, securitySignals } from "@/lib/pilotage/journal";
import { loadBackupStatus, domainStatus } from "@/lib/pilotage/site-facts";

const MAX_LINES = 15;

export async function buildWeeklySummary(): Promise<{ subject: string; text: string }> {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_summary" });
  const tSrc = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_pilotage" });
  const weekAgo = Date.now() - 7 * 86400_000;
  const [leads, seo, forms, emails, journal, backup] = await Promise.all([
    loadLeadsControl(30),
    loadSeoHistory(8),
    loadFormHealth(7),
    loadEmailLog(500),
    loadJournal(7, 1000),
    loadBackupStatus(),
  ]);
  const lines: string[] = [t("intro"), ""];

  const week = leads.requests.filter((r) => new Date(r.createdAt).getTime() >= weekAgo);
  lines.push(t("leads_title", { count: week.length }));
  for (const r of week.slice(0, MAX_LINES)) {
    lines.push(`  ${formatDateTime(r.createdAt)}  ${r.name}  (${tSrc(`source_${r.source}`)})  ${tSrc(`state_${r.state}`)}`);
  }
  lines.push("");
  const late = leads.requests.filter((r) => r.state === "late24" || r.state === "late48");
  lines.push(t("late_title", { count: late.length }));
  for (const r of late.slice(0, MAX_LINES)) lines.push(`  ${r.name}  ${tSrc(`state_${r.state}`)}`);
  lines.push("");

  lines.push(t("seo_title"));
  if (!seo.available || seo.trends.length === 0) lines.push(`  ${t("seo_empty")}`);
  for (const q of seo.trends.slice(0, MAX_LINES)) {
    const evol = q.current !== null && q.previous !== null ? Math.round((q.previous - q.current) * 10) / 10 : null;
    lines.push(`  ${q.query} : ${q.current ?? "?"}${evol === null ? "" : ` (${evol > 0 ? "+" : ""}${evol})`}`);
  }
  lines.push("");

  const failures = forms.rows.reduce((a, r) => a + r.db_error + r.error, 0);
  const captcha = forms.rows.reduce((a, r) => a + r.captcha, 0);
  const okForms = forms.rows.reduce((a, r) => a + r.ok, 0);
  const emailFailures = emails.rows.filter((r) => !r.success && new Date(r.created_at).getTime() >= weekAgo).length;
  lines.push(t("health_title"));
  lines.push(`  ${t("forms_line", { ok: okForms, failures, captcha })}`);
  lines.push(`  ${t("emails_line", { failures: emailFailures })}`);
  lines.push("");

  const logins = journal.entries.filter((e) => e.source === "auth" && e.success && ["login", "passkey_login"].includes(e.event)).length;
  const sec = securitySignals(journal.entries, 24 * 7);
  lines.push(t("security_title"));
  lines.push(`  ${t("security_line", { logins, failed: sec.failedLogins, devices: sec.newDevices, deletions: sec.deletions })}`);
  lines.push("");

  lines.push(t("backup_title"));
  lines.push(
    `  ${
      backup.status === "ok" || backup.status === "late"
        ? t(`backup_${backup.status}`, { date: formatDateTime(backup.lastAt) })
        : t(`backup_${backup.status}`)
    }`,
  );
  const domain = domainStatus();
  if (domain.alert) lines.push("", t("domain_line", { domain: domain.domain, days: domain.daysLeft }));
  lines.push("", t("footer"));
  return { subject: t("subject"), text: lines.join("\n") };
}

export async function sendWeeklySummary(): Promise<{ ok: boolean; detail: string }> {
  const { subject, text } = await buildWeeklySummary();
  const r = await sendMail({ to: INTERNAL_NOTIFICATION_RECIPIENTS, subject, text, kind: "weekly_summary" });
  return { ok: r.ok, detail: r.ok ? "sent" : (r.error ?? "send_failed") };
}
