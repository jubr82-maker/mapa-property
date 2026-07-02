// API admin /api/admin/ventes-realisees/[id]
//   - PATCH  : edition complete d'une vente OU toggle use_as_comparable seul.
//   - DELETE : suppression d'une vente.
//
// Meme allowlist admin + RLS que le POST (lib/admin/sales-auth.ts). Client
// anon+cookie soumis a la RLS partners_write (FOR ALL, admin@ + j.brebion@).

import { NextResponse } from "next/server";
import { requireSalesAdmin, parseSaleInput } from "@/lib/admin/sales-auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireSalesAdmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // Cas 1 — toggle seul de use_as_comparable (case a cocher dans la liste).
  // Detecte quand aucun champ "vente" complet n'est fourni.
  const isToggleOnly =
    body.property_type === undefined &&
    body.prix_vente === undefined &&
    typeof body.use_as_comparable === "boolean";

  if (isToggleOnly) {
    const { error } = await auth.supabase
      .from("mapa_historical_sales")
      .update({ use_as_comparable: body.use_as_comparable as boolean })
      .eq("id", id);
    if (error) {
      console.error("[admin/ventes-realisees/[id]] toggle error", error.message);
      return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Cas 2 — edition complete (memes CHECK que la creation).
  const { insert, error: validationError } = parseSaleInput(body);
  if (validationError || !insert) {
    return NextResponse.json({ error: validationError ?? "invalid" }, { status: 400 });
  }

  const update: Record<string, unknown> = { ...insert };
  if (typeof body.use_as_comparable === "boolean") {
    update.use_as_comparable = body.use_as_comparable;
  }

  const { error } = await auth.supabase
    .from("mapa_historical_sales")
    .update(update)
    .eq("id", id);

  if (error) {
    console.error("[admin/ventes-realisees/[id]] update error", error.message);
    return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
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
    return NextResponse.json({ error: "db_error", message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
