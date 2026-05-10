import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkHoneypot } from "@/lib/honeypot";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export async function POST(req: Request) {
  const limit = rateLimit(req, { windowMs: 60_000, max: 5, namespace: "offmarket-request" });
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown> & {
    captchaToken?: string;
    turnstile_token?: string;
    honeypot?: string;
  };

  if (!checkHoneypot(body.honeypot as string | undefined)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (
    !isEmail(body.email) ||
    typeof body.prenom !== "string" ||
    typeof body.nom !== "string" ||
    typeof body.property_id !== "string"
  ) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const captchaToken = (body.captchaToken ?? body.turnstile_token) as string | undefined;
  const ok = await verifyTurnstile(captchaToken, clientIp(req));
  if (!ok) return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });

  const sb = supabaseServer();

  let leadId: string | null = null;
  const { data: lead } = await sb
    .from("leads")
    .insert({
      first_name: body.prenom,
      last_name: body.nom,
      email: body.email,
      phone: str(body.telephone),
      message: str(body.criteres_precis),
      type: "offmarket_request",
      source: `offmarket:${body.property_id}`,
      property_ref: body.property_id,
      lang: str(body.lang),
    } as never)
    .select("id")
    .single();
  if (lead && (lead as { id?: string }).id) {
    leadId = (lead as { id: string }).id;
  }

  const { data, error } = await sb
    .from("offmarket_requests")
    .insert({
      property_id: body.property_id,
      lead_id: leadId,
      prenom: body.prenom,
      nom: body.nom,
      email: body.email,
      telephone: str(body.telephone) ?? null,
      pays_recherche: str(body.pays_recherche) ?? null,
      ville_quartier: str(body.ville_quartier) ?? null,
      budget_max_eur: num(body.budget_max_eur) ?? null,
      surface_souhaitee_m2: num(body.surface_souhaitee_m2) ?? null,
      criteres_precis: str(body.criteres_precis) ?? null,
      status: "pending",
    } as never)
    .select("id")
    .single();

  if (error) {
    console.error("[api/offmarket-request]", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.log("[api/offmarket-request] Resend stubbed:", {
      email: body.email,
      property_id: body.property_id,
      request_id: (data as { id?: string } | null)?.id,
    });
  }

  return NextResponse.json({
    ok: true,
    request_id: (data as { id?: string } | null)?.id,
    lead_id: leadId,
  });
}

export const dynamic = "force-dynamic";
