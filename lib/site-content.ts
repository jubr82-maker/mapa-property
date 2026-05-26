/**
 * MAPA Property — Helper CMS site_content / site_design_tokens
 * ----------------------------------------------------------------
 * Lecture côté Server Component des textes UI et design tokens
 * stockés dans Supabase. Cache Next.js (tag-based) pour invalidation
 * ciblée depuis l'éditeur admin (/admin/contenu).
 *
 * Dégrade gracieusement :
 * - Si Supabase non configuré → renvoie fallback (texte) / map vide
 * - Si table absente (migration non appliquée en BDD) → idem
 * - Si erreur réseau → idem + console.error
 *
 * Cf. AGENTS.md (règle "Si une clé est absente, le code dégrade
 * gracieusement").
 */
import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SITE_CONTENT_TAG = "site-content";
export const SITE_DESIGN_TOKENS_TAG = "site-design-tokens";

/** Client Supabase anonyme (lecture publique RLS) pour les Server Components. */
function getReadClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Charge une row site_content (key + locale).
 * Mise en cache 60 s avec tag `site-content`.
 */
const fetchContent = unstable_cache(
  async (key: string, locale: string): Promise<string | null> => {
    const supabase = getReadClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("site_content")
      .select("content")
      .eq("key", key)
      .eq("locale", locale)
      .maybeSingle();
    if (error) {
      // Table absente / RLS bloque → on logge et on dégrade.
      console.error("[site-content] fetch error", { key, locale, error: error.message });
      return null;
    }
    return data?.content ?? null;
  },
  ["site-content"],
  // Sprint OPTIM-1A : revalidate: false (cache infini, tag-only invalidation).
  // Avant : revalidate: 60s -> propageait un TTL 60s a TOUTES les routes
  // [locale]/* via app/[locale]/layout.tsx (siteDesignTokens()), generant
  // ~192k writes ISR / mois sur les 261 pages SSG. L'invalidation passe
  // exclusivement par revalidateTag(SITE_CONTENT_TAG) depuis /admin/contenu.
  { revalidate: false, tags: [SITE_CONTENT_TAG] },
);

/**
 * Récupère un texte CMS éditable. Renvoie `fallback` si absent
 * (ce qui permet aux Server Components de continuer à utiliser
 * next-intl en attendant l'overlay CMS).
 *
 * @example
 *   const title = await siteContent("home.hero.title", locale, t("title"));
 */
export async function siteContent(
  key: string,
  locale: string,
  fallback: string,
): Promise<string> {
  try {
    const v = await fetchContent(key, locale);
    return v ?? fallback;
  } catch (e) {
    console.error("[site-content] unexpected error", { key, locale, e });
    return fallback;
  }
}

// -----------------------------------------------------------------
// Design tokens
// -----------------------------------------------------------------

export type DesignTokensMap = Record<string, Record<string, string>>;

const fetchDesignTokens = unstable_cache(
  async (): Promise<DesignTokensMap> => {
    const supabase = getReadClient();
    if (!supabase) return {};
    const { data, error } = await supabase
      .from("site_design_tokens")
      .select("category,token_key,token_value");
    if (error) {
      console.error("[site-design-tokens] fetch error", error.message);
      return {};
    }
    const out: DesignTokensMap = {};
    for (const row of data ?? []) {
      const cat = row.category as string;
      const k = row.token_key as string;
      const v = row.token_value as string;
      if (!out[cat]) out[cat] = {};
      out[cat][k] = v;
    }
    return out;
  },
  ["site-design-tokens"],
  // Sprint OPTIM-1A : revalidate: false (cache infini, tag-only invalidation).
  // Identique a fetchContent — voir commentaire ci-dessus.
  { revalidate: false, tags: [SITE_DESIGN_TOKENS_TAG] },
);

/**
 * Renvoie tous les design tokens regroupés par catégorie.
 *
 * @example
 *   const tokens = await siteDesignTokens();
 *   const gold = tokens.color?.gold; // "#e0af6e" ou undefined
 */
export async function siteDesignTokens(): Promise<DesignTokensMap> {
  try {
    return await fetchDesignTokens();
  } catch (e) {
    console.error("[site-design-tokens] unexpected error", e);
    return {};
  }
}
