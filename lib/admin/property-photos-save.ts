// Enregistrement des photos d'un bien (nov. 2026), serveur seulement.
// Ordre des ecritures choisi pour qu'une interruption ne vide jamais la
// galerie : 1. ajout des nouvelles photos, 2. ordre, 3. retrait des seules
// photos supprimees par Julien (lib/admin/photo-save-plan.ts). Textes
// alternatifs et pieces : jamais touches (seules url et sort sont ecrites).
// Renvoie les photos que voit le visiteur apres l'enregistrement (meme
// regle que la fiche publique, lib/property-images.ts) : l'ecran de
// l'admin s'aligne dessus.
import type { SupabaseClient } from "@supabase/supabase-js";
import { planPhotoSave, type DbPhotoRow } from "@/lib/admin/photo-save-plan";
import { selectPublicImages } from "@/lib/property-images";

export type SavedPhoto = { url: string; path: string };
export type PhotoSaveOutcome =
  | { ok: true; photos: SavedPhoto[]; hiddenCount: number; changed: boolean }
  | { ok: false; step: "read" | "insert" | "update" | "delete"; error: { code?: string; message?: string } };

/** Chemin dans le stockage du site, vide pour une image hebergee ailleurs (Apimo). */
export function storagePathOf(url: string): string {
  return url.match(/\/property-images\/(.+)$/)?.[1] ?? "";
}

/** Photos visibles (fiche publique) et nombre de lignes masquees. */
export function visiblePhotos(rows: DbPhotoRow[]): { photos: SavedPhoto[]; hiddenCount: number } {
  const visible = selectPublicImages(rows);
  return { photos: visible.map((r) => ({ url: r.url, path: storagePathOf(r.url) })), hiddenCount: rows.length - visible.length };
}

export async function savePhotoRows(supabase: SupabaseClient, propertyId: string, desired: string[], removed: string[]): Promise<PhotoSaveOutcome> {
  const read = await supabase.from("property_images").select("url, sort").eq("property_id", propertyId).order("sort", { ascending: true });
  if (read.error) return { ok: false, step: "read", error: read.error };
  const plan = planPhotoSave((read.data ?? []) as DbPhotoRow[], desired, removed);
  // Nouvelle ligne : seulement un fichier du stockage de CE bien (photo
  // envoyee depuis l'admin), jamais une adresse quelconque.
  const foreign = plan.insert.find((p) => !storagePathOf(p.url).startsWith(`${propertyId}/`));
  if (foreign) return { ok: false, step: "insert", error: { code: "foreign_url", message: "foreign_url" } };

  if (plan.insert.length) {
    const ins = await supabase.from("property_images").insert(plan.insert.map((p) => ({ property_id: propertyId, url: p.url, sort: p.sort })));
    if (ins.error) return { ok: false, step: "insert", error: ins.error };
  }
  if (plan.update.length) {
    const res = await Promise.all(plan.update.map((p) => supabase.from("property_images").update({ sort: p.sort }).eq("property_id", propertyId).eq("url", p.url)));
    const failed = res.find((r) => r.error);
    if (failed?.error) return { ok: false, step: "update", error: failed.error };
  }
  if (plan.remove.length) {
    const del = await supabase.from("property_images").delete().eq("property_id", propertyId).in("url", plan.remove);
    if (del.error) return { ok: false, step: "delete", error: del.error };
  }
  const changed = plan.insert.length + plan.update.length + plan.remove.length > 0;
  return { ok: true, changed, ...visiblePhotos(plan.after) };
}

/**
 * Enregistre puis met a jour les pages publiques du bien (fiche fr, en, de,
 * liste, cartes, biens similaires). Appele par la route
 * /api/admin/properties/[id]/photos (ecran des photos : pas de nouveau
 * calcul de toute la page de l'admin a chaque changement) et par l'action
 * savePropertyPhotos (import d'une annonce).
 */
export async function persistPropertyPhotos(
  supabase: SupabaseClient,
  propertyId: string,
  desired: string[],
  removed: string[],
): Promise<{ ok: true; photos: SavedPhoto[]; hiddenCount: number } | { ok: false; error: string }> {
  const [{ getTranslations }, { ADMIN_LOCALE }, { dbFailure }, { readPropertyRevalRow, revalidatePropertyChange }] = await Promise.all([
    import("next-intl/server"),
    import("@/lib/datetime"),
    import("@/lib/admin/action-result"),
    import("@/lib/revalidate-property"),
  ]);
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_properties" });
  try {
    const r = await savePhotoRows(supabase, propertyId, desired, removed);
    if (!r.ok) {
      console.error("[admin/properties/photos] enregistrement echoue", { step: r.step, code: r.error.code ?? null });
      const reason = (await dbFailure(r.error, "photos")).message;
      return { ok: false, error: t(r.step === "delete" ? "err_save_delete" : r.step === "insert" ? "err_save_insert" : "err_save_unexpected", { reason }) };
    }
    // Pages du bien seulement (quotas Vercel) : fiche, ville, liste,
    // sitemap, et biens similaires (la photo principale y figure).
    // Toujours, meme sans ligne modifiee ici : « Ameliorer » et « Revenir a
    // l'original » changent l'adresse en base juste avant cet enregistrement.
    await revalidatePropertyChange([await readPropertyRevalRow(supabase, propertyId)], { cards: true });
    return { ok: true, photos: r.photos, hiddenCount: r.hiddenCount };
  } catch (e) {
    console.error("[admin/properties/photos] enregistrement exception", { message: e instanceof Error ? e.name : "unknown" });
    return { ok: false, error: t("err_save_unexpected", { reason: e instanceof Error ? e.message : String(e) }) };
  }
}
