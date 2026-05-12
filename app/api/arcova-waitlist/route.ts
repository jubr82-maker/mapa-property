import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkHoneypot } from "@/lib/honeypot";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;

export async function POST(req: Request) {
  const limit = rateLimit(req, { windowMs: 60_000, max: 5, namespace: "arcova" });
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown> & {
    captchaToken?: string;
    honeypot?: string;
  };

  if (!checkHoneypot(body.honeypot as string | undefined)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const email = isEmail(body.email) ? body.email : undefined;
  const first_name = str(body.first_name);
  const last_name = str(body.last_name);

  if (!email || !first_name || !last_name) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const ok = await verifyTurnstile(body.captchaToken, clientIp(req));
  if (!ok) return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });

  const sb = supabaseServer();
  const { error } = await sb.from("arcova_waitlist").insert({
    email,
    first_name,
    last_name,
    phone: str(body.phone),
    company: str(body.company),
    role: str(body.role),
    message: str(body.message),
    country: str(body.country),
    source: "arcova-landing",
  } as never);

  if (error) {
    console.error("[api/arcova-waitlist]", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.log("[api/arcova-waitlist] Resend stubbed:", { email, first_name, last_name });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
