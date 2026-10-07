// Modeles d'annonces cote serveur (oct. 2026) : modeles par defaut des
// messages (namespace listing_model, lus en brut) et modifications de
// Julien (table listing_templates, SQL 17, admin seulement). Table absente
// ou illisible : modeles par defaut, sans erreur.
import "server-only";
import { getTranslations } from "next-intl/server";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { isTemplatePart, type TemplateBlock, type TemplatePart } from "@/lib/listing/families";
import { LISTING_LANGS, type ListingLang } from "@/lib/listing/listing-data";
import type { ListingTemplates, ListingVocab } from "@/lib/listing/generate";


export type ListingSample = { city: string; qualifier: string; ambiance: string; highlights: string; rooms_ground: string; rooms_floor: string };

export type LangModel = {
  templates: ListingTemplates;
  defaults: ListingTemplates;
  vocab: ListingVocab;
  sample: ListingSample;
  /** Pieces modifiees par Julien (ecart au modele par defaut). */
  overridden: TemplatePart[];
};

export type ListingModels = Record<ListingLang, LangModel>;

async function defaultsFor(lang: ListingLang): Promise<Omit<LangModel, "templates" | "overridden">> {
  const t = await getTranslations({ locale: lang, namespace: "listing_model" });
  const blocks = t.raw("blocks") as Record<TemplateBlock, string>;
  return {
    defaults: { title: t.raw("title") as string, tronc: t.raw("tronc") as string, blocks },
    vocab: t.raw("vocab") as ListingVocab,
    sample: t.raw("sample") as ListingSample,
  };
}

/** Modeles des trois langues, modifications de Julien comprises. */
export async function loadListingModels(): Promise<ListingModels> {
  const base = await Promise.all(LISTING_LANGS.map((l) => defaultsFor(l)));
  let rows: { lang: string; part: string; body: string }[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("listing_templates").select("lang, part, body");
    if (error) console.error("[listing] modeles : lecture impossible, modeles par defaut", { code: error.code ?? null });
    else rows = (data as typeof rows | null) ?? [];
  } catch (e) {
    console.error("[listing] modeles : lecture impossible", e instanceof Error ? e.message : String(e));
  }
  const out = {} as ListingModels;
  LISTING_LANGS.forEach((lang, i) => {
    const d = base[i];
    const templates: ListingTemplates = { title: d.defaults.title, tronc: d.defaults.tronc, blocks: { ...d.defaults.blocks } };
    const overridden: TemplatePart[] = [];
    for (const r of rows) {
      if (r.lang !== lang || !isTemplatePart(r.part) || typeof r.body !== "string" || !r.body.trim()) continue;
      overridden.push(r.part);
      if (r.part === "title") templates.title = r.body;
      else if (r.part === "tronc") templates.tronc = r.body;
      else templates.blocks[r.part] = r.body;
    }
    out[lang] = { ...d, templates, overridden };
  });
  return out;
}
