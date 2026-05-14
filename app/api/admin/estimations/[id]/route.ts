import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

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
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

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
      return NextResponse.json(
        { error: "not_found", detail: readErr?.message },
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

  const { error: updErr } = await supabase
    .from("estimation_requests")
    .update(update)
    .eq("id", id);

  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
