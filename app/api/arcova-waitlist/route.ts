import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkHoneypot } from "@/lib/honeypot";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const SEGMENTS = new Set(["family-office", "private-banker", "investor", "agent"]);

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
  if (!isEmail(body.email) || typeof body.name !== "string") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (typeof body.segment !== "string" || !SEGMENTS.has(body.segment)) {
    return NextResponse.json({ error: "invalid_segment" }, { status: 400 });
  }

  const ok = await verifyTurnstile(body.captchaToken, clientIp(req));
  if (!ok) return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });

  const sb = supabaseServer();
  const { error } = await sb.from("arcova_waitlist").insert({
    name: body.name,
    email: body.email,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    segment: body.segment,
    country: typeof body.country === "string" ? body.country : undefined,
  } as never);

  if (error) {
    console.error("[api/arcova-waitlist]", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.log("[api/arcova-waitlist] Resend stubbed:", { email: body.email, segment: body.segment });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
