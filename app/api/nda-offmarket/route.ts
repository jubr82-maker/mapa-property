import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkHoneypot } from "@/lib/honeypot";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: Request) {
  const limit = rateLimit(req, { windowMs: 60_000, max: 5, namespace: "nda" });
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

  const ok = await verifyTurnstile(body.captchaToken, clientIp(req));
  if (!ok) return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });

  const sb = supabaseServer();
  const { error, data } = await sb
    .from("nda_requests")
    .insert({
      name: body.name,
      email: body.email,
      phone: typeof body.phone === "string" ? body.phone : undefined,
      project_type: typeof body.projectType === "string" ? body.projectType : undefined,
      budget_min: typeof body.budgetMin === "number" ? body.budgetMin : undefined,
      budget_max: typeof body.budgetMax === "number" ? body.budgetMax : undefined,
      areas: Array.isArray(body.areas) ? body.areas : undefined,
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
