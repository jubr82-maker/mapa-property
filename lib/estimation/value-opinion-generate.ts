// Generation de l'avis de valeur, point d'entree UNIQUE (oct. 2026) :
// utilise par la route du bouton de l'admin
// (app/api/admin/exports/estimations/[id]/avis-de-valeur) et par le script
// des PDF d'essai (scripts/generate-value-opinion-samples.mts). Memes
// messages que next-intl (i18n/request.ts : messages/<langue>.json), meme
// fonction de rendu : un PDF d'essai est identique a celui du bouton pour
// les memes donnees.
import type { AnnexMeta } from "@/lib/estimation/value-opinion-annex-layout";
import { buildValueOpinionPdf, type TraceEvent, type ValueOpinionEstimation, type ValueOpinionLang } from "@/lib/estimation/value-opinion-pdf";

export async function loadValueOpinionMessages(lang: ValueOpinionLang): Promise<Record<string, unknown>> {
  return (await import(`../../messages/${lang}.json`)).default as Record<string, unknown>;
}

export async function generateValueOpinionPdf(
  row: ValueOpinionEstimation,
  lang: ValueOpinionLang,
  opts: { now?: Date; collect?: string[]; trace?: TraceEvent[]; annexes?: AnnexMeta } = {},
): Promise<Buffer> {
  const messages = await loadValueOpinionMessages(lang);
  return buildValueOpinionPdf(row, lang, messages, opts.now ?? new Date(), opts.collect, opts.trace, opts.annexes);
}
