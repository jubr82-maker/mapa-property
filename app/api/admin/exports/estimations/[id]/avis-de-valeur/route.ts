// Avis de valeur MAPA Property, PDF (oct. 2026).
//   GET  ?lang=fr|en|de           : avis sans annexe ;
//   POST { lang, annexes }        : avis avec les pages d'annexes a
//                                   completer dans le navigateur.
// Aucun fichier joint n'est recu ni stocke : seulement des metadonnees
// (legendes, proportions, nombres de pages, noms), bornees par
// sanitizeAnnexMeta. Admin de la liste en session aal2 uniquement
// (requireAdminRoute), debit limite, telechargement direct. Chaque
// generation est inscrite au journal de l'admin (bo_audit_log).
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { rateLimit } from "@/lib/rate-limit";
import { logAdminAction } from "@/lib/pilotage/audit";
import { pdfResponse } from "@/lib/admin/exports/http";
import { generateValueOpinionPdf } from "@/lib/estimation/value-opinion-generate";
import { EMPTY_ANNEXES, sanitizeAnnexMeta, type AnnexMeta } from "@/lib/estimation/value-opinion-annex-layout";
import {
  VALUE_OPINION_LANGS,
  type ValueOpinionEstimation,
  type ValueOpinionLang,
} from "@/lib/estimation/value-opinion-pdf";

export const dynamic = "force-dynamic";

async function handle(actorEmail: string | null | undefined, id: string, langRaw: unknown, annexes: AnnexMeta) {
  const lang = langRaw as ValueOpinionLang;
  if (!VALUE_OPINION_LANGS.includes(lang)) {
    return NextResponse.json({ error: "invalid_lang" }, { status: 400 });
  }
  const { data: row } = await supabaseService()
    .from("estimation_requests")
    .select("id,created_at,contact_name,inputs,client_output,internal_output")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Point d'entree unique, le meme que les PDF d'essai.
  const buffer = await generateValueOpinionPdf(row as unknown as ValueOpinionEstimation, lang, { annexes });

  await logAdminAction({
    actorEmail,
    action: "estimation_value_opinion",
    targetTable: "estimation_requests",
    targetId: id,
    diff: { lang, photos: annexes.photos.length, plans: annexes.plans.length, documents: annexes.documents.length },
  });
  return pdfResponse(buffer, `mapa-avis-de-valeur-${id.slice(0, 8)}-${lang}.pdf`);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;
  // 10 avis par tranche de 10 minutes : generation couteuse.
  const limit = rateLimit(req, { windowMs: 10 * 60_000, max: 10, namespace: "value-opinion" });
  if (!limit.ok) return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  const { id } = await params;
  return handle(admin.user.email, id, new URL(req.url).searchParams.get("lang"), EMPTY_ANNEXES);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;
  const limit = rateLimit(req, { windowMs: 10 * 60_000, max: 10, namespace: "value-opinion" });
  if (!limit.ok) return NextResponse.json({ error: "rate_limit" }, { status: 429 });
  const { id } = await params;
  let body: { lang?: unknown; annexes?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  return handle(admin.user.email, id, body.lang, sanitizeAnnexMeta(body.annexes));
}
