// Avis de valeur MAPA Property, PDF (oct. 2026). GET ?lang=fr|en|de.
// Admin de la liste en session aal2 uniquement (requireAdminRoute),
// debit limite, telechargement direct : le fichier n'est stocke nulle part.
// Chaque generation est inscrite au journal de l'admin (bo_audit_log).
import { NextResponse } from "next/server";
import { getMessages } from "next-intl/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { supabaseService } from "@/lib/supabase-service";
import { rateLimit } from "@/lib/rate-limit";
import { logAdminAction } from "@/lib/pilotage/audit";
import { pdfResponse } from "@/lib/admin/exports/http";
import {
  buildValueOpinionPdf,
  VALUE_OPINION_LANGS,
  type ValueOpinionEstimation,
  type ValueOpinionLang,
} from "@/lib/estimation/value-opinion-pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;

  // 10 avis par tranche de 10 minutes : generation couteuse (9 pages).
  const limit = rateLimit(req, { windowMs: 10 * 60_000, max: 10, namespace: "value-opinion" });
  if (!limit.ok) return NextResponse.json({ error: "rate_limit" }, { status: 429 });

  const { id } = await params;
  const lang = new URL(req.url).searchParams.get("lang") as ValueOpinionLang | null;
  if (!lang || !VALUE_OPINION_LANGS.includes(lang)) {
    return NextResponse.json({ error: "invalid_lang" }, { status: 400 });
  }

  const { data: row } = await supabaseService()
    .from("estimation_requests")
    .select("id,created_at,contact_name,inputs,client_output,internal_output")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const messages = (await getMessages({ locale: lang })) as Record<string, unknown>;
  const buffer = await buildValueOpinionPdf(row as unknown as ValueOpinionEstimation, lang, messages);

  await logAdminAction({
    actorEmail: admin.user.email,
    action: "estimation_value_opinion",
    targetTable: "estimation_requests",
    targetId: id,
    diff: { lang },
  });

  return pdfResponse(buffer, `mapa-avis-de-valeur-${id.slice(0, 8)}-${lang}.pdf`);
}
