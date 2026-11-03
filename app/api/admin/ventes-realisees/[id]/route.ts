// API admin /api/admin/ventes-realisees/[id]
import { dbFailure } from "@/lib/admin/action-result";
//   - PATCH  : edition complete d'une vente OU toggle use_as_comparable seul.
//   - DELETE : suppression d'une vente.
//
// Meme allowlist admin + RLS que le POST (lib/admin/sales-auth.ts). Client
// anon+cookie soumis a la RLS partners_write (FOR ALL, admin@ + j.brebion@).

import { NextResponse } from "next/server";
import { requireSalesAdmin, parseSaleInput } from "@/lib/admin/sales-auth";
import { COMMISSION_COLUMNS, isCommissionColumnMissing, parseSaleCommission } from "@/lib/admin/sale-commission";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireSalesAdmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const hasOverride = Object.prototype.hasOwnProperty.call(body, "comparable_override");
  const overrideValue = body.comparable_override;
  const overrideValid = overrideValue === true || overrideValue === false || overrideValue === null;

  // Cas 1 : bascule seule de comparable_override (controle 3 etats dans la
  // liste : Auto=null / Oui=true / Non=false). Detecte quand aucun champ
  // "vente" complet n'est fourni.
  const isOverrideOnly =
    body.property_type === undefined && body.prix_vente === undefined && hasOverride;

  if (isOverrideOnly) {
    if (!overrideValid) {
      return NextResponse.json({ error: "invalid_comparable_override" }, { status: 400 });
    }
    const { error } = await auth.supabase
      .from("mapa_historical_sales")
      .update({ comparable_override: overrideValue })
      .eq("id", id);
    if (error) {
      console.error("[admin/ventes-realisees/[id]] override error", error.message);
      return NextResponse.json({ error: "db_error", message: (await dbFailure(error, "ventes")).message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Cas 2 : edition complete (memes CHECK que la creation).
  const { insert, error: validationError } = parseSaleInput(body);
  if (validationError || !insert) {
    return NextResponse.json({ error: validationError ?? "invalid" }, { status: 400 });
  }

  // Nov. 2026 : commission facultative, controlee ici (lib/admin/sale-commission.ts).
  const { commission, error: commissionError } = parseSaleCommission(body, insert.prix_vente);
  if (commissionError || !commission) {
    return NextResponse.json({ error: commissionError ?? "invalid" }, { status: 400 });
  }

  const update: Record<string, unknown> = { ...insert, ...commission };
  if (hasOverride && overrideValid) {
    update.comparable_override = overrideValue;
  }

  const save = (row: Record<string, unknown>) => auth.supabase.from("mapa_historical_sales").update(row).eq("id", id);
  let { error } = await save(update);
  // Colonnes de commission pas encore creees (supabase/sql/32) : une vente
  // sans commission s'enregistre comme avant ; avec commission, refus clair.
  if (isCommissionColumnMissing(error)) {
    if (commission.commission_mode !== null) {
      return NextResponse.json({ error: "commission_unavailable" }, { status: 409 });
    }
    ({ error } = await save(Object.fromEntries(Object.entries(update).filter(([k]) => !(COMMISSION_COLUMNS as readonly string[]).includes(k)))));
  }

  if (error) {
    console.error("[admin/ventes-realisees/[id]] update error", error.message);
    return NextResponse.json({ error: "db_error", message: (await dbFailure(error, "ventes")).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireSalesAdmin();
  if (!auth.ok) return auth.response;

  const { error } = await auth.supabase
    .from("mapa_historical_sales")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[admin/ventes-realisees/[id]] delete error", error.message);
    return NextResponse.json({ error: "db_error", message: (await dbFailure(error, "ventes")).message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
