// Recherches en cours, lecture du site public (oct. 2026). Client anon :
// la regle d'acces (SQL 18) ne laisse lire que les recherches publiees ou
// trouvees avec l'accord du client, et les droits par colonne que les
// champs publics (PUBLIC_SEARCH_COLUMNS). Table absente ou erreur : liste
// vide, jamais d'exception (comme lib/data.ts).
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { cityForPlace } from "@/lib/internal-links";
import { PUBLIC_SEARCH_COLUMNS, PUBLIC_SEARCH_STATUSES, type PublicSearch } from "@/lib/searches/search";

export const SEARCHES_TAG = "property-searches";

const fetchSearchesCached = unstable_cache(
  async (): Promise<PublicSearch[]> => {
    try {
      const { data, error } = await supabaseServer()
        .from("property_searches")
        .select(PUBLIC_SEARCH_COLUMNS)
        .in("status", PUBLIC_SEARCH_STATUSES as string[])
        .order("published_at", { ascending: false, nullsFirst: false });
      if (error) {
        console.error("[searches] lecture publique", error.message);
        return [];
      }
      return ((data as unknown as PublicSearch[] | null) ?? []).filter((s) => Array.isArray(s.communes));
    } catch (e) {
      console.error("[searches] lecture publique", e instanceof Error ? e.message : String(e));
      return [];
    }
  },
  ["property-searches-public"],
  { revalidate: 3600, tags: [SEARCHES_TAG] },
);

/** Recherches visibles : publiees d'abord, trouvees ensuite. */
export async function fetchPublicSearches(): Promise<PublicSearch[]> {
  const all = await fetchSearchesCached();
  return [...all.filter((s) => s.status === "published"), ...all.filter((s) => s.status === "found")];
}

export async function fetchPublicSearch(reference: string): Promise<PublicSearch | null> {
  return (await fetchSearchesCached()).find((s) => s.reference === reference) ?? null;
}

/** Recherches qui visent une commune (page de la commune). */
export async function fetchSearchesForCity(citySlug: string): Promise<PublicSearch[]> {
  return (await fetchPublicSearches()).filter((s) => s.status === "published" && s.communes.some((c) => cityForPlace(c)?.slug === citySlug));
}
