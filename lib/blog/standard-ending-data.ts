// Lecture de la fin d'article standard (oct. 2026, SQL 27). Client anon,
// lecture publique. Une erreur n'est jamais mise en cache (exception dans
// la fonction cachee) ; table absente : aucune fin standard (null).
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import type { StandardEnding } from "@/lib/blog/standard-ending";

export const BLOG_ENDING_TAG = "blog-standard-ending";
const COLUMNS =
  "heading_fr, heading_en, heading_de, text_commune_fr, text_commune_en, text_commune_de, text_general_fr, text_general_en, text_general_de, signature_fr, signature_en, signature_de";

const fetchEndingCached = unstable_cache(
  async (): Promise<StandardEnding | null> => {
    const { data, error } = await supabaseServer().from("blog_standard_ending").select(COLUMNS).eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    return (data as StandardEnding | null) ?? null;
  },
  ["blog-standard-ending-v2"],
  { revalidate: 3600, tags: [BLOG_ENDING_TAG] },
);

export async function fetchStandardEnding(): Promise<StandardEnding | null> {
  try {
    return await fetchEndingCached();
  } catch (e) {
    console.error("[blog] fin standard", e instanceof Error ? e.message : String(e));
    return null;
  }
}
