// Endpoint d'insertion des leads (formulaires publics).
//
// Ordre INVIOLABLE des opérations (voir bug UX 2026-05-12) :
//   1. rate limit         → 429
//   2. parsing body       → catch silent
//   3. validation données → 400 (invalid_email / missing_type)
//   4. verifyTurnstile    → 403 (turnstile_failed)
//   5. INSERT Supabase    → 500 (db_error) si Postgres rejette
//   6. 200 ok             → succès
//
// Tout INSERT doit se faire APRÈS le passage du captcha. Le front-end
// (components/forms/ContactForm.tsx) doit désactiver le submit tant que
// le widget Turnstile n'a pas fourni de token, sinon le serveur répond 403
// avant d'atteindre l'INSERT et l'utilisateur croit avoir échoué alors
// qu'aucune ligne n'a été créée.
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import type { LeadInsert } from "@/lib/types";
import { isPlausiblePhone } from "@/lib/countries";
import { insertLeadWithConsent } from "@/lib/lead-insert";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: Request) {
  const limit = rateLimit(req, {
    windowMs: 60_000,
    max: 5,
    namespace: "lead",
  });
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", retry_in_ms: limit.resetIn },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown> & {
    turnstile_token?: string;
  };

  if (!isEmail(body.email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (typeof body.type !== "string" || !body.type) {
    return NextResponse.json({ error: "missing_type" }, { status: 400 });
  }

  const turnstileOk = await verifyTurnstile(body.turnstile_token, clientIp(req));
  if (!turnstileOk) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });
  }

  // Consentement RGPD (BUG 7) : horodaté serveur si le client l'a coché.
  // Tracé aussi dans message (durable même si la colonne dédiée n'est
  // pas encore migrée — cf. insertLeadWithConsent).
  const consentAt =
    body.rgpd_consent === true ? new Date().toISOString() : undefined;
  const baseMessage =
    typeof body.message === "string" ? body.message : undefined;
  const message = consentAt
    ? `${baseMessage ?? ""}\n\n[RGPD] consentement accordé le ${consentAt}`.trim()
    : baseMessage;

  const lead: LeadInsert = {
    email: body.email,
    first_name:
      typeof body.first_name === "string" ? body.first_name : undefined,
    last_name:
      typeof body.last_name === "string" ? body.last_name : undefined,
    // Tolérant : on capture le lead même si le téléphone est mal formé,
    // on évite juste de stocker du bruit (validation serveur légère BUG 3).
    phone:
      typeof body.phone === "string" && isPlausiblePhone(body.phone)
        ? body.phone
        : undefined,
    message,
    type: body.type,
    property_ref:
      typeof body.property_ref === "string" ? body.property_ref : undefined,
    source: typeof body.source === "string" ? body.source : "website",
    lang: typeof body.lang === "string" ? body.lang : undefined,
    country: typeof body.country === "string" ? body.country : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
  };

  const sb = supabaseServer();
  const res = await insertLeadWithConsent(
    sb,
    "leads",
    lead as unknown as Record<string, unknown>,
    consentAt,
  );
  if (!res.ok) {
    console.error("[api/lead] supabase insert", res.error);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  // TODO: si RESEND_API_KEY présente, envoyer notification email via Resend (Étape 13 / déploiement)
  if (process.env.RESEND_API_KEY) {
    // À brancher quand la clé sera fournie
    // await resend.emails.send(...)
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
