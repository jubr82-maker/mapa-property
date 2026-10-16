// Adresses des articles du blog (oct. 2026) : toujours en minuscules, sans
// accents. Aucun import serveur : utilisable par le proxy, les pages et
// l'admin.

/** Minuscules, accents retires ; le reste de l'adresse est inchange. */
export function blogSlugLower(slug: string): string {
  return slug.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Ancienne adresse d'article avec majuscules ou accents
 * (/fr/blog/Immobilier-Steinfort) : chemin en minuscules vers lequel
 * rediriger en 301, sinon null.
 */
export function blogLowercaseRedirect(pathname: string): string | null {
  const m = /^\/(fr|en|de)\/blog\/([^/]+)\/?$/.exec(pathname);
  if (!m) return null;
  let slug: string;
  try {
    slug = decodeURIComponent(m[2]);
  } catch {
    return null;
  }
  const lower = blogSlugLower(slug);
  return lower !== slug ? `/${m[1]}/blog/${encodeURIComponent(lower)}` : null;
}
