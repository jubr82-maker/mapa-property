import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { runBackupNow } from "@/lib/backup/run";

export const dynamic = "force-dynamic";
// Duree maximale d'une fonction (formule Hobby, Fluid Compute : 300 s).
// L'export s'arrete de lui-meme a 240 s (lib/backup/run.ts).
export const maxDuration = 300;

// Sauvegarde nocturne chiffree (vercel.json, 01:00 UTC : 03:00 a
// Luxembourg en heure d'ete, 02:00 en heure d'hiver). CRON_SECRET
// obligatoire. Lancement manuel : Sante du site (action admin).
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runBackupNow("nuit");
  // Jamais le contenu ni la cle dans la reponse : resultat et taille.
  return NextResponse.json({ ok: result.ok, detail: result.detail });
}
