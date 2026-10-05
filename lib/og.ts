// Image de partage du site (oct. 2026). Les anciennes references
// /og/og-<langue>.png et /og/logo.png pointaient vers des fichiers absents
// (public/og n'existe pas). Fichiers reels de public/ : og-image.png
// (1200 x 630) et logo-mapa-property.png.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

export const SITE_SHARE_IMAGE_PATH = "/og-image.png";
export const SITE_SHARE_IMAGE_SIZE = { width: 1200, height: 630 } as const;
export const SITE_LOGO_PATH = "/logo-mapa-property.png";

/** Adresse absolue de l'image de partage du site. */
export function siteShareImage(): string {
  return `${SITE_URL}${SITE_SHARE_IMAGE_PATH}`;
}

/** Adresse absolue du logo (donnees structurees). */
export function siteLogo(): string {
  return `${SITE_URL}${SITE_LOGO_PATH}`;
}
