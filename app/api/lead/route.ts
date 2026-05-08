import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import type { LeadInsert } from "@/lib/types";

const verifyTurnstile = async (token: string | undefined): Promise<boolean> => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // skip when not configured (MVP)
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      },
    );
    const json = (await res.json()) as { success?: boolean };
    return Boolean(json.success);
  } catch {
    return false;
  }
};

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown> & {
    turnstile_token?: string;
  };

  if (!isEmail(body.email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  if (typeof body.type !== "string" || !body.type) {
    return NextResponse.json({ error: "missing_type" }, { status: 400 });
  }

  const turnstileOk = await verifyTurnstile(body.turnstile_token);
  if (!turnstileOk) {
    return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });
  }

  const lead: LeadInsert = {
    email: body.email,
    first_name:
      typeof body.first_name === "string" ? body.first_name : undefined,
    last_name:
      typeof body.last_name === "string" ? body.last_name : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    message: typeof body.message === "string" ? body.message : undefined,
    type: body.type,
    property_ref:
      typeof body.property_ref === "string" ? body.property_ref : undefined,
    source: typeof body.source === "string" ? body.source : "website",
    lang: typeof body.lang === "string" ? body.lang : undefined,
    country: typeof body.country === "string" ? body.country : undefined,
    city: typeof body.city === "string" ? body.city : undefined,
  };

  const sb = supabaseServer();
  const { error } = await sb.from("leads").insert(lead);
  if (error) {
    console.error("[api/lead] supabase insert", error.message);
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
