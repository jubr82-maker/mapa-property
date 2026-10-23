"use server";

/**
 * Server actions photos des biens classiques.
 *
 * Schema réel : table SÉPARÉE `property_images` (rows : id, property_id,
 * url, sort), PAS de colonne `images jsonb` sur `properties`. Cover =
 * `sort = 0`. Stratégie save : wipe-and-recreate l'ensemble des rows pour
 * ce property_id (simple, atomique en pratique grâce à transaction sup).
 *
 * Bucket Supabase : `property-images` (déjà créé et public côté dashboard
 * Julien). Path = `{propertyId}/{timestamp}-{random}.{ext}`.
 *
 * Pas de DELETE des fichiers orphelins en savePhotos : c'est `deletePhoto`
 * qui supprime du bucket. Si une row est retirée du state sans appeler
 * deletePhoto, le fichier reste dans le bucket (perte d'espace minime
 * acceptée, cleanup batch séparé si besoin).
 *
 * Mission "envoi de photos robuste et erreurs visibles", ces trois
 * actions RETOURNENT désormais un résultat structuré { ok, error? } au
 * lieu de throw. Raison PROUVÉE (cf. rapport de mission) : une Server
 * Action qui throw voit son message REMPLACÉ en production par le texte
 * générique de l'erreur React #441 ("An error occurred in the Server
 * Components render..."), le message réel n'atteint jamais le visiteur
 * ni l'admin. Retourner un objet normal n'est pas concerné par cette
 * redaction, exactement comme updateMandat/updateProperty ailleurs dans
 * ce dépôt.
 */

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { readPropertyRevalRow, revalidatePropertyChange } from "@/lib/revalidate-property";
import { processUploadedImage } from "@/lib/images/process-upload";
import { MAX_PHOTO_BYTES, MAX_PHOTO_MB } from "@/lib/images/limits";
import { assertAdminAction } from "@/lib/admin/require-admin";
import { dbFailure } from "@/lib/admin/action-result";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";

const BUCKET = "property-images";

/** Libelles des messages renvoyes a l'ecran (admin_properties). */
const tProps = () => getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_properties" });

export interface PhotoData {
  url: string;
  path: string;
  isCover: boolean;
  order: number;
}

export type UploadPhotoResult =
  | { ok: true; url: string; path: string }
  | { ok: false; error: string };

export type ActionResult = { ok: true } | { ok: false; error: string };

function errorCode(e: unknown): string {
  const withCode = e as { code?: string; name?: string; statusCode?: string | number };
  return String(withCode?.code ?? withCode?.statusCode ?? withCode?.name ?? "unknown_error");
}

export async function uploadPropertyPhoto(
  propertyId: string,
  formData: FormData,
): Promise<UploadPhotoResult> {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: (await tProps())("err_no_file") };
  }

  // Limite explicite (point 2) : message clair plutôt qu'un échec muet ou
  // un rejet opaque de la plateforme si le fichier dépasse la taille
  // acceptée par les Server Actions (cf. lib/images/limits.ts).
  if (file.size > MAX_PHOTO_BYTES) {
    console.warn("[admin/properties/photos] fichier trop volumineux", {
      code: "file_too_large",
      sizeMb: Math.round(file.size / (1024 * 1024)),
    });
    return {
      ok: false,
      error: (await tProps())("err_file_too_large", { max: MAX_PHOTO_MB }),
    };
  }

  // Conversion server-side systematique, quel que soit le format recu
  // (HEIC/HEIF/JPEG/PNG/WebP/TIFF) : oriente correctement, metadonnees
  // EXIF/GPS retirees, redimensionnee, encodee en WebP.
  const inputBuffer = Buffer.from(await file.arrayBuffer());
  let processed;
  try {
    processed = await processUploadedImage(inputBuffer);
  } catch (e) {
    console.error("[admin/properties/photos] conversion echouee", {
      code: errorCode(e),
    });
    return {
      ok: false,
      error: (await tProps())("err_convert"),
    };
  }

  try {
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
    if (error) {
      console.error("[admin/properties/photos] upload storage echoue", {
        code: errorCode(error),
      });
      return { ok: false, error: (await tProps())("err_upload_storage", { reason: (await dbFailure(error, "photos")).message }) };
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl, path };
  } catch (e) {
    console.error("[admin/properties/photos] upload exception", {
      code: errorCode(e),
    });
    return { ok: false, error: (await tProps())("err_upload_unexpected", { reason: e instanceof Error ? e.message : String(e) }) };
  }
}

export async function savePropertyPhotos(
  propertyId: string,
  photos: PhotoData[],
): Promise<ActionResult> {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  try {
    const supabase = await createSupabaseServerClient();
    // Textes alternatifs et pieces (SQL 20, oct. 2026) conserves photo par
    // photo a travers la reecriture des lignes ; colonnes absentes : rien.
    const { data: prevAlts, error: altErr } = await supabase
      .from("property_images")
      .select("url, alt_fr, alt_en, alt_de, room_id")
      .eq("property_id", propertyId);
    const altByUrl = new Map(
      altErr ? [] : ((prevAlts as { url: string; alt_fr: string | null; alt_en: string | null; alt_de: string | null; room_id: string | null }[] | null) ?? []).map((r) => [r.url, r] as const),
    );
    // Wipe existing rows pour ce property_id
    const { error: delErr } = await supabase
      .from("property_images")
      .delete()
      .eq("property_id", propertyId);
    if (delErr) {
      console.error("[admin/properties/photos] delete rows echoue", {
        code: errorCode(delErr),
      });
      return { ok: false, error: (await tProps())("err_save_delete", { reason: (await dbFailure(delErr, "photos")).message }) };
    }
    // Re-insert avec sort = order ; cover = order 0
    if (photos.length > 0) {
      // Forcer ordre unique : cover (isCover true) en premier sort=0, sinon
      // respecter `order` envoyé par le client.
      const sorted = [...photos].sort((a, b) => {
        if (a.isCover && !b.isCover) return -1;
        if (!a.isCover && b.isCover) return 1;
        return a.order - b.order;
      });
      const rows = sorted.map((p, idx) => {
        const prev = altByUrl.get(p.url);
        return {
          property_id: propertyId,
          url: p.url,
          sort: idx,
          ...(prev ? { alt_fr: prev.alt_fr, alt_en: prev.alt_en, alt_de: prev.alt_de, room_id: prev.room_id } : {}),
        };
      });
      const { error: insErr } = await supabase.from("property_images").insert(rows);
      if (insErr) {
        console.error("[admin/properties/photos] insert rows echoue", {
          code: errorCode(insErr),
        });
        return { ok: false, error: (await tProps())("err_save_insert", { reason: (await dbFailure(insErr, "photos")).message }) };
      }
    }
    // La cover (fetchAllPropertiesWithCover) depend de property_images ,
    // invalider le cache tag pour que la grille /biens et les biens
    // similaires reflètent immédiatement la nouvelle cover/l'ordre photos.
    // PAS de revalidatePath sur /admin/properties/{id} elle-même : cette
    // page héberge aussi PropertyEditForm, dont la saisie en cours (non
    // encore envoyée via son propre bouton Enregistrer) serait effacée à
    // l'affichage par le refresh RSC immédiat que revalidatePath déclenche
    // sur la page actuellement affichée. PhotoManager reflète déjà l'état
    // des photos localement (state client), inutile de forcer un refresh
    // serveur de cette page pour ça.
    // Pages du bien seulement (oct. 2026, quotas Vercel) : fiche, ville,
    // liste, sitemap, et biens similaires (la photo de couverture y figure).
    await revalidatePropertyChange([await readPropertyRevalRow(supabase, propertyId)], { cards: true });
    revalidatePath("/admin/properties");
    return { ok: true };
  } catch (e) {
    console.error("[admin/properties/photos] save exception", {
      code: errorCode(e),
    });
    return { ok: false, error: (await tProps())("err_save_unexpected", { reason: e instanceof Error ? e.message : String(e) }) };
  }
}

export async function deletePropertyPhoto(
  _propertyId: string,
  path: string,
): Promise<ActionResult> {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    // Pas d'erreur si fichier déjà absent (idempotent côté Storage Supabase).
    if (error && !/not found|does not exist/i.test(error.message)) {
      console.error("[admin/properties/photos] delete storage echoue", {
        code: errorCode(error),
      });
      return { ok: false, error: (await tProps())("err_delete", { reason: (await dbFailure(error, "photos")).message }) };
    }
    return { ok: true };
  } catch (e) {
    console.error("[admin/properties/photos] delete exception", {
      code: errorCode(e),
    });
    return { ok: false, error: (await tProps())("err_delete_unexpected", { reason: e instanceof Error ? e.message : String(e) }) };
  }
}
