// Reponses fermees d'Elena (nov. 2026). Source : table public.faqs
// (page_key 'elena', lignes publiees, SQL 37), modifiable par Julien dans
// l'admin (Questions frequentes, page "Elena"). Tant que le SQL 37 n'est pas
// execute (colonnes absentes ou aucune ligne) : repli sur
// lib/elena/elena-qa.json, sans aucune difference pour le visiteur.
// Les reponses sont affichees MOT POUR MOT ; l'IA ne redige jamais rien.
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import { faqTag } from "@/lib/faq/data";
import qaFile from "@/lib/elena/elena-qa.json";

export type ElenaLang = "fr" | "en" | "de";
export type Tri = Record<ElenaLang, string>;

export interface ElenaEntry {
  /** "E001" a "E106" : numero de l'entree (position). */
  id: string;
  theme: string | null;
  isTemplate: boolean;
  question: Tri;
  variants: string[];
  answer: Tri;
  button: { path: string; label: Tri } | null;
  source: string | null;
}

type FileEntry = {
  id: string;
  theme: string;
  is_template: boolean;
  question: Tri;
  variants_fr: string[];
  answer: Tri;
  button: { path: string; label: Tri } | null;
  source: string;
};

export const FILE_ENTRIES: ElenaEntry[] = (qaFile as { entries: FileEntry[] }).entries.map((e) => ({
  id: e.id,
  theme: e.theme,
  isTemplate: e.is_template,
  question: e.question,
  variants: e.variants_fr ?? [],
  answer: e.answer,
  button: e.button ? { path: e.button.path, label: e.button.label } : null,
  source: e.source,
}));

/** Modeles et entree par defaut, reperes par leur intitule francais (fichier valide). */
const LABEL_OF = (id: string) => FILE_ENTRIES.find((e) => e.id === id)?.question.fr ?? "";
export const TEMPLATE_IDS = {
  found: "E098",
  nearby: "E099",
  none: "E100",
  noCountry: "E101",
  underCompromise: "E102",
  closed: "E103",
} as const;
export type TemplateKind = keyof typeof TEMPLATE_IDS;
export const DEFAULT_ENTRY_ID = "E095";

export const ELENA_COLUMNS =
  "position, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, variants_fr, button_path, button_label_fr, button_label_en, button_label_de, source, is_template";

type Row = {
  position: number;
  question_fr: string | null;
  answer_fr: string | null;
  question_en: string | null;
  answer_en: string | null;
  question_de: string | null;
  answer_de: string | null;
  variants_fr: string[] | null;
  button_path: string | null;
  button_label_fr: string | null;
  button_label_en: string | null;
  button_label_de: string | null;
  source: string | null;
  is_template: boolean | null;
};

export function entryFromRow(r: Row): ElenaEntry {
  const tri = (fr: string | null, en: string | null, de: string | null): Tri => ({ fr: fr ?? "", en: en ?? fr ?? "", de: de ?? fr ?? "" });
  return {
    id: `E${String(r.position).padStart(3, "0")}`,
    theme: null,
    isTemplate: r.is_template === true,
    question: tri(r.question_fr, r.question_en, r.question_de),
    variants: r.variants_fr ?? [],
    answer: tri(r.answer_fr, r.answer_en, r.answer_de),
    button: r.button_path ? { path: r.button_path, label: tri(r.button_label_fr, r.button_label_en, r.button_label_de) } : null,
    source: r.source,
  };
}

const readTable = unstable_cache(
  async (): Promise<ElenaEntry[]> => {
    const { data, error } = await supabaseServer()
      .from("faqs")
      .select(ELENA_COLUMNS)
      .eq("page_key", "elena")
      .eq("published", true)
      .order("position", { ascending: true });
    // Colonnes absentes (SQL 37 non execute) ou autre erreur : exception,
    // rien n'est mis en cache, repli sur le fichier.
    if (error) throw new Error(error.code ?? error.message);
    return ((data as Row[] | null) ?? []).filter((r) => r.question_fr && r.answer_fr).map(entryFromRow);
  },
  ["elena-entries-v1"],
  { revalidate: 2592000, tags: [faqTag("elena")] },
);

/** Entrees d'Elena : table faqs, sinon le fichier valide. */
export async function loadElenaEntries(): Promise<{ entries: ElenaEntry[]; from: "table" | "file" }> {
  try {
    const rows = await readTable();
    if (rows.length) return { entries: rows, from: "table" };
  } catch {
    // SQL 37 pas encore execute : repli silencieux.
  }
  return { entries: FILE_ENTRIES, from: "file" };
}

/** Modele de la recherche (modifiable dans l'admin), sinon celui du fichier. */
export function templateEntry(entries: ElenaEntry[], kind: TemplateKind): ElenaEntry {
  const label = LABEL_OF(TEMPLATE_IDS[kind]);
  return entries.find((e) => e.isTemplate && e.question.fr === label) ?? (FILE_ENTRIES.find((e) => e.id === TEMPLATE_IDS[kind]) as ElenaEntry);
}

/** Entree "Question sans rapport avec l'immobilier" (meteo, sport, recette...). */
export const OFF_TOPIC_ENTRY_ID = "E094";
// Reponse et bouton : ceux de la base (modifiables dans l'admin). Formulations
// reconnues : celles de la base ET celles du fichier valide (13/11/2026). Une
// ligne inseree par une ancienne version du SQL 37 (5 formulations, sans
// "match de foot") ne fait donc jamais perdre une formulation du fichier.
export function offTopicEntry(entries: ElenaEntry[]): ElenaEntry {
  const label = LABEL_OF(OFF_TOPIC_ENTRY_ID);
  const file = FILE_ENTRIES.find((e) => e.id === OFF_TOPIC_ENTRY_ID) as ElenaEntry;
  const row = entries.find((e) => !e.isTemplate && e.question.fr === label);
  if (!row) return file;
  return { ...row, variants: [...new Set([...row.variants, ...file.variants])] };
}

/** Entree "Question dont la reponse n'est pas dans la base". */
export function defaultEntry(entries: ElenaEntry[]): ElenaEntry {
  const label = LABEL_OF(DEFAULT_ENTRY_ID);
  return entries.find((e) => !e.isTemplate && e.question.fr === label) ?? (FILE_ENTRIES.find((e) => e.id === DEFAULT_ENTRY_ID) as ElenaEntry);
}
