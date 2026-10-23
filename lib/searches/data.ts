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

// Une erreur leve une exception DANS la fonction mise en cache : rien n'est
// garde, la lecture suivante reessaie (oct. 2026, meme cause que la FAQ :
// une liste vide mise en cache etait reutilisee par les builds suivants).
const fetchSearchesCached = unstable_cache(
  async (): Promise<PublicSearch[]> => {
    const { data, error } = await supabaseServer()
      .from("property_searches")
      .select(PUBLIC_SEARCH_COLUMNS)
      .in("status", PUBLIC_SEARCH_STATUSES as string[])
      .order("published_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);
    return ((data as unknown as PublicSearch[] | null) ?? []).filter((s) => Array.isArray(s.communes));
  },
  ["property-searches-public-v2"],
  { revalidate: 2592000, tags: [SEARCHES_TAG] }, // secours 30 jours ; etiquette revalidee a chaque enregistrement
);

/** Recherches lisibles ; table absente ou erreur : liste vide (non mise en cache). */
async function fetchSearches(): Promise<PublicSearch[]> {
  try {
    return await fetchSearchesCached();
  } catch (e) {
    console.error("[searches] lecture publique", e instanceof Error ? e.message : String(e));
    return [];
  }
}

/** Recherches visibles : publiees d'abord, trouvees ensuite. */
export async function fetchPublicSearches(): Promise<PublicSearch[]> {
  const all = await fetchSearches();
  return [...all.filter((s) => s.status === "published"), ...all.filter((s) => s.status === "found")];
}

export async function fetchPublicSearch(reference: string): Promise<PublicSearch | null> {
  return (await fetchSearches()).find((s) => s.reference === reference) ?? null;
}

/** Etiquette des recherches d'une commune (oct. 2026, quotas Vercel). */
export function searchesCityTag(citySlug: string): string {
  return `searches-city:${citySlug}`;
}

/** Pages de villes visees par des communes (recherche avant et apres modification). */
export function searchCitySlugs(communes: unknown): string[] {
  const list = Array.isArray(communes) ? communes : [];
  return [...new Set(list.map((c) => (typeof c === "string" ? cityForPlace(c)?.slug : undefined)).filter((s): s is string => Boolean(s)))];
}

/**
 * Recherches qui visent une commune (page de la commune et fiches de ses
 * biens). Cache PAR COMMUNE (oct. 2026, quotas Vercel) : modifier une
 * recherche ne rafraichit que les communes qu'elle vise, plus jamais toutes
 * les pages de villes et toutes les fiches.
 */
export async function fetchSearchesForCity(citySlug: string): Promise<PublicSearch[]> {
  try {
    return await unstable_cache(
      async (): Promise<PublicSearch[]> => {
        const { data, error } = await supabaseServer()
          .from("property_searches")
          .select(PUBLIC_SEARCH_COLUMNS)
          .eq("status", "published")
          .order("published_at", { ascending: false, nullsFirst: false });
        if (error) throw new Error(error.message);
        return ((data as unknown as PublicSearch[] | null) ?? []).filter((s) => Array.isArray(s.communes) && s.communes.some((c) => cityForPlace(c)?.slug === citySlug));
      },
      ["property-searches-city-v1", citySlug],
      { revalidate: 2592000, tags: [searchesCityTag(citySlug)] }, // secours 30 jours ; etiquette revalidee a chaque enregistrement
    )();
  } catch (e) {
    console.error("[searches] lecture publique (commune)", e instanceof Error ? e.message : String(e));
    return [];
  }
}
