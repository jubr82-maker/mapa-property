import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { supabaseService } from "@/lib/supabase-service";
import { exportDatabase } from "@/lib/backup/export";
import { runNightlyBackup } from "@/lib/backup/nightly";
import { recordCronRun } from "@/lib/pilotage/health";
import { deleteBackupFromR2, listBackupR2Objects, uploadBackupToR2 } from "@/lib/r2";

export const dynamic = "force-dynamic";
// Duree maximale d'une fonction (formule Hobby, Fluid Compute : 300 s).
// L'export s'arrete de lui-meme a 240 s, avec une cause explicite.
export const maxDuration = 300;
const EXPORT_BUDGET_MS = 240_000;

// Sauvegarde nocturne chiffree (vercel.json, 01:00 UTC : 03:00 a
// Luxembourg en heure d'ete, 02:00 en heure d'hiver). CRON_SECRET
// obligatoire.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const started = Date.now();
  const result = await runNightlyBackup({
    exportDb: () => exportDatabase(supabaseService(), { deadlineMs: started + EXPORT_BUDGET_MS }),
    put: async (key, body, type) => {
      await uploadBackupToR2(body, key, type);
    },
    list: (prefix) => listBackupR2Objects(prefix),
    remove: (key) => deleteBackupFromR2(key),
    record: (task, ok, detail) => recordCronRun(task, ok, detail),
    keyBase64: process.env.BACKUP_ENCRYPTION_KEY,
  });
  // Jamais le contenu ni la cle dans la reponse : resultat et taille.
  return NextResponse.json({ ok: result.ok, detail: result.detail });
}
