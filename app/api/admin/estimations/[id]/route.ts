import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminRoute } from "@/lib/admin/require-admin";

type Status = "new" | "in_progress" | "avis_sent" | "mandate_signed" | "closed";
const VALID_STATUS: Status[] = [
  "new",
  "in_progress",
  "avis_sent",
  "mandate_signed",
  "closed",
];

interface PatchBody {
  status?: Status;
  notes?: string;
  weights_used?: Record<string, number>;
  client_output_override?: {
    price_low: number;
    price_mid: number;
    price_high: number;
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;
  const supabase = supabaseService();

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const update: Record<string, unknown> = {};

  if (body.status !== undefined) {
    if (!VALID_STATUS.includes(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    update.status = body.status;
  }

  if (typeof body.notes === "string") {
    update.notes = body.notes;
  }

  // Pour weights_used + client_output_override on doit récupérer la ligne et
  // merger dans le JSONB. Le JSON natif PostgREST ne fait pas de merge profond
  // facilement — on relit puis on réécrit.
  if (body.weights_used || body.client_output_override) {
    const { data: current, error: readErr } = await supabase
      .from("estimation_requests")
      .select("internal_output, client_output")
      .eq("id", id)
      .single();
    if (readErr || !current) {
      if (readErr) console.error("[admin/estimations] read error", readErr.code);
      return NextResponse.json(
        { error: "not_found" },
        { status: 404 },
      );
    }

    if (body.weights_used) {
      const internalOutput = (current.internal_output ?? {}) as Record<string, unknown>;
      update.internal_output = {
        ...internalOutput,
        weights_used: body.weights_used,
        weights_overridden_at: new Date().toISOString(),
      };
    }

    if (body.client_output_override) {
      const clientOutput = (current.client_output ?? {}) as Record<string, unknown>;
      update.client_output = {
        ...clientOutput,
        price_low: body.client_output_override.price_low,
        price_mid: body.client_output_override.price_mid,
        price_high: body.client_output_override.price_high,
        manually_adjusted: true,
        manually_adjusted_at: new Date().toISOString(),
      };
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no_fields" }, { status: 400 });
  }

  const { data: updated, error: updErr } = await supabase
    .from("estimation_requests")
    .update(update)
    .eq("id", id)
    .select("id");

  if (updErr) {
    console.error("[api/admin/estimations/id] update", { code: updErr.code });
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

// Soft delete (BUG 6) — status = "deleted" (jamais de suppression dure ;
// la liste admin filtre déjà neq("status","deleted")).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;
  const supabase = supabaseService();

  const { data: updated, error } = await supabase
    .from("estimation_requests")
    .update({ status: "deleted" })
    .eq("id", id)
    .select("id");

  if (error) {
    console.error("[admin/estimations] delete error", error.code);
    // CHECK status non encore élargi (migration 20260518_estimation_
    // status_deleted.sql pas appliquée) → message actionnable.
    const isCheck =
      error.code === "23514" || /status/i.test(error.message ?? "");
    return NextResponse.json(
      {
        error: isCheck
          ? "Migration requise : appliquer supabase/migrations/20260518_estimation_status_deleted.sql (CHECK status n'autorise pas encore 'deleted')."
          : "db_error",
      },
      { status: isCheck ? 409 : 500 },
    );
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
