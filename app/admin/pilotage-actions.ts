"use server";

// Actions du pilotage (oct. 2026), toutes derriere la garde admin complete
// (liste + session aal2).
import { revalidatePath } from "next/cache";
import { assertAdminAction } from "@/lib/admin/require-admin";
import { lastManualRunAt, runPsiMeasurements } from "@/lib/pilotage/psi";
import { logAdminAction } from "@/lib/pilotage/audit";
import { PSI_MANUAL_COOLDOWN_MINUTES } from "@/lib/pilotage/config";

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
