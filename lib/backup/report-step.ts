// Compte rendu du matin (oct. 2026), etape de la tache quotidienne : lit le
// resultat de la sauvegarde de la nuit (cron_runs et resumes dans R2) et
// envoie l'e-mail de controle a site@mapagroup.org par le SMTP existant.
// Aucune sauvegarde dans les 26 dernieres heures : signalee comme echec.
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { sendMail } from "@/lib/email/smtp";
import { BACKUP_REPORT_RECIPIENT } from "@/lib/pilotage/config";
import { loadCronRuns } from "@/lib/pilotage/health";
import { getBackupFromR2, isBackupR2Configured, listBackupR2Objects } from "@/lib/r2";
import { NIGHTLY_PREFIX, listStamps } from "@/lib/backup/rotation";
import { buildBackupReport } from "@/lib/backup/report";
import type { BackupSummary } from "@/lib/backup/nightly";

export async function sendBackupReport(now = new Date()): Promise<{ ok: boolean; detail: string }> {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "backup_report" });
  const date = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Luxembourg", dateStyle: "long" }).format(now);
  const { rows } = await loadCronRuns(60);
  const last = rows.find((r) => r.task === "backup" && now.getTime() - new Date(r.created_at).getTime() < 26 * 3600_000);

  let input: Parameters<typeof buildBackupReport>[0];
  if (!isBackupR2Configured()) input = { date, ok: false, cause: t("cause_r2_not_configured") };
  else if (!last) input = { date, ok: false, cause: t("cause_not_run") };
  else if (!last.ok) input = { date, ok: false, cause: last.detail ?? "" };
  else {
    const objects = await listBackupR2Objects(NIGHTLY_PREFIX);
    const stamps = listStamps(objects);
    const read = async (stamp: string | undefined): Promise<BackupSummary | null> => {
      if (!stamp) return null;
      try {
        return JSON.parse((await getBackupFromR2(`${NIGHTLY_PREFIX}${stamp}.counts.json`)).toString("utf8")) as BackupSummary;
      } catch {
        return null;
      }
    };
    const [cur, prev] = await Promise.all([read(stamps[0]), read(stamps[1])]);
    input = cur
      ? { date, ok: true, sizeBytes: cur.size_bytes, counts: cur.counts, previousCounts: prev?.counts ?? null, kept: stamps.length }
      : { date, ok: false, cause: t("cause_summary_missing") };
  }
  const mail = buildBackupReport(input, (k, v) => t(k, v));
  const sent = await sendMail({ to: BACKUP_REPORT_RECIPIENT, subject: mail.subject, text: mail.text, kind: "backup_report" });
  return { ok: sent.ok && input.ok, detail: `${input.ok ? "sauvegarde ok" : "sauvegarde en echec"}, e-mail ${sent.ok ? "envoye" : `non envoye (${sent.error ?? "?"})`}` };
}
