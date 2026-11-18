"use client";

/**
 * PropertyPhotosSection : photos d'un bien.
 *
 * Client wrapper qui branche le PhotoManager générique sur les server
 * actions properties (table `property_images`, bucket `property-images`).
 * Bind propertyId une seule fois ici : PhotoManager reste 100 % générique
 * (réutilisable pour off-market ou autre modèle plus tard sans modif).
 */

import { useTranslations } from "next-intl";
import { PhotoManager, type PhotoData, type SaveResult } from "@/components/admin/PhotoManager";
import {
  uploadPropertyPhoto,
  deletePropertyPhoto,
  previewPhotoEnhancement,
  applyPhotoEnhancement,
  revertPhotoEnhancement,
} from "@/app/admin/properties/[id]/photos/actions";

interface Props {
  propertyId: string;
  initialPhotos: PhotoData[];
  /** Lignes masquees sur le site (anciennes images Apimo), gardees en base. */
  hiddenCount?: number;
}

export function PropertyPhotosSection({ propertyId, initialPhotos, hiddenCount = 0 }: Props) {
  const tn = useTranslations("admin_notices");
  // Enregistrement par la route JSON (nov. 2026) : pas de nouveau calcul de
  // toute la page de l'admin a chaque changement de photo.
  async function save(photos: PhotoData[], removed: string[]): Promise<SaveResult> {
    const ordered = [...photos].sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.order - b.order).map((p) => p.url);
    let res: Response;
    try {
      res = await fetch(`/api/admin/properties/${propertyId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: ordered, removed }),
        cache: "no-store",
      });
    } catch {
      return { ok: false, error: tn("err_network") };
    }
    const body = (await res.json().catch(() => null)) as SaveResult | { ok: false; error?: string } | null;
    if (res.ok && body && body.ok) return body;
    if (res.status === 401 || res.status === 403) return { ok: false, error: tn("err_session") };
    if (res.status === 400) return { ok: false, error: tn("err_http", { status: res.status }) };
    return { ok: false, error: body && !body.ok && body.error ? body.error : tn("err_http", { status: res.status }) };
  }

  return (
    <PhotoManager
      initialPhotos={initialPhotos}
      initialHiddenCount={hiddenCount}
      onUpload={(fd) => uploadPropertyPhoto(propertyId, fd)}
      onSave={save}
      onDelete={(path) => deletePropertyPhoto(propertyId, path)}
      // Amelioration des photos (nov. 2026), biens publies compris.
      enhance={{
        preview: (path) => previewPhotoEnhancement(propertyId, path),
        apply: (path, url) => applyPhotoEnhancement(propertyId, path, url),
        revert: (path, url) => revertPhotoEnhancement(propertyId, path, url),
      }}
    />
  );
}
