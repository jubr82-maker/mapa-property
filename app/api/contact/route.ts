import { withFormEvents } from "@/lib/pilotage/form-events";
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkHoneypot } from "@/lib/honeypot";
import { shouldDropTestLead } from "@/lib/test-email";
import { sendLeadEmails } from "@/lib/email/lead-emails";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

async function handlePost(req: Request) {
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
  // BUG T7 : en prod, emails de test E2E -> OK sans INSERT.
  if (shouldDropTestLead(body.email)) {
    return NextResponse.json({ ok: true });
  }
  if (typeof body.name !== "string" || body.name.trim().length < 2) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const ok = await verifyTurnstile(body.captchaToken, clientIp(req));
  if (!ok) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });
  }

  const nameParts = body.name.trim().split(/\s+/);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || undefined;
  const subject = typeof body.subject === "string" ? body.subject : undefined;
  const message = typeof body.message === "string" ? body.message : undefined;
  const phone = typeof body.phone === "string" ? body.phone : undefined;
  const lang = typeof body.lang === "string" ? body.lang : undefined;

  const sb = supabaseService();
  const { error } = await sb.from("leads").insert({
    name: body.name,
    email: body.email,
    phone,
    subject,
    message,
    source: "contact",
  } as never);

  if (error) {
    console.error("[api/contact] supabase insert", { code: error.code });
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  await sendLeadEmails({
    contactEmail: body.email,
    firstName,
    lastName,
    phone,
    subject,
    message,
    type: "general_contact",
    source: "contact",
    locale: lang,
  });

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";

// Sante des formulaires (oct. 2026) : chaque envoi est compte par resultat.
export const POST = withFormEvents("contact", handlePost);
