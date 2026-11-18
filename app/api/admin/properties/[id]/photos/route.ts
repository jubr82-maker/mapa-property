// Enregistrement automatique des photos d'un bien (nov. 2026), appele par
// l'ecran des photos apres chaque changement (ajout, ordre, photo
// principale, amelioration, retour a l'original, suppression).
// Route plutot qu'action serveur : une action qui met a jour les pages
// publiques fait recalculer toute la page de l'admin dans sa reponse
// (documentation Next.js, server-actions.md) ; ici, seule la reponse JSON
// revient. Corps : { photos: string[] (adresses dans l'ordre, la premiere
// est la photo principale), removed: string[] (photos supprimees) }.
import { NextResponse } from "next/server";
import { requireAdminRoute } from "@/lib/admin/require-admin";
import { persistPropertyPhotos } from "@/lib/admin/property-photos-save";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PHOTOS = 200;

const urls = (v: unknown): string[] | null =>
  Array.isArray(v) && v.length <= MAX_PHOTOS && v.every((u) => typeof u === "string" && /^https?:\/\/\S+$/.test(u) && u.length <= 2000) ? (v as string[]) : null;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminRoute();
  if (!admin.ok) return admin.response;
  // Appel venant d'une autre origine que l'admin : refuse.
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return NextResponse.json({ ok: false, error: "bad_origin" }, { status: 403 });
  if (!(req.headers.get("content-type") ?? "").includes("application/json")) return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ ok: false, error: "bad_id" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { photos?: unknown; removed?: unknown } | null;
  const photos = urls(body?.photos);
  const removed = urls(body?.removed ?? []);
  if (!photos || !removed) return NextResponse.json({ ok: false, error: "bad_body" }, { status: 400 });
  const r = await persistPropertyPhotos(admin.supabase, id, photos, removed);
  return NextResponse.json(r, { status: r.ok ? 200 : 500, headers: { "cache-control": "no-store" } });
}
