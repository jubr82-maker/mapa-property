import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkHoneypot } from "@/lib/honeypot";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const strArr = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;

export async function POST(req: Request) {
  const limit = rateLimit(req, { windowMs: 60_000, max: 5, namespace: "nda" });
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown> & {
    captchaToken?: string;
    turnstile_token?: string;
    honeypot?: string;
  };

  if (!checkHoneypot(body.honeypot as string | undefined)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Compat : accepter `full_name` OU `name` (legacy) pour le nom complet
  const fullName = str(body.full_name) ?? str(body.name);
  if (!isEmail(body.email) || !fullName) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const captchaToken = (body.captchaToken ?? body.turnstile_token) as string | undefined;
  const ok = await verifyTurnstile(captchaToken, clientIp(req));
  if (!ok) return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });

  const sb = supabaseServer();
  const { error, data } = await sb
    .from("nda_requests")
    .insert({
      civility: str(body.civility) ?? null,
      full_name: fullName,
      email: body.email,
      phone: str(body.phone) ?? null,
      capacity_range: str(body.capacity_range) ?? null,
      property_types: strArr(body.property_types) ?? null,
      zones: str(body.zones) ?? null,
      timeline: str(body.timeline) ?? null,
      nda_accepted: typeof body.nda_accepted === "boolean" ? body.nda_accepted : false,
      source_ip: clientIp(req),
      user_agent: req.headers.get("user-agent") ?? null,
      lang: str(body.lang) ?? null,
      status: "pending",
    } as never)
    .select("id")
    .single();

  if (error) {
    console.error("[api/nda-offmarket]", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.log("[api/nda-offmarket] Resend stubbed:", { email: body.email });
  }

  return NextResponse.json({ ok: true, nda_id: (data as { id?: string } | null)?.id });
}

export const dynamic = "force-dynamic";
