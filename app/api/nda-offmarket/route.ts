import { withFormEvents } from "@/lib/pilotage/form-events";
import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase-service";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkHoneypot } from "@/lib/honeypot";
import { sendLeadEmails } from "@/lib/email/lead-emails";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const strArr = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : undefined;

async function handlePost(req: Request) {
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

  const sb = supabaseService();
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
    console.error("[api/nda-offmarket]", { code: error.code });
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const messageLines = [
    `[Capacité] ${str(body.capacity_range) ?? "—"}`,
    `[Types de biens] ${strArr(body.property_types)?.join(", ") ?? "—"}`,
    `[Zones] ${str(body.zones) ?? "—"}`,
    `[Calendrier] ${str(body.timeline) ?? "—"}`,
    `[NDA accepté] ${body.nda_accepted === true ? "oui" : "non"}`,
  ];
  await sendLeadEmails({
    contactEmail: body.email,
    firstName: fullName,
    phone: str(body.phone),
    subject: "NDA off-market",
    message: messageLines.join("\n"),
    type: "nda_offmarket",
    source: "nda-offmarket",
    locale: str(body.lang),
  });

  return NextResponse.json({ ok: true, nda_id: (data as { id?: string } | null)?.id });
}

export const dynamic = "force-dynamic";

// Sante des formulaires (oct. 2026) : chaque envoi est compte par resultat.
export const POST = withFormEvents("nda_offmarket", handlePost);
