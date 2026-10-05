import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { createHash } from "node:crypto";
import { supabaseService } from "@/lib/supabase-service";

export const runtime = "nodejs"; // node:crypto requis
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { propertyId?: string; locale?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body vide : on tombera sur la validation ci-dessous
  }

  // Audit de securite (oct. 2026) : entrees bornees et limite de debit
  // (OWASP ASVS 5.1.3, 11.1.4) contre le remplissage de property_views.
  const limit = rateLimit(req, { windowMs: 60_000, max: 60, namespace: "track-view" });
  if (!limit.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }
  if (
    !body.propertyId ||
    typeof body.propertyId !== "string" ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(body.propertyId)
  ) {
    return NextResponse.json({ error: "missing_property_id" }, { status: 400 });
  }
  const locale = typeof body.locale === "string" && ["fr", "en", "de"].includes(body.locale) ? body.locale : null;

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0";
  const ua = req.headers.get("user-agent") ?? "";
  const referer = req.headers.get("referer")?.slice(0, 500) ?? null;
  const visitorHash = createHash("sha256")
    .update(`${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);

  try {
    const sb = supabaseService();
    const { error } = await sb.from("property_views").insert({
      property_id: body.propertyId,
      visitor_hash: visitorHash,
      locale,
      referer,
    });
    // Ignore unique-violation (23505) = vue déjà comptée aujourd'hui.
    // Ignore aussi 42P01 (relation absente) = table pas encore migrée.
    if (error && error.code !== "23505" && error.code !== "42P01") {
      console.error("[track-view]", error.message);
    }
  } catch (e) {
    console.error("[track-view] exception", e);
  }

  return NextResponse.json({ ok: true });
}
