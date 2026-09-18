// lib/storage-signed-url.ts — URL signee a duree limitee pour les buckets
// Supabase Storage marques prives en config (public: false) mais dont la
// policy storage.objects est actuellement ouverte a tous les roles, y
// compris anon (audit du 18 septembre 2026 : buckets "documents" et
// "offmarket-photos"). Les policies seront resserrees par SQL APRES le
// deploiement de ce code (pas avant, pour ne rien casser) — ce helper
// anticipe cet etat cible : le code applicatif ne doit plus jamais
// generer ni reutiliser d'URL publique permanente pour ces buckets.
//
// Cle service_role systematiquement : createSignedUrl fonctionnerait
// aussi avec la cle anon tant que la policy reste ouverte, mais on ne
// veut pas dependre de cet etat transitoire des policies.
import { supabaseService } from "@/lib/supabase-service";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 60 minutes

/**
 * Genere une URL signee a duree limitee pour un fichier d'un bucket prive.
 * Ne throw jamais : un fichier manquant/erreur Supabase ne doit pas casser
 * l'affichage d'une page admin, retourne simplement null dans ce cas.
 */
export async function createSignedFileUrl(
  bucket: string,
  path: string,
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabaseService()
    .storage.from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Extrait le chemin de fichier a partir d'une URL publique Supabase Storage
 * deja enregistree en base (colonnes historiques : documents.file_url,
 * properties_offmarket.cover_image_url / gallery_urls). Format attendu :
 * ".../storage/v1/object/public/<bucket>/<path>". Retourne null si l'URL
 * ne correspond pas a ce bucket (forme inattendue, URL deja signee, etc.).
 */
export function extractStoragePath(
  bucket: string,
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

/**
 * Derive le chemin depuis une URL permanente stockee en base puis genere
 * une URL signee. Repli sur l'URL d'origine si l'extraction ou la
 * signature echoue (le bucket reste en lecture publique tant que les
 * policies ne sont pas resserrees en base — cf. en-tete de ce fichier) :
 * ne casse jamais l'affichage, ne retourne null que si aucune URL n'était
 * stockée pour ce champ.
 */
export async function toSignedUrl(
  bucket: string,
  storedUrl: string | null | undefined,
): Promise<string | null> {
  const path = extractStoragePath(bucket, storedUrl);
  if (!path) return storedUrl ?? null;
  const signed = await createSignedFileUrl(bucket, path);
  return signed ?? storedUrl ?? null;
}
