import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/security/cron-auth";
import { refreshBceRate } from "@/lib/pilotage/bce";

export const dynamic = "force-dynamic";

// Oct. 2026 : n'est plus planifiee dans vercel.json, la tache quotidienne
// (app/api/cron/daily) appelle refreshBceRate le 1er du mois. Route
// conservee pour un declenchement manuel avec CRON_SECRET.
export async function GET(req: Request) {
  if (!isAuthorizedCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const r = await refreshBceRate();
  if (!r.ok) {
    const status = r.detail === "db_error" ? 500 : 502;
    return NextResponse.json({ ok: false, rate: r.rate, error: r.detail }, { status });
  }
  return NextResponse.json({ ok: true, rate: r.rate, stubbed: r.detail === "stubbed" || undefined });
}
