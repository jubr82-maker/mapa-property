import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { loadPsiHistory } from "@/lib/pilotage/psi";

export const dynamic = "force-dynamic";

// Oct. 2026 : lecture seule des mesures enregistrees. Les mesures ne sont
// JAMAIS lancees par une lecture : tache quotidienne (app/api/cron/daily)
// ou bouton de la page Sante du site (app/admin/pilotage-actions.ts).
export async function GET() {
  const adminCheck = await requireAdminRoute();
  if (!adminCheck.ok) return adminCheck.response;
  const { available, rows } = await loadPsiHistory(30);
  return NextResponse.json({ ok: available, results: rows });
}
