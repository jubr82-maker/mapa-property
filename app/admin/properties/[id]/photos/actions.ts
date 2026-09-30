"use server";

/**
 * Server actions photos biens classiques (Apimo) — POL4-A3 (AGENT HUGO).
 *
 * Schema réel : table SÉPARÉE `property_images` (rows : id, property_id,
 * url, sort) — PAS de colonne `images jsonb` sur `properties`. Cover =
 * `sort = 0`. Stratégie save : wipe-and-recreate l'ensemble des rows pour
 * ce property_id (simple, atomique en pratique grâce à transaction sup).
 *
 * Bucket Supabase : `property-images` (déjà créé et public côté dashboard
 * Julien). Path = `{propertyId}/{timestamp}-{random}.{ext}`.
 *
 * Pas de DELETE des fichiers orphelins en savePhotos : c'est `deletePhoto`
 * qui supprime du bucket. Si une row est retirée du state sans appeler
 * deletePhoto, le fichier reste dans le bucket (perte d'espace minime
 * acceptée — cleanup batch séparé si besoin).
 */

import { revalidatePath, revalidateTag } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { PROPERTIES_LIST_TAG } from "@/lib/data";
import { processUploadedImage } from "@/lib/images/process-upload";

const BUCKET = "property-images";

export interface PhotoData {
  url: string;
  path: string;
  isCover: boolean;
  order: number;
}

export async function uploadPropertyPhoto(
  propertyId: string,
  formData: FormData,
): Promise<{ url: string; path: string }> {
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Aucun fichier reçu.");

  // Mission "saisie et affichage des biens", point 4 — conversion server-
  // side systematique, quel que soit le format recu (HEIC/HEIF/JPEG/PNG/
  // WebP/TIFF) : oriente correctement, metadonnees EXIF/GPS retirees,
  // redimensionnee, encodee en WebP. Remplace la seule compression cote
  // navigateur (lib/image-compress.ts), qui ne sait pas decoder le HEIC
  // et retombait silencieusement sur le fichier brut non affichable.
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  let processed;
  try {
    processed = await processUploadedImage(inputBuffer);
  } catch (e) {
    console.error("[admin/properties/photos] conversion echouee", {
      code: (e as { code?: string })?.code ?? "unknown_error",
    });
    throw new Error(
      "Ce fichier ne peut pas être converti en image (format non reconnu ou fichier corrompu).",
    );
  }

  const supabase = await createSupabaseServerClient();
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${processed.extension}`;
  const path = `${propertyId}/${filename}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, processed.buffer, {
      cacheControl: "3600",
      upsert: false,
      contentType: processed.contentType,
    });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, path };
}

export async function savePropertyPhotos(
  propertyId: string,
  photos: PhotoData[],
): Promise<{ ok: true }> {
  const supabase = await createSupabaseServerClient();
  // Sprint OPTIM-1A : fetch slug pour invalidation ciblee fiche SSG (C2).
  const { data: slugRow, error: slugErr } = await supabase
    .from("properties")
    .select("slug")
    .eq("id", propertyId)
    .maybeSingle();
  if (slugErr) {
    console.warn("[admin/properties/photos] fetchSlug error:", slugErr.message);
  }
  const slug = (slugRow as { slug: string | null } | null)?.slug;
  const slugClean =
    typeof slug === "string" && slug.length > 0 ? slug : null;
  // Wipe existing rows pour ce property_id
  const { error: delErr } = await supabase
    .from("property_images")
    .delete()
    .eq("property_id", propertyId);
  if (delErr) throw new Error(delErr.message);
  // Re-insert avec sort = order ; cover = order 0
  if (photos.length > 0) {
    // Forcer ordre unique : cover (isCover true) en premier sort=0, sinon
    // respecter `order` envoyé par le client.
    const sorted = [...photos].sort((a, b) => {
      if (a.isCover && !b.isCover) return -1;
      if (!a.isCover && b.isCover) return 1;
      return a.order - b.order;
    });
    const rows = sorted.map((p, idx) => ({
      property_id: propertyId,
      url: p.url,
      sort: idx,
    }));
    const { error: insErr } = await supabase.from("property_images").insert(rows);
    if (insErr) throw new Error(insErr.message);
  }
  // La cover (fetchAllPropertiesWithCover) depend de property_images —
  // invalider le cache tag pour que la grille /biens et les biens
  // similaires reflètent immédiatement la nouvelle cover/l'ordre photos.
  // PAS de revalidatePath sur /admin/properties/{id} elle-même : cette
  // page héberge aussi PropertyEditForm, dont la saisie en cours (non
  // encore envoyée via son propre bouton Enregistrer) serait effacée à
  // l'affichage par le refresh RSC immédiat que revalidatePath déclenche
  // sur la page actuellement affichée. PhotoManager reflète déjà l'état
  // des photos localement (state client) — inutile de forcer un refresh
  // serveur de cette page pour ça.
  revalidateTag(PROPERTIES_LIST_TAG, { expire: 0 });
  revalidatePath("/admin/properties");
  revalidatePath("/fr/biens");
  // Sprint OPTIM-1A : invalide la fiche SSG (C2) pour fraicheur immediate.
  if (slugClean) revalidatePath(`/fr/biens/${slugClean}`);
  return { ok: true };
}

export async function deletePropertyPhoto(
  _propertyId: string,
  path: string,
): Promise<{ ok: true }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  // Pas d'erreur si fichier déjà absent (idempotent côté Storage Supabase).
  if (error && !/not found|does not exist/i.test(error.message)) {
    throw new Error(error.message);
  }
  return { ok: true };
}
