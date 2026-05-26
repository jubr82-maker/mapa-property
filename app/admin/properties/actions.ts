"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

/**
 * Sprint OPTIM-1A : helper de lecture du slug d'un bien par id. Utilise
 * pour cibler revalidatePath sur la fiche SSG generee par C2
 * generateStaticParams. Si fetch echoue OU slug null : retourne null,
 * le caller console.warn + skip l'invalidation de la fiche (la liste
 * /fr/biens reste invalidee, et la fiche se rafraichit au revalidate
 * 30min ou via le bouton refresh admin C5).
 */
async function fetchPropertySlug(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  id: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("properties")
    .select("slug")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("[admin/properties] fetchSlug error:", error.message);
    return null;
  }
  const slug = (data as { slug: string | null } | null)?.slug;
  return typeof slug === "string" && slug.length > 0 ? slug : null;
}

export async function setPropertyPublished(id: string, isPublished: boolean) {
  const supabase = await createSupabaseServerClient();
  const slug = await fetchPropertySlug(supabase, id);
  const { error } = await supabase
    .from("properties")
    .update({ is_published: isPublished })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/properties");
  revalidatePath("/fr/biens");
  // Sprint OPTIM-1A : invalide la fiche SSG (C2) pour fraicheur immediate.
  if (slug) revalidatePath(`/fr/biens/${slug}`);
}

export async function setPropertyFeatured(id: string, isFeatured: boolean) {
  const supabase = await createSupabaseServerClient();
  const slug = await fetchPropertySlug(supabase, id);
  const { error } = await supabase
    .from("properties")
    .update({ is_featured: isFeatured })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/properties");
  revalidatePath("/fr");
  // Sprint OPTIM-1A : la fiche elle-meme peut afficher un badge featured
  // dans certains rendus -> on l'invalide aussi par securite (cout marginal).
  if (slug) revalidatePath(`/fr/biens/${slug}`);
}

/**
 * POL4-A2 (AGENT CAMILLE) — Met à jour titre FR, description FR (HTML
 * formaté via RichTextEditor TipTap d'ELISE) et prix d'un bien Apimo.
 * Garde rétrocompat avec updatePropertyVideoUrl (form vidéo séparé).
 *
 * Champ vide ('') → null (respecte les colonnes nullable). Tous les
 * champs sont OPTIONNELS : seul ce qui est passé est mis à jour.
 */
export async function updateProperty(
  id: string,
  data: {
    title_fr?: string | null;
    description_fr?: string | null;
    price?: number | null;
  },
) {
  const supabase = await createSupabaseServerClient();
  const update: Record<string, unknown> = {};
  if (data.title_fr !== undefined) {
    const t = (data.title_fr ?? "").trim();
    update.title_fr = t.length > 0 ? t : null;
  }
  if (data.description_fr !== undefined) {
    const d = (data.description_fr ?? "").trim();
    update.description_fr = d.length > 0 ? d : null;
  }
  if (data.price !== undefined) {
    update.price =
      data.price == null || Number.isNaN(data.price) ? null : data.price;
  }
  if (Object.keys(update).length === 0) return { ok: true };
  const slug = await fetchPropertySlug(supabase, id);
  const { error } = await supabase
    .from("properties")
    .update(update)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${id}`);
  revalidatePath("/fr/biens");
  // Sprint OPTIM-1A : invalide la fiche SSG (C2) pour fraicheur immediate.
  if (slug) revalidatePath(`/fr/biens/${slug}`);
  return { ok: true };
}

/**
 * Met à jour l'URL vidéo de présentation d'un bien (passe ?? null pour vider).
 * Pas d'upload natif dans cette passe — Phase B (Supabase Storage + signed URLs).
 */
export async function updatePropertyVideoUrl(
  propertyId: string,
  videoUrl: string | null,
) {
  const supabase = await createSupabaseServerClient();
  const normalized =
    typeof videoUrl === "string" && videoUrl.trim().length > 0
      ? videoUrl.trim()
      : null;
  const slug = await fetchPropertySlug(supabase, propertyId);
  const { error } = await supabase
    .from("properties")
    .update({ video_url: normalized })
    .eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/fr/biens");
  // Sprint OPTIM-1A : invalide la fiche SSG (C2) pour fraicheur immediate.
  if (slug) revalidatePath(`/fr/biens/${slug}`);
}
