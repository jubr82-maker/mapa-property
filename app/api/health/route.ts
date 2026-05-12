import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

  let dbOk = false;
  try {
    const sb = supabaseServer();
    const { error } = await sb.from("properties").select("id").limit(1);
    dbOk = !error;
  } catch {
    dbOk = false;
  }

  const status = dbOk ? "ok" : "error";
  const code = dbOk ? 200 : 503;

  return NextResponse.json(
    {
      status,
      timestamp,
      db: dbOk,
      supabase_storage: true,
      version,
    },
    {
      status: code,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
