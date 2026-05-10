import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkHoneypot } from "@/lib/honeypot";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: Request) {
  const limit = rateLimit(req, { windowMs: 60_000, max: 5, namespace: "contact" });
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown> & {
    captchaToken?: string;
    honeypot?: string;
  };

  if (!checkHoneypot(body.honeypot as string | undefined)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!isEmail(body.email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (typeof body.name !== "string" || body.name.trim().length < 2) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const ok = await verifyTurnstile(body.captchaToken, clientIp(req));
  if (!ok) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });
  }

  const sb = supabaseServer();
  const { error } = await sb.from("leads").insert({
    name: body.name,
    email: body.email,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    subject: typeof body.subject === "string" ? body.subject : undefined,
    message: typeof body.message === "string" ? body.message : undefined,
    source: "contact",
  } as never);

  if (error) {
    console.error("[api/contact] supabase insert", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (process.env.RESEND_API_KEY) {
    // Branchement Resend prévu, voir NIGHT_REPORT
  } else {
    console.log("[api/contact] Resend stubbed:", { email: body.email, subject: body.subject });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
