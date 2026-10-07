// Tache planifiee quotidienne unique (oct. 2026), pour respecter les
// limites du plan Vercel Hobby. Chaque traitement est isole : l'echec de
// l'un n'empeche pas les autres. Chaque execution est journalisee dans
// public.cron_runs.
//   tous les jours   : compte rendu de la sauvegarde de la nuit (e-mail),
//                      mesures PageSpeed, releve des positions Google
//                      (idempotent : une fois par semaine de reference)
//   le lundi         : resume hebdomadaire (une seule fois par semaine)
//   le 1er du mois   : taux BCE (ancienne tache bce-rates)
//   tous les jours   : purge des journaux et statistiques au-dela des
//                      durees de conservation (RETENTION_RULES)
import { runPsiMeasurements } from "@/lib/pilotage/psi";
import { purgeExpiredRows } from "@/lib/pilotage/retention";
import { snapshotWeeklyPositions } from "@/lib/pilotage/seo";
import { sendWeeklySummary } from "@/lib/pilotage/weekly-summary";
import { refreshBceRate } from "@/lib/pilotage/bce";
import { loadCronRuns, recordCronRun } from "@/lib/pilotage/health";
import { WEEKLY_SUMMARY_WEEKDAY } from "@/lib/pilotage/config";
import { sendBackupReport } from "@/lib/backup/report-step";

type StepResult = { task: string; ok: boolean; detail: string };

async function step(task: string, fn: () => Promise<{ ok: boolean; detail: string }>): Promise<StepResult> {
  try {
    const r = await fn();
    await recordCronRun(task, r.ok, r.detail);
    return { task, ...r };
  } catch (e) {
    const detail = e instanceof Error ? e.message.slice(0, 120) : "unknown_error";
    await recordCronRun(task, false, detail);
    return { task, ok: false, detail };
  }
}

/** Jour de la semaine a Luxembourg (1 = lundi), pour le resume du lundi matin. */
function luxWeekday(now: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Luxembourg", weekday: "short" }).format(now);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(name);
}

export async function runDailyTask(now = new Date()): Promise<StepResult[]> {
  const results: StepResult[] = [];
  // Compte rendu de la sauvegarde de la nuit (e-mail de controle du matin).
  results.push(await step("backup_report", () => sendBackupReport(now)));
  results.push(await step("psi", () => runPsiMeasurements("cron")));
  results.push(await step("seo_positions", () => snapshotWeeklyPositions()));

  if (luxWeekday(now) === WEEKLY_SUMMARY_WEEKDAY) {
    const { rows } = await loadCronRuns(100);
    const alreadySent = rows.some(
      (r) => r.task === "weekly_summary" && r.ok && now.getTime() - new Date(r.created_at).getTime() < 6 * 86400_000,
    );
    if (!alreadySent) results.push(await step("weekly_summary", () => sendWeeklySummary()));
  }
  if (now.getUTCDate() === 1) results.push(await step("bce_rate", () => refreshBceRate()));
  results.push(await step("retention", () => purgeExpiredRows(now)));

  const failed = results.filter((r) => !r.ok).map((r) => r.task);
  await recordCronRun("daily", failed.length === 0, failed.length ? `echecs: ${failed.join(",")}` : "ok");
  return results;
}
