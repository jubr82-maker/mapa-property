// Endpoint demande de NDA off-market (BUG 5).
//
// Écriture Supabase : table `leads` UNIQUEMENT (règle inviolable
// CLAUDE.md — pas de nouvelle table créée ici). type="nda_request",
// property_ref = id du bien off-market. La consigne RGPD est tracée
// dans `message` (jamais perdue) + tentative best-effort sur la colonne
// `rgpd_consent_at` (no-op tant que la migration BUG 7 n'est pas
// appliquée — n'échoue jamais l'enregistrement).
//
// Email : si RESEND_API_KEY présent → notification à
// j.brebion@mapagroup.org. Sinon log warn (jamais de throw).
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkHoneypot } from "@/lib/honeypot";
import { isPlausiblePhone } from "@/lib/countries";
import { insertLeadWithConsent } from "@/lib/lead-insert";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

const NDA_NOTIFY_TO = "j.brebion@mapagroup.org";

async function notifyResend(subject: string, text: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[api/nda-request] Resend non configuré — email stub:", subject);
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MAPA Property <noreply@mapaproperty.lu>",
        to: [NDA_NOTIFY_TO],
        subject,
        text,
      }),
    });
    if (!res.ok) {
      console.error("[api/nda-request] Resend HTTP", res.status);
    }
  } catch (e) {
    console.error("[api/nda-request] Resend error", (e as Error).message);
  }
}

export async function POST(req: Request) {
  const limit = rateLimit(req, {
    windowMs: 60_000,
    max: 5,
    namespace: "nda-request",
  });
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown> & {
    turnstile_token?: string;
    honeypot?: string;
  };

  if (!checkHoneypot(body.honeypot as string | undefined)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const firstName = str(body.first_name);
  const lastName = str(body.last_name);
  const propertyRef = str(body.property_ref);
  if (
    !isEmail(body.email) ||
    !firstName ||
    !lastName ||
    !propertyRef ||
    body.nda_accepted !== true ||
    body.proof_of_funds !== true ||
    body.rgpd_consent !== true
  ) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const turnstileOk = await verifyTurnstile(
    body.turnstile_token,
    clientIp(req),
  );
  if (!turnstileOk) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });
  }

  const phone =
    typeof body.phone === "string" && isPlausiblePhone(body.phone)
      ? body.phone
      : undefined;
  const consentAt = new Date().toISOString();
  const project = str(body.message) ?? "";
  const propertyTitle = str(body.property_title) ?? propertyRef;
  const message =
    `${project}\n\n` +
    `[Bien] ${propertyTitle} (${propertyRef})\n` +
    `[NDA] accepté · [Capacité financière] confirmée\n` +
    `[RGPD] consentement accordé le ${consentAt}`;

  // IMPORTANT : pas de .select()/RETURNING. `leads` est privée — l'anon
  // a une policy INSERT mais PAS de policy SELECT, donc INSERT…RETURNING
  // est rejeté (« violates row-level security policy »). On insère sans
  // retour, comme /api/lead (chemin prouvé). Le type "offmarket_request"
  // est RLS-safe ; la nature NDA est portée par `source` (filtrable
  // admin) et l'audit consentement reste dans `message`.
  const sb = supabaseServer();
  const ins = await insertLeadWithConsent(
    sb,
    "leads",
    {
      email: body.email,
      first_name: firstName,
      last_name: lastName,
      phone,
      message,
      type: "offmarket_request",
      property_ref: propertyRef,
      source: `nda_request:offmarket:${propertyRef}`,
      country: str(body.country),
      lang: str(body.lang),
    },
    consentAt,
  );

  if (!ins.ok) {
    console.error("[api/nda-request] supabase insert", ins.error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  await notifyResend(
    `Nouvelle demande NDA — ${propertyTitle}`,
    `Nouvelle demande de NDA contractuel.\n\n` +
      `Bien : ${propertyTitle} (réf ${propertyRef})\n` +
      `Demandeur : ${firstName} ${lastName}\n` +
      `Email : ${body.email}\n` +
      `Téléphone : ${phone ?? "—"}\n` +
      `Pays : ${str(body.country) ?? "—"}\n` +
      `Projet : ${project || "—"}\n\n` +
      `NDA accepté · capacité confirmée · RGPD ${consentAt}`,
  );

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
