import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

/**
 * POST /api/track — endpoint d'ingestion tracking_events.
 *
 * Sécurité :
 *   - RGPD : ip_hash uniquement (sha256 IP + salt env), pas d'IP brute en BDD.
 *   - Rate limit basique : 60 events/IP/minute (mémoire process — Vercel scale ~OK pour V1).
 *   - Validation event_type contre liste fermée (cf. CHECK constraint SQL).
 *   - Best-effort : si insert échoue, retourne 200 quand même (ne casse pas l'UX client).
 */

const VALID_EVENTS = new Set([
  "page_view",
  "cta_click",
  "form_step_complete",
  "form_submit",
  "contact_reveal",
  "property_view",
  "property_favorite",
  "estimation_compute",
  "emprunt_simulate",
  "rendement_simulate",
  "search_query",
  "scroll_depth_75",
  "exit_intent",
  "bounce",
]);

// Rate limit en mémoire (per Vercel function instance — best-effort, pas global)
const RATE_LIMIT_PER_MIN = 60;
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(ipHash: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ipHash);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ipHash, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= RATE_LIMIT_PER_MIN) return false;
  bucket.count++;
  return true;
}

function hashIp(ip: string): string {
  const salt = process.env.TRACKING_IP_SALT ?? "mapa_default_salt_change_me_2026";
  return createHash("sha256").update(ip + salt).digest("hex").slice(0, 32);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as null | {
      session_id?: string;
      event_type?: string;
      event_data?: Record<string, unknown>;
      page?: string;
      referrer?: string;
      locale?: string;
    };

    if (!body || !body.session_id || !body.event_type || !VALID_EVENTS.has(body.event_type)) {
      return NextResponse.json({ ok: true }, { status: 200 }); // best-effort silent
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "0.0.0.0";
    const ipHash = hashIp(ip);

    if (!rateLimit(ipHash)) {
      return NextResponse.json({ ok: true, rate_limited: true }, { status: 200 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("tracking_events").insert({
      session_id: body.session_id,
      event_type: body.event_type,
      event_data: body.event_data ?? null,
      page: body.page ?? null,
      referrer: body.referrer ?? null,
      user_agent: req.headers.get("user-agent") ?? null,
      ip_hash: ipHash,
      locale: body.locale ?? null,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/track] error:", err);
    return NextResponse.json({ ok: true }, { status: 200 }); // never fail loud
  }
}

export const dynamic = "force-dynamic";
