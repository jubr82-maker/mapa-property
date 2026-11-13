"use server";

// Actions du pilotage (oct. 2026), toutes derriere la garde admin complete
// (liste + session aal2).
import { revalidatePath } from "next/cache";
import { assertAdminAction } from "@/lib/admin/require-admin";
import { lastManualRunAt, runPsiMeasurements } from "@/lib/pilotage/psi";
import { logAdminAction } from "@/lib/pilotage/audit";
import { BACKUP_MANUAL_COOLDOWN_MINUTES, CONTROLE_CLICK_BUDGET_MS, PSI_MANUAL_COOLDOWN_MINUTES } from "@/lib/pilotage/config";
import { runControle } from "@/lib/pilotage/controle-run";
import { loadCronRuns } from "@/lib/pilotage/health";
import { runBackupNow } from "@/lib/backup/run";

export type PilotageResult = { ok: true; detail: string } | { ok: false; error: "cooldown" | "not_configured" | "failed"; detail?: string };

/** Mesure PageSpeed a la demande, au plus une fois toutes les 10 minutes. */
export async function runPerformanceNowAction(): Promise<PilotageResult> {
  const { user } = await assertAdminAction();
  const last = await lastManualRunAt();
  if (last && Date.now() - new Date(last).getTime() < PSI_MANUAL_COOLDOWN_MINUTES * 60_000) {
    return { ok: false, error: "cooldown" };
  }
  const r = await runPsiMeasurements("manual");
  await logAdminAction({ actorEmail: user.email, action: "performance_measured", diff: { result: r.detail } });
  revalidatePath("/admin/sante");
  if (r.detail === "not_configured") return { ok: false, error: "not_configured" };
  return r.ok ? { ok: true, detail: r.detail } : { ok: false, error: "failed", detail: r.detail };
}

export type BackupRunResult = { ok: true; detail: string } | { ok: false; error: "cooldown" | "failed"; detail?: string };

/**
 * Sauvegarde a la demande (oct. 2026) : la meme que celle de la nuit, notee
 * "manuelle" dans le journal. Admin seulement (liste + session aal2), au
 * plus une toutes les 5 minutes. Le detail renvoye ne contient jamais la cle.
 */
export async function runBackupNowAction(): Promise<BackupRunResult> {
  const { user } = await assertAdminAction();
  const { rows } = await loadCronRuns(20);
  const last = rows.find((r) => r.task === "backup");
  if (last && Date.now() - new Date(last.created_at).getTime() < BACKUP_MANUAL_COOLDOWN_MINUTES * 60_000) {
    return { ok: false, error: "cooldown" };
  }
  const r = await runBackupNow("manuelle");
  await logAdminAction({ actorEmail: user.email, action: "backup_run", diff: { result: r.detail } });
  revalidatePath("/admin/sante");
  return r.ok ? { ok: true, detail: r.detail } : { ok: false, error: "failed", detail: r.detail };
}

export type ControleActionResult = {
  ok: boolean;
  /** db_not_ready, busy, no_key, done, paused, quota, failed */
  detail: string;
  progress?: { done: number; total: number };
};

/**
 * Controle du site puis de Google a la demande (nov. 2026, page Controle
 * Google). Admin seulement (liste + session aal2). Chaque appel avance le
 * passage pendant au plus CONTROLE_CLICK_BUDGET_MS ; la page relance tant
 * que le passage n'est pas fini. Verrou : un seul controle a la fois.
 */
export async function runControleStepAction(kind: "site" | "google", first: boolean): Promise<ControleActionResult> {
  const { user } = await assertAdminAction();
  if (kind !== "site" && kind !== "google") return { ok: false, detail: "failed" };
  // Un passage en pause (nuit ou clic precedent) est repris, jamais
  // recommence ; sinon un nouveau passage demarre. Journal : premier appel.
  const r = await runControle(kind, { trigger: "manual", budgetMs: CONTROLE_CLICK_BUDGET_MS, forceNew: false });
  if (first === true && r.detail !== "busy" && r.detail !== "db_not_ready") {
    await logAdminAction({ actorEmail: user.email, action: "controle_started", diff: { kind, result: r.detail } });
  }
  if (r.detail === "done" || r.detail === "no_key" || r.detail === "quota") revalidatePath("/admin/controle-google");
  return { ok: r.ok, detail: r.detail, progress: r.progress };
}
