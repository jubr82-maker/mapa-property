"use server";

/**
 * Server actions photos des biens classiques.
 *
 * Schema réel : table SÉPARÉE `property_images` (rows : id, property_id,
 * url, sort), PAS de colonne `images jsonb` sur `properties`. Cover =
 * `sort = 0`. Enregistrement (nov. 2026) : mise a jour sans effacement
 * prealable (lib/admin/property-photos-save.ts) ; avant, toutes les lignes
 * etaient effacees puis reinserees.
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
import { persistPropertyPhotos } from "@/lib/admin/property-photos-save";
import { processUploadedImage } from "@/lib/images/process-upload";
import { MAX_PHOTO_BYTES, MAX_PHOTO_MB } from "@/lib/images/limits";
import { assertAdminAction } from "@/lib/admin/require-admin";
import { dbFailure } from "@/lib/admin/action-result";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { enhanceImage } from "@/lib/images/enhance";
import { enhancedPathOf, isEnhancedPath, isPropertyPhotoPath, originalPathOf } from "@/lib/images/enhance-paths";
import { checkImageToken } from "@/lib/import-listing/token";
import { fetchPastedImage } from "@/lib/import-listing/fetch-image";
import { MIN_IMAGE_SIDE } from "@/lib/import-listing/extract";

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

// Envoi d'une photo dans le stockage du bien (nov. 2026, factorise) : la
// chaine de toujours (conversion, orientation, metadonnees retirees,
// redimensionnement, WebP) ; avec `enhance`, l'original est garde tel quel
// et une version amelioree est ajoutee a cote (lib/images/enhance-paths.ts),
// c'est elle qui est renvoyee. Un echec de l'amelioration garde l'original.
async function storePhoto(
  propertyId: string,
  input: Buffer,
  enhance: boolean,
  minSide = 0,
): Promise<UploadPhotoResult & { enhanced?: boolean }> {
  let processed;
  try {
    processed = await processUploadedImage(input);
  } catch (e) {
    console.error("[admin/properties/photos] conversion echouee", { code: errorCode(e) });
    return { ok: false, error: (await tProps())("err_convert") };
  }
  if (minSide && (processed.width < minSide || processed.height < minSide)) {
    return { ok: false, error: (await tProps())("import_err_small") };
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
      console.error("[admin/properties/photos] upload storage echoue", { code: errorCode(error) });
      return { ok: false, error: (await tProps())("err_upload_storage", { reason: (await dbFailure(error, "photos")).message }) };
    }
    if (enhance) {
      try {
        const better = await enhanceImage(processed.buffer);
        const enhPath = enhancedPathOf(path);
        const up = await supabase.storage.from(BUCKET).upload(enhPath, better.buffer, { cacheControl: "3600", upsert: true, contentType: "image/webp" });
        if (!up.error) return { ok: true, url: supabase.storage.from(BUCKET).getPublicUrl(enhPath).data.publicUrl, path: enhPath, enhanced: true };
        console.error("[admin/properties/photos] envoi amelioree echoue", { code: errorCode(up.error) });
      } catch (e) {
        console.error("[admin/properties/photos] amelioration echouee", { code: errorCode(e) });
      }
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl, path };
  } catch (e) {
    console.error("[admin/properties/photos] upload exception", { code: errorCode(e) });
    return { ok: false, error: (await tProps())("err_upload_unexpected", { reason: e instanceof Error ? e.message : String(e) }) };
  }
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
  // EXIF/GPS retirees, redimensionnee, encodee en WebP. Import d'une
  // annonce (nov. 2026) : "enhance" = 1 ajoute la version amelioree.
  const r = await storePhoto(propertyId, Buffer.from(await file.arrayBuffer()), formData.get("enhance") === "1");
  return r.ok ? { ok: true, url: r.url, path: r.path } : r;
}

/**
 * Import d'une annonce collee (nov. 2026) : telecharge UNE image dont
 * l'adresse figurait dans le contenu colle (jeton signe delivre par
 * importListing), puis la meme chaine qu'une photo ajoutee a la main.
 * Jamais une page web (lib/import-listing/fetch-image.ts).
 */
export async function importPastedPhoto(
  propertyId: string,
  url: string,
  token: string,
  enhance: boolean,
): Promise<UploadPhotoResult> {
  await assertAdminAction();
  const t = await tProps();
  if (typeof url !== "string" || !checkImageToken(propertyId, url, token)) return { ok: false, error: t("import_err_token") };
  const got = await fetchPastedImage(url);
  if (!got.ok) return { ok: false, error: t(`import_err_fetch_${got.code}`, { max: 25 }) };
  const r = await storePhoto(propertyId, got.buffer, enhance === true, MIN_IMAGE_SIDE);
  return r.ok ? { ok: true, url: r.url, path: r.path } : r;
}

// ---------------------------------------------------------------------------
// Amelioration des photos d'un bien (nov. 2026), publie ou non. L'original
// reste dans le stockage ; rien n'est remplace avant que Julien valide
// l'apercu. Seules les photos du stockage du site (pas celles hebergees
// chez Apimo) peuvent etre ameliorees.
// ---------------------------------------------------------------------------

export type EnhancePreviewResult = { ok: true; after: string } | { ok: false; error: string };

async function downloadOriginal(propertyId: string, path: string): Promise<{ ok: true; buffer: Buffer; original: string } | { ok: false; error: string }> {
  const t = await tProps();
  if (!isPropertyPhotoPath(propertyId, path)) return { ok: false, error: t("enhance_err_path") };
  const original = originalPathOf(path);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(original);
  if (error || !data) return { ok: false, error: t("enhance_err_original") };
  return { ok: true, buffer: Buffer.from(await data.arrayBuffer()), original };
}

/** Apercu de la version amelioree (1 200 px), rien n'est enregistre. */
export async function previewPhotoEnhancement(propertyId: string, path: string): Promise<EnhancePreviewResult> {
  await assertAdminAction();
  const src = await downloadOriginal(propertyId, path);
  if (!src.ok) return src;
  try {
    const out = await enhanceImage(src.buffer, { maxWidth: 1200 });
    return { ok: true, after: `data:image/webp;base64,${out.buffer.toString("base64")}` };
  } catch (e) {
    console.error("[admin/properties/photos] apercu echoue", { code: errorCode(e) });
    return { ok: false, error: (await tProps())("enhance_err_failed") };
  }
}

/** Ligne property_images : nouvelle adresse, textes alternatifs conserves. */
async function switchPhotoUrl(propertyId: string, fromUrl: string, toUrl: string): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("property_images").update({ url: toUrl }).eq("property_id", propertyId).eq("url", fromUrl);
  return error ? (await dbFailure(error, "photos")).message : null;
}

/** Applique l'amelioration validee : version amelioree a cote de l'original. */
export async function applyPhotoEnhancement(propertyId: string, path: string, currentUrl: string): Promise<UploadPhotoResult> {
  await assertAdminAction();
  const src = await downloadOriginal(propertyId, path);
  if (!src.ok) return src;
  try {
    const out = await enhanceImage(src.buffer);
    const enhPath = enhancedPathOf(src.original);
    const supabase = await createSupabaseServerClient();
    const up = await supabase.storage.from(BUCKET).upload(enhPath, out.buffer, { cacheControl: "3600", upsert: true, contentType: "image/webp" });
    if (up.error) return { ok: false, error: (await tProps())("err_upload_storage", { reason: (await dbFailure(up.error, "photos")).message }) };
    const url = supabase.storage.from(BUCKET).getPublicUrl(enhPath).data.publicUrl;
    const err = await switchPhotoUrl(propertyId, currentUrl, url);
    if (err) return { ok: false, error: err };
    return { ok: true, url, path: enhPath };
  } catch (e) {
    console.error("[admin/properties/photos] amelioration echouee", { code: errorCode(e) });
    return { ok: false, error: (await tProps())("enhance_err_failed") };
  }
}

/** Revenir a l'original : l'adresse du fichier d'origine, toujours conserve. */
export async function revertPhotoEnhancement(propertyId: string, path: string, currentUrl: string): Promise<UploadPhotoResult> {
  await assertAdminAction();
  const t = await tProps();
  if (!isPropertyPhotoPath(propertyId, path) || !isEnhancedPath(path)) return { ok: false, error: t("enhance_err_path") };
  const original = originalPathOf(path);
  const supabase = await createSupabaseServerClient();
  const dir = original.slice(0, original.lastIndexOf("/"));
  const name = original.slice(original.lastIndexOf("/") + 1);
  const { data: found } = await supabase.storage.from(BUCKET).list(dir, { search: name, limit: 5 });
  if (!found?.some((f) => f.name === name)) return { ok: false, error: t("enhance_err_original") };
  const url = supabase.storage.from(BUCKET).getPublicUrl(original).data.publicUrl;
  const err = await switchPhotoUrl(propertyId, currentUrl, url);
  if (err) return { ok: false, error: err };
  return { ok: true, url, path: original };
}

/**
 * Enregistre la liste des photos (ordre, photo principale = premiere) sans
 * effacement prealable : ajout des nouvelles, mise a jour de l'ordre,
 * retrait des seules photos de `removed` (lib/admin/property-photos-save.ts).
 * Utilise par l'import d'une annonce ; l'ecran des photos passe par la
 * route /api/admin/properties/[id]/photos (meme fonction), pour ne pas
 * faire recalculer toute la page de l'admin a chaque changement.
 */
export async function savePropertyPhotos(
  propertyId: string,
  photos: PhotoData[],
  removed: string[] = [],
): Promise<ActionResult> {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  const supabase = await createSupabaseServerClient();
  const ordered = [...photos].sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.order - b.order).map((p) => p.url);
  const r = await persistPropertyPhotos(supabase, propertyId, ordered, Array.isArray(removed) ? removed.filter((u) => typeof u === "string") : []);
  if (!r.ok) return r;
  revalidatePath("/admin/properties");
  return { ok: true };
}

export async function deletePropertyPhoto(
  _propertyId: string,
  path: string,
): Promise<ActionResult> {
  // Garde serveur (oct. 2026) : admin de la liste en session aal2.
  await assertAdminAction();
  // Image hebergee ailleurs (ancienne image Apimo) : aucun fichier du site.
  if (!path) return { ok: true };
  try {
    const supabase = await createSupabaseServerClient();
    // Photo amelioree (nov. 2026) : l'original et la version amelioree
    // partent ensemble (la photo est retiree du bien).
    const paths = isPropertyPhotoPath(_propertyId, path) ? [...new Set([originalPathOf(path), enhancedPathOf(originalPathOf(path))])] : [path];
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
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
