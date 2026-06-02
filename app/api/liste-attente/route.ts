// Endpoint inscription Liste d'attente (avant-premiere 24h).
//
// Calque /api/lead. Ordre invariant : rateLimit -> parse -> validate ->
// honeypot -> Turnstile -> INSERT -> email -> 200.
//
// Stockage : table `leads` (type='waitlist', source='waitlist-home').
// Budget/budget valide/recherche serialises dans `message` via la
// convention [CHAMP] (parsable cote admin).
//
// Emails : destinataires internes = j.brebion + admin via internalTo
// array passe a sendLeadEmails. No-op silencieux si RESEND_API_KEY
// absent (config IONOS DNS Resend a venir).
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkHoneypot } from "@/lib/honeypot";
import { insertLeadWithConsent } from "@/lib/lead-insert";
import { shouldDropTestLead } from "@/lib/test-email";
import { sendLeadEmails } from "@/lib/email/lead-emails";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;

const WAITLIST_INTERNAL_TO = [
  "j.brebion@mapagroup.org",
  "admin@mapagroup.org",
];

const SUBJECT = "Liste d'attente — nouvelle inscription";

export async function POST(req: Request) {
  const limit = rateLimit(req, {
    windowMs: 60_000,
    max: 5,
    namespace: "waitlist",
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_in_ms: limit.resetIn },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown> & {
    turnstile_token?: string;
    honeypot?: string;
  };

  if (!checkHoneypot(body.honeypot as string | undefined)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const email = isEmail(body.email) ? body.email : undefined;
  const firstName = str(body.first_name);
  const lastName = str(body.last_name);
  const budget = str(body.budget);
  const search = str(body.search);
  const budgetValidatedRaw = body.budget_validated;
  const budgetValidated =
    budgetValidatedRaw === true ||
    budgetValidatedRaw === "yes" ||
    budgetValidatedRaw === "oui"
      ? "oui"
      : "non";

  if (!email || !firstName || !lastName || !budget || !search) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (body.rgpd_consent !== true) {
    return NextResponse.json({ error: "rgpd_required" }, { status: 400 });
  }

  if (shouldDropTestLead(email)) {
    return NextResponse.json({ ok: true });
  }

  const turnstileOk = await verifyTurnstile(
    body.turnstile_token,
    clientIp(req),
  );
  if (!turnstileOk) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });
  }

  const consentAt = new Date().toISOString();
  const lang = str(body.lang) ?? "fr";

  const composedMessage =
    `[BUDGET] ${budget}\n` +
    `[BUDGET_VALIDE] ${budgetValidated}\n\n` +
    `[RECHERCHE]\n${search}\n\n` +
    `[OBJET] ${SUBJECT}\n` +
    `[RGPD] consentement accordé le ${consentAt}`;

  const sb = supabaseServer();
  const res = await insertLeadWithConsent(
    sb,
    "leads",
    {
      email,
      first_name: firstName,
      last_name: lastName,
      message: composedMessage,
      type: "waitlist",
      source: "waitlist-home",
      lang,
      subject: SUBJECT,
    },
    consentAt,
  );
  if (!res.ok) {
    console.error("[api/liste-attente] supabase insert", res.error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // Emails best-effort : 2 destinataires internes (Julien + admin) +
  // confirmation client. AWAIT obligatoire en serverless Vercel (cf.
  // /api/lead). No-op silencieux si RESEND_API_KEY absent.
  await sendLeadEmails({
    contactEmail: email,
    firstName,
    lastName,
    subject: SUBJECT,
    message:
      `Budget : ${budget}\n` +
      `Budget validé : ${budgetValidated}\n\n` +
      `Recherche :\n${search}`,
    type: "waitlist",
    source: "waitlist-home",
    locale: lang,
    internalTo: WAITLIST_INTERNAL_TO,
  });

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
