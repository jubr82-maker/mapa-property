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

/** Etiquette des questions d'une page (oct. 2026, quotas Vercel). */
export function faqTag(pageKey: string): string {
  return `faqs:${pageKey}`;
}

// Lecture mise en cache PAR PAGE (oct. 2026, quotas Vercel) : enregistrer
// une question ne rafraichit que les pages de sa page_key (etiquette
// faqs:<page_key>), plus jamais toutes les pages qui affichent une FAQ.
// L'etiquette "faqs" reste posee sur toutes, pour un rafraichissement
// general exceptionnel. Une ERREUR leve une exception DANS la fonction
// cachee : rien n'est mis en cache, la lecture suivante reessaie (cause
// prouvee le 2026-10-16 : un [] mis en cache etait reutilise par les
// builds suivants).
function fetchPageCached(pageKey: string): Promise<FaqRow[]> {
  return unstable_cache(
    async (): Promise<FaqRow[]> => {
      const { data, error } = await supabaseServer()
        .from("faqs")
        .select(COLUMNS)
        .eq("published", true)
        .eq("page_key", pageKey)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data as FaqRow[] | null) ?? [];
    },
    ["faqs-page-v3", pageKey],
    { revalidate: 2592000, tags: [FAQS_TAG, faqTag(pageKey)] }, // secours 30 jours ; etiquette revalidee a chaque enregistrement
  )();
}

/** Questions publiees d'une page ; table absente ou erreur : liste vide (non mise en cache). */
async function fetchPublished(pageKey: string): Promise<FaqRow[]> {
  try {
    return await fetchPageCached(pageKey);
  } catch (e) {
    console.error("[faq] lecture publique", e instanceof Error ? e.message : String(e));
    return [];
  }
}

export type FaqItem = { id: string; question: string; answer: string };

/**
 * Questions publiees d'une page, dans la langue de la page. Une question
 * sans traduction dans cette langue n'est pas affichee (jamais de repli
 * sur une autre langue).
 */
export async function fetchFaqItems(pageKey: string, lang: FaqLang): Promise<FaqItem[]> {
  const rows = await fetchPublished(pageKey);
  return rows
    .map((r) => ({ id: r.id, question: (r[`question_${lang}`] ?? "").trim(), answer: (r[`answer_${lang}`] ?? "").trim() }))
    .filter((r) => r.question && r.answer);
}
