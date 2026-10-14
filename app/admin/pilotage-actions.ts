"use server";

// Actions du pilotage (oct. 2026), toutes derriere la garde admin complete
// (liste + session aal2).
import { revalidatePath } from "next/cache";
import { assertAdminAction } from "@/lib/admin/require-admin";
import { lastManualRunAt, runPsiMeasurements } from "@/lib/pilotage/psi";
import { logAdminAction } from "@/lib/pilotage/audit";
import { BACKUP_MANUAL_COOLDOWN_MINUTES, PSI_MANUAL_COOLDOWN_MINUTES } from "@/lib/pilotage/config";
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
