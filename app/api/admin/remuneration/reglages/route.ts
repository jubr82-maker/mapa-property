// API admin PUT /api/admin/remuneration/reglages (nov. 2026) : enregistre
// les reglages des agents et de l'employeur (tables de
// supabase/sql/33_remuneration_reglages.sql).
//
//   - Garde : requireSalesAdmin (comptes des ventes realisees, double
//     authentification), en plus de la RLS is_mapa_admin.
//   - Controle serveur : parseAgentInput, parseEmployerInput (listes
//     fermees, bornes) ; aucune autre donnee acceptee.
//   - Premier enregistrement : cree les lignes (upsert).

import { NextResponse } from "next/server";
import { dbFailure } from "@/lib/admin/action-result";
import { requireSalesAdmin } from "@/lib/admin/sales-auth";
import { isSettingsTableMissing, isStartBalanceColumnMissing, parseAgentInput, parseEmployerInput } from "@/lib/admin/remuneration-reglages";

export async function PUT(req: Request) {
  const auth = await requireSalesAdmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as { agents?: unknown; employer?: unknown };
  if (!Array.isArray(body.agents) || body.agents.length === 0 || body.agents.length > 20 || typeof body.employer !== "object" || body.employer === null) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const now = new Date().toISOString();
  const agentRows: Record<string, unknown>[] = [];
  for (const a of body.agents) {
    const { row, error } = parseAgentInput((a ?? {}) as Record<string, unknown>);
    if (error || !row) return NextResponse.json({ error: error ?? "invalid" }, { status: 400 });
    if (agentRows.some((r) => r.agent_key === row.agent_key)) return NextResponse.json({ error: "agent_invalid" }, { status: 400 });
    agentRows.push({ ...row, updated_at: now });
  }
  const { row: employerRow, error: employerError } = parseEmployerInput(body.employer as Record<string, unknown>);
  if (employerError || !employerRow) return NextResponse.json({ error: employerError ?? "invalid" }, { status: 400 });

  const saveAgents = (rows: Record<string, unknown>[]) => auth.supabase.from("mapa_sales_agents").upsert(rows, { onConflict: "agent_key" });
  let a = await saveAgents(agentRows);
  // Colonne du solde de depart pas encore creee (supabase/sql/34) : sans
  // solde, enregistrement comme avant ; avec un solde, refus clair.
  if (isStartBalanceColumnMissing(a.error)) {
    if (agentRows.some((r) => r.solde_depart_reserve !== 0)) return NextResponse.json({ error: "start_balance_unavailable" }, { status: 409 });
    a = await saveAgents(agentRows.map(({ solde_depart_reserve: _omit, ...r }) => r));
  }
  const e = a.error ? null : await auth.supabase.from("mapa_employer_settings").upsert({ ...employerRow, updated_at: now }, { onConflict: "id" });
  const error = a.error ?? e?.error ?? null;
  if (error) {
    if (isSettingsTableMissing(error)) return NextResponse.json({ error: "settings_unavailable" }, { status: 409 });
    console.error("[admin/remuneration/reglages] upsert error", error.code, error.message);
    return NextResponse.json({ error: "db_error", message: (await dbFailure(error, "remuneration")).message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
