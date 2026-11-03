// API admin POST /api/admin/ventes-realisees : insertion d'une vente
import { dbFailure } from "@/lib/admin/action-result";
// realisee MAPA Property dans la table mapa_historical_sales.
//
//   - Authentification : allowlist admin (admin@mapagroup.org +
//     j.brebion@mapagroup.org), verifiee cote SSR + RLS Postgres (defense
//     en profondeur). Source unique : lib/admin/sales-auth.ts.
//   - Validation minimale partagee (parseSaleInput, parseSaleCommission).
//   - INSERT direct. Edition / suppression : /api/admin/ventes-realisees/[id].
//   - use_as_comparable non fourni ici -> DEFAULT TRUE en base (migration
//     20260701c).

import { NextResponse } from "next/server";
import { requireSalesAdmin, parseSaleInput } from "@/lib/admin/sales-auth";
import { isCommissionColumnMissing, parseSaleCommission } from "@/lib/admin/sale-commission";

export async function POST(req: Request) {
  const auth = await requireSalesAdmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { insert, error: validationError } = parseSaleInput(body);
  if (validationError || !insert) {
    return NextResponse.json({ error: validationError ?? "invalid" }, { status: 400 });
  }

  // Nov. 2026 : commission facultative, controlee ici (lib/admin/sale-commission.ts).
  const { commission, error: commissionError } = parseSaleCommission(body, insert.prix_vente);
  if (commissionError || !commission) {
    return NextResponse.json({ error: commissionError ?? "invalid" }, { status: 400 });
  }

  const save = (row: Record<string, unknown>) =>
    auth.supabase.from("mapa_historical_sales").insert(row).select("id").single();
  let { data, error } = await save({ ...insert, ...commission });
  // Colonnes de commission pas encore creees (supabase/sql/32) : une vente
  // sans commission s'enregistre comme avant ; avec commission, refus clair.
  if (isCommissionColumnMissing(error)) {
    if (commission.commission_mode !== null) {
      return NextResponse.json({ error: "commission_unavailable" }, { status: 409 });
    }
    ({ data, error } = await save({ ...insert }));
  }

  if (error) {
    // Detail technique dans les journaux serveur (ASVS 7.4.1) ; a l'ecran,
    // motif traduit en clair (lib/admin/db-error.ts), admin aal2 seulement.
    console.error("[admin/ventes-realisees] insert error", error.code, error.message);
    return NextResponse.json(
      { error: "db_error", message: (await dbFailure(error, "ventes")).message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data?.id });
}

export const dynamic = "force-dynamic";
