"use client";

/**
 * PropertyPhotosSection — POL4-A3 (AGENT HUGO)
 *
 * Client wrapper qui branche le PhotoManager générique sur les server
 * actions properties (table `property_images`, bucket `property-images`).
 * Bind propertyId une seule fois ici → PhotoManager reste 100 % générique
 * (réutilisable pour off-market ou autre modèle plus tard sans modif).
 */

import { PhotoManager, type PhotoData } from "@/components/admin/PhotoManager";
import {
  uploadPropertyPhoto,
  savePropertyPhotos,
  deletePropertyPhoto,
} from "@/app/admin/properties/[id]/photos/actions";

interface Props {
  propertyId: string;
  initialPhotos: PhotoData[];
}

export function PropertyPhotosSection({ propertyId, initialPhotos }: Props) {
  return (
    <PhotoManager
      initialPhotos={initialPhotos}
      onUpload={(fd) => uploadPropertyPhoto(propertyId, fd)}
      onSave={(photos) => savePropertyPhotos(propertyId, photos)}
      onDelete={(path) => deletePropertyPhoto(propertyId, path)}
    />
  );
}
