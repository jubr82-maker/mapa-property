// Icones du site et de l'admin (oct. 2026, scripts/generate-icons-square.mjs).
// public/icons est en cache d'un an (next.config.ts) : chaque nouvelle
// generation garde les memes noms et augmente ICON_VERSION, pour que les
// navigateurs chargent la nouvelle icone.
export const ICON_VERSION = 2;

/** Adresse versionnee d'une icone de public/icons. */
export function iconUrl(file: string): string {
  return `/icons/${file}?v=${ICON_VERSION}`;
}
