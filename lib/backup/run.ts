// Lancement d'une sauvegarde (oct. 2026) : partage entre la tache nocturne
// (/api/cron/backup) et le bouton "Lancer une sauvegarde maintenant" de
// Sante du site (action admin). Meme export, meme chiffrement, meme depot,
// meme journal cron_runs (tache "backup").
import { supabaseService } from "@/lib/supabase-service";
import { exportDatabase } from "@/lib/backup/export";
import { runNightlyBackup, type NightlyResult } from "@/lib/backup/nightly";
import { recordCronRun } from "@/lib/pilotage/health";
import { deleteBackupFromR2, listBackupR2Objects, uploadBackupToR2 } from "@/lib/r2";

// Duree maximale d'une fonction (formule Hobby, Fluid Compute : 300 s).
// L'export s'arrete de lui-meme a 240 s, avec une cause explicite.
export const BACKUP_EXPORT_BUDGET_MS = 240_000;

/** origin : "nuit" (tache planifiee) ou "manuelle" (bouton admin), note dans le journal. */
export async function runBackupNow(origin: "nuit" | "manuelle"): Promise<NightlyResult> {
  const started = Date.now();
  return runNightlyBackup({
    exportDb: () => exportDatabase(supabaseService(), { deadlineMs: started + BACKUP_EXPORT_BUDGET_MS }),
    put: async (key, body, type) => {
      await uploadBackupToR2(body, key, type);
    },
    list: (prefix) => listBackupR2Objects(prefix),
    remove: (key) => deleteBackupFromR2(key),
    record: (task, ok, detail) => recordCronRun(task, ok, origin === "manuelle" ? `manuelle : ${detail}` : detail),
    // Lue a chaque lancement, jamais journalisee ni renvoyee.
    keyBase64: process.env.BACKUP_ENCRYPTION_KEY,
  });
}
