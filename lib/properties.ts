// Helpers pour la table public.properties (Apimo).
//
// IMPORTANT : la table `properties` n'a PAS de colonne `cover_image_url`.
// Les photos vivent dans la table SÉPARÉE `property_images` (property_id,
// url, sort). Le cover est l'image dont `sort` est le plus petit (0 par
// convention Apimo).
//
// NB : la table `properties_offmarket` (BO admin natif MAPA) a, elle, sa
// propre colonne `cover_image_url` directe — ces helpers ne s'appliquent
// pas à ce schéma.

export interface PropertyImageRow {
  url: string;
  sort: number | null;
}

export interface PropertyWithImages {
  property_images?: PropertyImageRow[] | null;
}

export function getCoverImage(property: PropertyWithImages): string | null {
  const images = property.property_images ?? [];
  if (images.length === 0) return null;
  const sorted = [...images].sort(
    (a, b) => (a.sort ?? 999) - (b.sort ?? 999),
  );
  return sorted[0]?.url ?? null;
}

export function getAllImages(property: PropertyWithImages): string[] {
  return (property.property_images ?? [])
    .slice()
    .sort((a, b) => (a.sort ?? 999) - (b.sort ?? 999))
    .map((img) => img.url);
}
