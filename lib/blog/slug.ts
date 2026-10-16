// Adresses des articles du blog (oct. 2026) : toujours en minuscules, sans
// accents. Aucun import serveur : utilisable par le proxy, les pages et
// l'admin.

/** Minuscules, accents retires ; le reste de l'adresse est inchange. */
export function blogSlugLower(slug: string): string {
  return slug.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Chemin vers lequel rediriger en 301, en UNE seule etape, sinon null :
 * - adresse d'article avec majuscules ou accents
 *   (/fr/blog/Immobilier-Steinfort -> /fr/blog/immobilier-steinfort) ;
 * - ancienne adresse sans langue du site v28, quelle que soit la casse
 *   (/blog/Immobilier-Steinfort -> /fr/blog/immobilier-steinfort).
 * Une adresse avec langue deja en minuscules n'est jamais redirigee.
 */
export function blogLowercaseRedirect(pathname: string): string | null {
  const m = /^\/(?:(fr|en|de)\/)?blog\/([^/]+)\/?$/.exec(pathname);
  if (!m) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(m[2]);
  } catch {
    return null;
  }
  const lower = blogSlugLower(slug);
  const locale = m[1];
  if (locale && lower === slug) return null;
  return `/${locale ?? "fr"}/blog/${encodeURIComponent(lower)}`;
}
