// Sprint OPTIM-1A — POST /api/admin/revalidate
//
// Endpoint admin pour forcer la revalidation ISR d'une page publique
// depuis le BO (bouton 'Forcer le refresh' sur la fiche bien admin).
// Utile quand un admin veut voir immediatement ses modifs sans attendre
// le TTL revalidate (1800s pour /fr/biens/[slug] depuis le sprint C2).
//
// Body : { path: string }
//   - path doit commencer par "/fr/", "/en/" ou "/de/" (anti-abus)
//
// Reponse : { revalidated: true, path, now: number }
//
// Auth admin SSR obligatoire (meme pattern que /api/admin/upload-video).

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

const ALLOWED_PREFIXES = ["/fr/", "/en/", "/de/"];

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { path?: unknown };
  const path = typeof body.path === "string" ? body.path : "";
  if (!path || !ALLOWED_PREFIXES.some((p) => path.startsWith(p))) {
    return NextResponse.json(
      { error: "invalid_path", allowed_prefixes: ALLOWED_PREFIXES },
      { status: 400 },
    );
  }

  revalidatePath(path);
  return NextResponse.json({ revalidated: true, path, now: Date.now() });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
