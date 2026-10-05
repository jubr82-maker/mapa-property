import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { runDailyTask } from "@/lib/pilotage/daily-task";

export const dynamic = "force-dynamic";

// Tache planifiee quotidienne unique (vercel.json). CRON_SECRET obligatoire
// (Vercel Cron envoie "Authorization: Bearer <CRON_SECRET>").
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const results = await runDailyTask();
  return NextResponse.json({ ok: results.every((r) => r.ok), results });
}
