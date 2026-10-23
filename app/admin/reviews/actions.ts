"use server";

// Avis clients (oct. 2026). Cause de l'echec de creation (PROUVE) : les
// donnees envoyees contenaient une colonne "lang", absente de
// public.reviews (la langue est source_lang) ; Supabase refusait alors
// toute la ligne, et le message reel etait remplace par un texte vague.
// Les actions n'ecrivent plus que dans les colonnes reelles
// (lib/reviews.ts) et RETOURNENT le motif de l'echec en clair au lieu de
// lever une exception (dont Next.js masque le texte en production).
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { buildReviewWrite, reviewDbErrorReason, type DbError, type ReviewFormInput } from "@/lib/reviews";

export type ReviewActionResult = { ok: true } | { ok: false; error: string };

const tReviews = () => getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_reviews" });

function readForm(formData: FormData): ReviewFormInput {
  const s = (k: string) => String(formData.get(k) ?? "");
  return {
    name: s("name"),
    rating: s("rating"),
    review_date: s("review_date"),
    lang: s("lang"),
    text: s("text"),
    carousel: formData.get("carousel") === "on",
    previous_lang: s("previous_lang") || undefined,
  };
}

async function dbFailure(e: DbError): Promise<ReviewActionResult> {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_notices" });
  const r = reviewDbErrorReason(e);
  console.error("[admin/reviews] ecriture refusee", { code: e.code ?? null });
  return { ok: false, error: t(r.key, { value: r.value }) };
}

function revalidateReviews() {
  revalidatePath("/admin/reviews");
  // Accueil public (carrousel des avis), trois langues : les trois adresses
  // seules (oct. 2026, quotas Vercel).
  for (const l of ["fr", "en", "de"]) revalidatePath(`/${l}`);
}

export async function createReview(formData: FormData): Promise<ReviewActionResult> {
  // Garde serveur : admin de la liste en session aal2 ; motif clair sinon.
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: (await tReviews())("err_session") };
  const built = buildReviewWrite(readForm(formData));
  if (!built.ok) return { ok: false, error: (await tReviews())(built.error) };
  const supabase = admin.supabase;
  // Insertion sans relecture de la ligne : la reponse ne depend pas des
  // regles de lecture (un avis non publie reste invisible au public).
  const { error } = await supabase.from("reviews").insert({ ...built.data, source: "manuel" });
  if (error) return dbFailure(error);
  revalidateReviews();
  return { ok: true };
}

export async function updateReview(id: string, formData: FormData): Promise<ReviewActionResult> {
  // Garde serveur : admin de la liste en session aal2 ; motif clair sinon.
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: (await tReviews())("err_session") };
  const built = buildReviewWrite(readForm(formData));
  if (!built.ok) return { ok: false, error: (await tReviews())(built.error) };
  const supabase = admin.supabase;
  // Nombre de lignes modifiees, sans relecture (independant des regles de
  // lecture) : 0 = avis introuvable ou ecriture refusee sans erreur.
  const { count, error } = await supabase.from("reviews").update(built.data, { count: "exact" }).eq("id", id);
  if (error) return dbFailure(error);
  if (!count) return { ok: false, error: (await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_notices" }))("db_not_found") };
  revalidateReviews();
  return { ok: true };
}

export async function deleteReview(id: string): Promise<ReviewActionResult> {
  // Garde serveur : admin de la liste en session aal2 ; motif clair sinon.
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: (await tReviews())("err_session") };
  const supabase = admin.supabase;
  const { count, error } = await supabase.from("reviews").delete({ count: "exact" }).eq("id", id);
  if (error) return dbFailure(error);
  if (!count) return { ok: false, error: (await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_notices" }))("db_not_found") };
  revalidateReviews();
  return { ok: true };
}
