"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { revalidateBlogChange } from "@/lib/revalidate-property";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { sanitizeArticleHtml } from "@/lib/security/sanitize";
import { processUploadedImage } from "@/lib/images/process-upload";
import { MAX_PHOTO_BYTES, MAX_PHOTO_MB } from "@/lib/images/limits";
import { dbErrorReason, type DbError } from "@/lib/admin/db-error";
import { dbFailure } from "@/lib/admin/action-result";
import { faqTag } from "@/lib/faq/data";
import { blogFaqKey } from "@/lib/faq/keys";

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

function seoText(v: FormDataEntryValue | null, max: number): string | null {
  const s = String(v ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, max);
  return s || null;
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
  // Adresse toujours en minuscules, sans accents ni espaces (oct. 2026),
  // a partir du champ saisi, sinon du titre en francais.
  const slug = slugify(String(formData.get("slug") ?? "").trim() || titleFr);

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
    // Titre et description Google par langue (oct. 2026, SQL 25). Texte
    // simple, blancs normalises ; vides : null (le site prend alors le
    // titre et le resume de la meme langue).
    seo_title_fr: seoText(formData.get("seo_title_fr"), 200),
    seo_title_en: seoText(formData.get("seo_title_en"), 200),
    seo_title_de: seoText(formData.get("seo_title_de"), 200),
    seo_description_fr: seoText(formData.get("seo_description_fr"), 400),
    seo_description_en: seoText(formData.get("seo_description_en"), 400),
    seo_description_de: seoText(formData.get("seo_description_de"), 400),
    // Fin d'article standard (oct. 2026, SQL 27) : commune optionnelle et
    // affichage de la rubrique standard.
    commune: seoText(formData.get("commune"), 80),
    show_standard_ending: formData.get("show_standard_ending") === "on",
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
  const created = buildPostPayload(formData) as { slug?: string | null; commune?: string | null };
  revalidateBlogChange({ slugs: [created.slug], communes: [created.commune] });
  redirect(`/admin/blog/${data.id}/edit`);
}

export async function updateBlogPost(id: string, formData: FormData): Promise<BlogActionResult> {
  // Garde serveur : admin de la liste en session aal2 ; motif clair sinon.
  const admin = await requireAdmin();
  if (!admin.ok) return blogFailure("session");
  const supabase = admin.supabase;
  const payload = buildPostPayload(formData);
  const { data: before } = await supabase.from("blog_posts").select("slug, commune").eq("id", id).maybeSingle();
  const { count, error } = await supabase
    .from("blog_posts")
    .update(payload, { count: "exact" })
    .eq("id", id);
  if (error) return blogFailure(error);
  if (!count) return blogFailure({ code: "PGRST116" });
  // Adresse changee : les questions de l'article suivent (oct. 2026).
  const oldSlug = (before as { slug: string | null } | null)?.slug;
  if (oldSlug && payload.slug && blogFaqKey(oldSlug) !== blogFaqKey(payload.slug)) {
    const { error: faqErr } = await supabase.from("faqs").update({ page_key: blogFaqKey(payload.slug) }).eq("page_key", blogFaqKey(oldSlug));
    if (faqErr) console.error("[admin/blog] questions de l'article non deplacees", { code: faqErr.code ?? null });
    revalidateTag(faqTag(blogFaqKey(oldSlug)), { expire: 0 });
    revalidateTag(faqTag(blogFaqKey(payload.slug)), { expire: 0 });
  }
  revalidatePath("/admin/blog");
  // L'article (ancienne et nouvelle adresse), la liste, l'accueil, le
  // sitemap et les communes avant et apres ; IndexNow (oct. 2026).
  const prev = before as { slug: string | null; commune?: string | null } | null;
  const next = payload as { slug?: string | null; commune?: string | null };
  revalidateBlogChange({ slugs: [prev?.slug, next.slug], communes: [prev?.commune, next.commune] });
  return { ok: true };
}

export async function deleteBlogPost(id: string): Promise<BlogActionResult> {
  // Garde serveur : admin de la liste en session aal2 ; motif clair sinon.
  const admin = await requireAdmin();
  if (!admin.ok) return blogFailure("session");
  const supabase = admin.supabase;
  const { data: before } = await supabase.from("blog_posts").select("slug, commune").eq("id", id).maybeSingle();
  const { count, error } = await supabase.from("blog_posts").delete({ count: "exact" }).eq("id", id);
  if (error) return blogFailure(error);
  if (!count) return blogFailure({ code: "PGRST116" });
  revalidatePath("/admin/blog");
  const prev = before as { slug: string | null; commune?: string | null } | null;
  revalidateBlogChange({ slugs: [prev?.slug], communes: [prev?.commune] });
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
