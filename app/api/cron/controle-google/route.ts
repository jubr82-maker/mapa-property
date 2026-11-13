import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { recordCronRun } from "@/lib/pilotage/health";
import { runControle } from "@/lib/pilotage/controle-run";
import { CONTROLE_TIME_BUDGET_MS } from "@/lib/pilotage/config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Controle quotidien (Google), nov. 2026 : une fois par jour
// (vercel.json, plan Hobby : jamais plus souvent). Meme protection que
// /api/cron/daily (CRON_SECRET). Arret propre a 270 s, reprise au passage
// suivant ou au prochain clic dans l'admin (Controle Google).
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const r = await runControle("google", { trigger: "cron", budgetMs: CONTROLE_TIME_BUDGET_MS });
  await recordCronRun("controle_google", r.ok, `${r.detail}${r.progress ? ` ${r.progress.done}/${r.progress.total}` : ""}`);
  return NextResponse.json(r);
}
