// Modeles d'annonces pour les pages publiques (oct. 2026) : fin standard
// des fiches de biens. Source unique, comme dans l'admin : le tronc
// enregistre dans Parametres > Modeles d'annonces (table listing_templates,
// lignes part = 'tronc', lisibles par le site apres le SQL 29), sinon le
// tronc par defaut des messages. Lecture refusee (SQL 29 pas encore
// execute) : tronc par defaut, sans erreur. Autre erreur : jamais mise en
// cache (exception dans la fonction cachee), tronc par defaut.
import "server-only";
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import de from "@/messages/de.json";
import type { ListingLang } from "@/lib/listing/listing-data";
import type { ListingTemplates } from "@/lib/listing/generate";
import type { TemplateBlock } from "@/lib/listing/families";

export const LISTING_TEMPLATES_TAG = "listing-templates";

type Msgs = { listing_model: { title: string; tronc: string; blocks: Record<TemplateBlock, string> } };
const ALL = { fr, en, de } as unknown as Record<ListingLang, Msgs>;

const fetchTroncCached = unstable_cache(
  async (): Promise<Partial<Record<ListingLang, string>>> => {
    const { data, error } = await supabaseServer().from("listing_templates").select("lang, body").eq("part", "tronc");
    if (error) {
      // 42501 : lecture non autorisee pour le site (SQL 29 pas encore execute).
      if (error.code === "42501") return {};
      throw new Error(error.message);
    }
    const out: Partial<Record<ListingLang, string>> = {};
    for (const r of (data as { lang: string; body: string }[] | null) ?? []) {
      if ((r.lang === "fr" || r.lang === "en" || r.lang === "de") && typeof r.body === "string" && r.body.trim()) out[r.lang] = r.body;
    }
    return out;
  },
  ["listing-tronc-v1"],
  { revalidate: 3600, tags: [LISTING_TEMPLATES_TAG] },
);

/** Modele d'une langue pour le site : tronc enregistre, sinon par defaut. */
export async function publicListingTemplates(lang: ListingLang): Promise<ListingTemplates> {
  const m = ALL[lang].listing_model;
  let tronc = m.tronc;
  try {
    tronc = (await fetchTroncCached())[lang] ?? m.tronc;
  } catch (e) {
    console.error("[listing] tronc public : lecture impossible, modele par defaut", e instanceof Error ? e.message : String(e));
  }
  return { title: m.title, tronc, blocks: { ...m.blocks } };
}
