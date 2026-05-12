"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";

export async function setPropertyPublished(id: string, isPublished: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("properties")
    .update({ is_published: isPublished })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/properties");
  revalidatePath("/fr/biens");
}

export async function setPropertyFeatured(id: string, isFeatured: boolean) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("properties")
    .update({ is_featured: isFeatured })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/properties");
  revalidatePath("/fr");
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
  const { error } = await supabase
    .from("properties")
    .update({ video_url: normalized })
    .eq("id", propertyId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/properties");
  revalidatePath(`/admin/properties/${propertyId}`);
  revalidatePath("/fr/biens");
}
