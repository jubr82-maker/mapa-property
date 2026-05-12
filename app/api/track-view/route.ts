import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs"; // node:crypto requis
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { propertyId?: string; locale?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body vide : on tombera sur la validation ci-dessous
  }

  if (!body.propertyId || typeof body.propertyId !== "string") {
    return NextResponse.json({ error: "missing_property_id" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0";
  const ua = req.headers.get("user-agent") ?? "";
  const referer = req.headers.get("referer") ?? null;
  const visitorHash = createHash("sha256")
    .update(`${ip}|${ua}`)
    .digest("hex")
    .slice(0, 32);

  try {
    const sb = supabaseServer();
    const { error } = await sb.from("property_views").insert({
      property_id: body.propertyId,
      visitor_hash: visitorHash,
      locale: body.locale ?? null,
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
