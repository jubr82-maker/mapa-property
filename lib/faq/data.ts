// Questions frequentes, lecture du site public (oct. 2026). Client anon :
// la regle d'acces (SQL 23) ne laisse lire que les lignes publiees. Table
// absente ou erreur : liste vide, jamais d'exception (comme lib/data.ts).
import { unstable_cache } from "next/cache";
import { supabaseServer } from "@/lib/supabase-server";
import type { FaqLang } from "@/lib/faq/keys";

export const FAQS_TAG = "faqs";

export type FaqRow = {
  id: string;
  page_key: string;
  question_fr: string | null;
  answer_fr: string | null;
  question_en: string | null;
  answer_en: string | null;
  question_de: string | null;
  answer_de: string | null;
  position: number;
};

const COLUMNS = "id, page_key, question_fr, answer_fr, question_en, answer_en, question_de, answer_de, position";

const fetchPublishedCached = unstable_cache(
  async (): Promise<FaqRow[]> => {
    try {
      const { data, error } = await supabaseServer()
        .from("faqs")
        .select(COLUMNS)
        .eq("published", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) {
        console.error("[faq] lecture publique", error.message);
        return [];
      }
      return (data as FaqRow[] | null) ?? [];
    } catch (e) {
      console.error("[faq] lecture publique", e instanceof Error ? e.message : String(e));
      return [];
    }
  },
  ["faqs-published"],
  { revalidate: 3600, tags: [FAQS_TAG] },
);

export type FaqItem = { id: string; question: string; answer: string };

/**
 * Questions publiees d'une page, dans la langue de la page. Une question
 * sans traduction dans cette langue n'est pas affichee (jamais de repli
 * sur une autre langue).
 */
export async function fetchFaqItems(pageKey: string, lang: FaqLang): Promise<FaqItem[]> {
  const rows = (await fetchPublishedCached()).filter((r) => r.page_key === pageKey);
  return rows
    .map((r) => ({ id: r.id, question: (r[`question_${lang}`] ?? "").trim(), answer: (r[`answer_${lang}`] ?? "").trim() }))
    .filter((r) => r.question && r.answer);
}
