import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";

export const dynamic = "force-dynamic";

// Oct. 2026 : source retiree par decision de Julien (pas d'analytique
// Cloudflare, pas de jeton Vercel a portee "Full Account", pas de service
// facture a l'usage). Plus aucun appel exterieur ; route conservee
// (suppression de fichier soumise a accord) et toujours sous garde admin.
export async function GET() {
  const adminCheck = await requireAdminRoute();
  if (!adminCheck.ok) return adminCheck.response;
  return NextResponse.json({ ok: false, reason: "removed" }, { status: 410 });
}
