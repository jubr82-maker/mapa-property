"use server";

// Textes alternatifs des photos d'un bien (oct. 2026) : piece rattachee et
// texte saisi par langue, photo par photo (colonnes de property_images,
// SQL 20). Admin de la liste en aal2.
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { ActionFailure, dbFailure, runAction, sessionFailure, type ActionResult } from "@/lib/admin/action-result";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { readPropertyRevalRow, revalidatePropertyChange } from "@/lib/revalidate-property";

export type PhotoAltInput = { url: string; room_id: string | null; alt_fr: string; alt_en: string; alt_de: string };

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\u0000/g, "").trim().slice(0, max) : "");

export async function savePhotoAlts(propertyId: string, photos: PhotoAltInput[]): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return sessionFailure();
  return runAction(async () => {
    const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_listing" });
    if (!Array.isArray(photos) || photos.length > 200) throw new ActionFailure(t("alt_err_input"));
    for (const p of photos) {
      const url = clean(p?.url, 2000);
      if (!url) continue;
      const room = clean(p.room_id, 40);
      const { error } = await admin.supabase
        .from("property_images")
        .update({
          room_id: /^[a-z0-9_-]{1,40}$/i.test(room) ? room : null,
          alt_fr: clean(p.alt_fr, 200) || null,
          alt_en: clean(p.alt_en, 200) || null,
          alt_de: clean(p.alt_de, 200) || null,
        })
        .eq("property_id", propertyId)
        .eq("url", url);
      if (error) throw await dbFailure(error, "savePhotoAlts");
    }
    // Textes alternatifs : la fiche du bien seule (et sa ville, liste, sitemap).
    await revalidatePropertyChange([await readPropertyRevalRow(admin.supabase, propertyId)]);
  });
}
