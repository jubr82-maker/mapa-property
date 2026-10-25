// Images du site pour Google et le partage (oct. 2026, validees par Julien
// le 23/10/2026) : public/brand/partage.png (1200 x 630) et
// public/brand/google-logo.png (1024 x 1024), servies telles quelles avec le
// cache long des fichiers statiques. Les anciens fichiers public/og-image.png
// et public/logo-mapa-property.png restent en place (non references ici).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

export const SITE_SHARE_IMAGE_PATH = "/brand/partage.png";
export const SITE_SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const SITE_LOGO_PATH = "/brand/google-logo.png";
export const SITE_LOGO_SIZE = { width: 1024, height: 1024 } as const;

/** Adresse absolue de l'image de partage du site. */
export function siteShareImage(): string {
  return `${SITE_URL}${SITE_SHARE_IMAGE_PATH}`;
}

/** Adresse absolue du logo (donnees structurees). */
export function siteLogo(): string {
  return `${SITE_URL}${SITE_LOGO_PATH}`;
}
