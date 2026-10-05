// Photos publiques d'un bien (oct. 2026, decision de Julien) : la fiche
// publique affiche exactement les photos gerees dans l'admin (table
// property_images), dans l'ordre de l'admin (colonne sort, photo
// principale = sort 0). Les anciennes images importees d'Apimo
// (media.apimo.pro) restent en base mais ne sont plus affichees des qu'un
// bien a au moins une photo envoyee depuis l'admin. Aucune photo n'est
// supprimee. Module pur : utilisable par le serveur, le client et les tests.

export type SortableImage = { url: string; sort?: number | null };

/** Hote des images importees d'Apimo (ex. https://media.apimo.pro/cache/...). */
export function isApimoImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "apimo.pro" || host.endsWith(".apimo.pro");
  } catch {
    return false;
  }
}

/**
 * Photos a afficher publiquement : triees par `sort` (ordre de l'admin,
 * stable a egalite), sans URL vide, et sans images Apimo si au moins une
 * photo de l'admin existe.
 */
export function selectPublicImages<T extends SortableImage>(rows: readonly T[] | null | undefined): T[] {
  const sorted = (rows ?? [])
    .filter((r) => typeof r.url === "string" && r.url.trim().length > 0)
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.sort ?? 0) - (b.r.sort ?? 0) || a.i - b.i)
    .map(({ r }) => r);
  const own = sorted.filter((r) => !isApimoImageUrl(r.url));
  return own.length > 0 ? own : sorted;
}

/** Photo principale publique (premiere de selectPublicImages), ou null. */
export function publicCoverUrl(rows: readonly SortableImage[] | null | undefined): string | null {
  return selectPublicImages(rows)[0]?.url ?? null;
}
