// API admin POST /api/admin/ventes-realisees — insertion d'une vente
// realisee MAPA Property dans la table mapa_historical_sales.
//
//   - Authentification : allowlist admin (admin@mapagroup.org +
//     j.brebion@mapagroup.org), verifiee cote SSR + RLS Postgres (defense
//     en profondeur). Source unique : lib/admin/sales-auth.ts.
//   - Validation minimale partagee (parseSaleInput).
//   - INSERT direct. Edition / suppression : /api/admin/ventes-realisees/[id].
//   - use_as_comparable non fourni ici -> DEFAULT TRUE en base (migration
//     20260701c).

import { NextResponse } from "next/server";
import { requireSalesAdmin, parseSaleInput } from "@/lib/admin/sales-auth";

export async function POST(req: Request) {
  const auth = await requireSalesAdmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { insert, error: validationError } = parseSaleInput(body);
  if (validationError || !insert) {
    return NextResponse.json({ error: validationError ?? "invalid" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("mapa_historical_sales")
    .insert(insert)
    .select("id")
    .single();

  if (error) {
    console.error("[admin/ventes-realisees] insert error", error.message);
    // Cas tres probable : migration 20260524_mapa_historical_sales.sql pas
    // encore appliquee → renvoie un message explicite cote admin.
    return NextResponse.json(
      { error: "db_error", message: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data?.id });
}

export const dynamic = "force-dynamic";
