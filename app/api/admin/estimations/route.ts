// POST /api/admin/estimations — création manuelle d'une estimation
// par l'admin (BUG 6). Auth SSR obligatoire (même pattern que le PATCH
// existant). N'exécute PAS le moteur EVS : c'est une saisie manuelle,
// l'admin fournit lui-même la fourchette. Écrit dans estimation_requests
// (table déjà écrite par le tunnel public + le PATCH admin).
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    type?: string;
    country?: string;
    commune?: string;
    livingSurface?: number;
    bedrooms?: number;
    state?: string;
    energy?: string;
    year?: number;
    contact_email?: string;
    contact_phone?: string;
    price_low?: number;
    price_mid?: number;
    price_high?: number;
  };

  const low = num(body.price_low);
  const mid = num(body.price_mid);
  const high = num(body.price_high);
  if (!mid || mid <= 0) {
    return NextResponse.json({ error: "missing_price_mid" }, { status: 400 });
  }

  const inputs = {
    type: body.type ?? null,
    country: body.country ?? null,
    commune: body.commune ?? null,
    livingSurface: num(body.livingSurface) ?? null,
    bedrooms: num(body.bedrooms) ?? null,
    state: body.state ?? null,
    energy: body.energy ?? null,
    year: num(body.year) ?? null,
    manual_admin: true,
  };

  const { error } = await supabase.from("estimation_requests").insert({
    inputs,
    client_output: {
      price_low: low ?? Math.round(mid * 0.9),
      price_mid: mid,
      price_high: high ?? Math.round(mid * 1.1),
      confidence: "MANUAL",
    },
    internal_output: { manual: true, created_by: user.email ?? user.id },
    engine: "manual_admin",
    contact_email: body.contact_email ?? null,
    contact_phone: body.contact_phone ?? null,
    status: "new",
  } as never);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
