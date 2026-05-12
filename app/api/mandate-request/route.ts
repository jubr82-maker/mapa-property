import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { verifyTurnstile, clientIp } from "@/lib/turnstile";
import { checkHoneypot } from "@/lib/honeypot";

const isEmail = (s: unknown): s is string =>
  typeof s === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

const TRANSACTION_TYPES = new Set(["search", "buy", "sell", "rent"]);

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function pickNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export async function POST(req: Request) {
  const limit = rateLimit(req, { windowMs: 60_000, max: 5, namespace: "mandate" });
  if (!limit.ok) return NextResponse.json({ error: "rate_limited" }, { status: 429 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown> & {
    captchaToken?: string;
    honeypot?: string;
  };

  if (!checkHoneypot(body.honeypot as string | undefined)) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  if (!isEmail(body.email)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Compose client_name from first_name + last_name, or use name directly
  const firstName = pickString(body.first_name) ?? pickString(body.firstName);
  const lastName = pickString(body.last_name) ?? pickString(body.lastName);
  const directName = pickString(body.name);
  const composedName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const clientName = directName ?? (composedName.length > 0 ? composedName : undefined);

  if (!clientName) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // transaction_type : default to 'search' (mandat de recherche)
  const rawTxType = pickString(body.transaction_type) ?? pickString(body.transactionType);
  const transactionType =
    rawTxType && TRANSACTION_TYPES.has(rawTxType) ? rawTxType : "search";

  const ok = await verifyTurnstile(body.captchaToken, clientIp(req));
  if (!ok) return NextResponse.json({ error: "turnstile_failed" }, { status: 403 });

  const city = pickString(body.city);
  const country = pickString(body.country);
  const phone = pickString(body.phone);
  const propertyType = pickString(body.property_type) ?? pickString(body.propertyType) ?? pickString(body.type);
  const budgetMin = pickNumber(body.budget_min) ?? pickNumber(body.budgetMin);
  const budgetMax = pickNumber(body.budget_max) ?? pickNumber(body.budgetMax);
  const notes = pickString(body.message) ?? pickString(body.notes);

  const payload: Record<string, unknown> = {
    client_name: clientName,
    client_email: body.email,
    transaction_type: transactionType,
    status: "draft",
  };
  if (phone) payload.client_phone = phone;
  if (country) payload.client_country = country;
  if (city) {
    payload.client_city = city;
    payload.zones = [city];
  }
  if (propertyType) payload.property_type = propertyType;
  if (budgetMin !== undefined) payload.budget_min = budgetMin;
  if (budgetMax !== undefined) payload.budget_max = budgetMax;
  if (notes) payload.notes = notes;

  const sb = supabaseServer();
  const { error } = await sb.from("mandats_recherche").insert(payload as never);

  if (error) {
    console.error("[api/mandate-request]", error.message);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.log("[api/mandate-request] Resend stubbed:", {
      email: body.email,
      transactionType,
    });
  }

  return NextResponse.json({ ok: true });
}

export const dynamic = "force-dynamic";
