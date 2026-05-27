// Sprint OPTIM-1A + OPTIM-1B C3 — POST /api/admin/revalidate
//
// Endpoint admin pour forcer la revalidation ISR de pages publiques.
//
// Modes d'auth (au moins un requis) :
//   1. Auth admin SSR (cookies Supabase). Usage : bouton "Forcer le refresh"
//      depuis le BO (fiche bien admin).
//   2. Header `X-Revalidate-Secret: ${process.env.REVALIDATE_SECRET}`.
//      Usage : scripts CLI (pnpm purge:offmarket). Si la var d'env est
//      absente, le mode secret est desactive (seul l'auth admin marche).
//
// Body (deux formes acceptees) :
//   - { path: string }         (legacy OPTIM-1A, single path)
//   - { paths: string[] }      (OPTIM-1B C3, batch — utile pour purger
//                                les 3 locales d'un coup)
//
// Anti-abus : chaque path doit commencer par "/fr/", "/en/" ou "/de/".
//
// Reponse : { revalidated: true, paths: string[], now: number }

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

const ALLOWED_PREFIXES = ["/fr/", "/en/", "/de/"];

function isAllowed(p: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => p.startsWith(prefix));
}

export async function POST(req: Request) {
  // ---- Auth : secret header OU user admin SSR.
  const secretEnv = process.env.REVALIDATE_SECRET;
  const secretHeader = req.headers.get("x-revalidate-secret");
  const hasValidSecret =
    typeof secretEnv === "string" &&
    secretEnv.length > 0 &&
    secretHeader === secretEnv;

  if (!hasValidSecret) {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  // ---- Body : accepte { path } (legacy) ou { paths: string[] }.
  const body = (await req.json().catch(() => ({}))) as {
    path?: unknown;
    paths?: unknown;
  };

  const collected: string[] = [];
  if (typeof body.path === "string" && body.path.length > 0) {
    collected.push(body.path);
  }
  if (Array.isArray(body.paths)) {
    for (const p of body.paths) {
      if (typeof p === "string" && p.length > 0) collected.push(p);
    }
  }

  // Dedupe + filter sur prefixes autorises.
  const unique = Array.from(new Set(collected));
  const invalid = unique.filter((p) => !isAllowed(p));
  if (invalid.length > 0) {
    return NextResponse.json(
      { error: "invalid_paths", invalid, allowed_prefixes: ALLOWED_PREFIXES },
      { status: 400 },
    );
  }
  if (unique.length === 0) {
    return NextResponse.json(
      { error: "no_paths_provided", expect: "{ path } or { paths: string[] }" },
      { status: 400 },
    );
  }

  for (const p of unique) {
    revalidatePath(p);
  }

  return NextResponse.json({
    revalidated: true,
    paths: unique,
    now: Date.now(),
  });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
