// Hotes d'images optimisees par next/image (oct. 2026), source unique
// pour next.config.ts (images.remotePatterns) et pour les couvertures du
// blog. Une image hors de ces hotes passerait par /_next/image et serait
// refusee (image vide) : elle est alors chargee directement
// (unoptimized), ce que la politique de securite autorise (img-src https:).

export const IMAGE_REMOTE_PATTERNS = [
  // Poster de la video hero (Cloudflare R2, cf. components/home/Hero.tsx).
  { protocol: "https", hostname: "pub-c9fa8716c00f4a0c965197a93086bdce.r2.dev", pathname: "/**" },
  { protocol: "https", hostname: "dutfkblygfvhhwpzxmfz.supabase.co", pathname: "/storage/v1/object/public/**" },
  // URL signees (buckets prives "documents"/"offmarket-photos", cf.
  // lib/storage-signed-url.ts) : chemin /object/sign/.
  { protocol: "https", hostname: "dutfkblygfvhhwpzxmfz.supabase.co", pathname: "/storage/v1/object/sign/**" },
  { protocol: "https", hostname: "media.apimo.pro" },
  { protocol: "https", hostname: "*.apimo.pro" },
  { protocol: "https", hostname: "images.unsplash.com" },
] as const;

function hostMatches(pattern: string, host: string): boolean {
  return pattern.startsWith("*.") ? host.endsWith(pattern.slice(1)) : pattern === host;
}

/** L'image peut-elle passer par l'optimiseur de next/image ? */
export function isOptimizedImageSrc(src: string): boolean {
  if (src.startsWith("/") && !src.startsWith("//")) return true;
  let u: URL;
  try {
    u = new URL(src);
  } catch {
    return false;
  }
  return IMAGE_REMOTE_PATTERNS.some((p) => {
    if (u.protocol !== `${p.protocol}:` || !hostMatches(p.hostname, u.hostname)) return false;
    const path = "pathname" in p ? p.pathname : "/**";
    return u.pathname.startsWith(path.replace(/\*\*$/, ""));
  });
}

/**
 * Adresse de couverture affichable : https ou chemin du site, sinon null
 * (chemin relatif ou adresse invalide : aucune image cassee).
 */
export function displayableImageSrc(src: string | null | undefined): string | null {
  const s = (src ?? "").trim();
  if (!s) return null;
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  try {
    return new URL(s).protocol === "https:" ? s : null;
  } catch {
    return null;
  }
}
