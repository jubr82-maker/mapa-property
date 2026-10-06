"use server";

import { revalidatePath } from "next/cache";
import { revalidatePublicBlogPages } from "@/lib/revalidate-property";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { sanitizeArticleHtml } from "@/lib/security/sanitize";
import { processUploadedImage } from "@/lib/images/process-upload";
import { MAX_PHOTO_BYTES, MAX_PHOTO_MB } from "@/lib/images/limits";
import { dbErrorReason, type DbError } from "@/lib/admin/db-error";
import { dbFailure } from "@/lib/admin/action-result";

/** Bucket public des couvertures du blog (cree par le site v28). */
const COVER_BUCKET = "blog-covers";

/** Adresse d'image acceptee : https uniquement, sinon rien. */
function safeImageUrl(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  try {
    return new URL(s).protocol === "https:" ? s : null;
  } catch {
    return null;
  }
}

/** Corps d'article : nettoye a l'enregistrement (en plus de l'affichage). */
function cleanBody(v: FormDataEntryValue | null): string | null {
  const html = sanitizeArticleHtml(String(v ?? ""));
  return html.trim() ? html : null;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPostPayload(formData: FormData) {
  const titleFr = String(formData.get("title_fr") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim();
  if (!slug && titleFr) slug = slugify(titleFr);

  return {
    slug,
    title_fr: titleFr || null,
    title_en: String(formData.get("title_en") ?? "").trim() || null,
    title_de: String(formData.get("title_de") ?? "").trim() || null,
    excerpt_fr: String(formData.get("excerpt_fr") ?? "").trim() || null,
    excerpt_en: String(formData.get("excerpt_en") ?? "").trim() || null,
    excerpt_de: String(formData.get("excerpt_de") ?? "").trim() || null,
    content_fr: cleanBody(formData.get("content_fr")),
    content_en: cleanBody(formData.get("content_en")),
    content_de: cleanBody(formData.get("content_de")),
    cover_image: safeImageUrl(String(formData.get("cover_image") ?? "")),
    primary_tag: String(formData.get("primary_tag") ?? "").trim() || null,
    author: String(formData.get("author") ?? "").trim() || null,
    is_published: formData.get("is_published") === "on",
    published_at: String(formData.get("published_at") ?? "") || null,
  };
}

export type BlogActionResult = { ok: true } | { ok: false; error: string };

/** Motif clair d'un echec (garde ou base), jamais un message generique. */
async function blogFailure(e: DbError | "session"): Promise<BlogActionResult> {
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_notices" });
  if (e === "session") return { ok: false, error: t("err_session") };
  const r = dbErrorReason(e);
  console.error("[admin/blog] ecriture refusee", { code: e.code ?? null });
  return { ok: false, error: t(r.key, { value: r.value }) };
}

export async function createBlogPost(formData: FormData): Promise<BlogActionResult> {
  // Garde serveur : admin de la liste en session aal2 ; motif clair sinon.
  const admin = await requireAdmin();
  if (!admin.ok) return blogFailure("session");
  const supabase = admin.supabase;
  const { data, error } = await supabase
    .from("blog_posts")
    .insert(buildPostPayload(formData))
    .select("id")
    .single();
  if (error) return blogFailure(error);
  revalidatePath("/admin/blog");
  revalidatePublicBlogPages(data.id);
  redirect(`/admin/blog/${data.id}/edit`);
}

export async function updateBlogPost(id: string, formData: FormData): Promise<BlogActionResult> {
  // Garde serveur : admin de la liste en session aal2 ; motif clair sinon.
  const admin = await requireAdmin();
  if (!admin.ok) return blogFailure("session");
  const supabase = admin.supabase;
  const { count, error } = await supabase
    .from("blog_posts")
    .update(buildPostPayload(formData), { count: "exact" })
    .eq("id", id);
  if (error) return blogFailure(error);
  if (!count) return blogFailure({ code: "PGRST116" });
  revalidatePath("/admin/blog");
  // Toutes les langues, l'article et l'accueil ; IndexNow (oct. 2026).
  revalidatePublicBlogPages(id);
  return { ok: true };
}

export async function deleteBlogPost(id: string): Promise<BlogActionResult> {
  // Garde serveur : admin de la liste en session aal2 ; motif clair sinon.
  const admin = await requireAdmin();
  if (!admin.ok) return blogFailure("session");
  const supabase = admin.supabase;
  const { count, error } = await supabase.from("blog_posts").delete({ count: "exact" }).eq("id", id);
  if (error) return blogFailure(error);
  if (!count) return blogFailure({ code: "PGRST116" });
  revalidatePath("/admin/blog");
  revalidatePublicBlogPages();
  redirect("/admin/blog");
}

export type UploadCoverResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Envoi d'une image du blog (couverture ou image du texte) dans le bucket
 * public blog-covers (seconde passe, oct. 2026). Garde aal2 ; image
 * reconvertie cote serveur (orientation, metadonnees EXIF et GPS retirees,
 * WebP) ; nom <adresse-de-la-page>-<horodatage>.webp, sans caractere a
 * encoder. Resultat structure, jamais d'exception (message lisible).
 */
export async function uploadBlogImage(formData: FormData): Promise<UploadCoverResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, error: (await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_notices" }))("err_session") };
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_blog" });
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: t("err_upload_type") };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: t("err_upload_size", { max: MAX_PHOTO_MB }) };
  let processed;
  try {
    processed = await processUploadedImage(Buffer.from(await file.arrayBuffer()));
  } catch {
    return { ok: false, error: t("err_upload_type") };
  }
  const base = slugify(String(formData.get("slug") ?? "")).slice(0, 60) || "article";
  const path = `${base}-${Date.now()}.${processed.extension}`;
  try {
    const supabase = admin.supabase;
    const { error } = await supabase.storage
      .from(COVER_BUCKET)
      .upload(path, processed.buffer, { cacheControl: "31536000", upsert: false, contentType: processed.contentType });
    if (error) {
      return { ok: false, error: t("err_upload_failed", { reason: (await dbFailure(error, "blog-covers")).message }) };
    }
    const { data } = supabase.storage.from(COVER_BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  } catch (e) {
    return { ok: false, error: t("err_upload_failed", { reason: e instanceof Error ? e.message : String(e) }) };
  }
}
