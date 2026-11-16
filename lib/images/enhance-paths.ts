// Amelioration des photos (nov. 2026). Module pur (ecran et serveur) : la
// photo d'origine n'est JAMAIS remplacee. Elle garde son fichier
// ({bien}/{nom}.webp) ; la version amelioree est un second fichier a cote
// ({bien}/{nom}.enh.webp). "Revenir a l'original" remet simplement l'adresse
// du premier fichier. Aucune colonne ni table supplementaire.

const ENH = /\.enh\.webp$/i;

export function isEnhancedPath(path: string | null | undefined): boolean {
  return Boolean(path && ENH.test(path));
}

/** Fichier ameliore correspondant a un fichier d'origine (ou deja ameliore). */
export function enhancedPathOf(path: string): string {
  if (isEnhancedPath(path)) return path;
  // x.webp -> x.enh.webp ; autre format (x.jpg) -> x.jpg.enh.webp.
  return path.replace(/\.webp$/i, "") + ".enh.webp";
}

/** Fichier d'origine d'un fichier ameliore (le meme s'il ne l'est pas). */
export function originalPathOf(path: string): string {
  if (!isEnhancedPath(path)) return path;
  const base = path.replace(ENH, "");
  return /\.[a-z0-9]{2,5}$/i.test(base.slice(base.lastIndexOf("/") + 1)) ? base : `${base}.webp`;
}

/** Remplace le chemin dans une adresse publique du stockage. */
export function swapPathInUrl(url: string, fromPath: string, toPath: string): string {
  const i = url.lastIndexOf(fromPath);
  return i < 0 ? url : url.slice(0, i) + toPath + url.slice(i + fromPath.length);
}

/** Chemin du stockage d'un bien : "{bien}/{fichier}" sans remontee de dossier. */
export function isPropertyPhotoPath(propertyId: string, path: string): boolean {
  return (
    typeof path === "string" &&
    path.startsWith(`${propertyId}/`) &&
    !path.includes("..") &&
    /^[A-Za-z0-9._\/-]+$/.test(path) &&
    path.length < 300
  );
}
