// Avis clients (oct. 2026) : table public.reviews, colonnes relevees en
// base par Julien et AUCUNE autre. Module pur (sans acces a la base) :
// construction des donnees ecrites par l'admin, texte selon la langue,
// motif clair d'un echec. Teste par pnpm test:security.

/** Colonnes reelles de public.reviews. */
export const REVIEW_COLUMNS = [
  "id",
  "name",
  "rating",
  "review_date",
  "comment",
  "comment_en",
  "comment_de",
  "source_lang",
  "source",
  "is_published",
  "apimo_id_link",
  "created_at",
] as const;
export type ReviewColumn = (typeof REVIEW_COLUMNS)[number];

export const REVIEW_LANGS = ["fr", "en", "de"] as const;
export type ReviewLang = (typeof REVIEW_LANGS)[number];

/** Colonne du texte selon la langue de l'avis. */
export const REVIEW_TEXT_COLUMN: Record<ReviewLang, "comment" | "comment_en" | "comment_de"> = {
  fr: "comment",
  en: "comment_en",
  de: "comment_de",
};

export type ReviewRow = {
  id: string | number;
  name: string | null;
  rating: number | null;
  review_date: string | null;
  comment: string | null;
  comment_en?: string | null;
  comment_de?: string | null;
  source_lang?: string | null;
  is_published: boolean | null;
};

export function isReviewLang(v: unknown): v is ReviewLang {
  return typeof v === "string" && (REVIEW_LANGS as readonly string[]).includes(v);
}

/** Langue d'origine d'un avis (defaut de la table : fr). */
export function reviewSourceLang(r: Pick<ReviewRow, "source_lang">): ReviewLang {
  return isReviewLang(r.source_lang) ? r.source_lang : "fr";
}

/** Texte d'origine (colonne de la langue de l'avis). */
export function reviewSourceText(r: ReviewRow): string {
  return (r[REVIEW_TEXT_COLUMN[reviewSourceLang(r)]] ?? "").trim();
}

/** Texte a afficher dans une langue : traduction si presente, sinon l'original. */
export function reviewTextFor(r: ReviewRow, locale: string): string {
  const col = isReviewLang(locale) ? REVIEW_TEXT_COLUMN[locale] : "comment";
  return (r[col] ?? "").trim() || reviewSourceText(r);
}

export type ReviewFormInput = {
  name: string;
  rating: string;
  review_date: string;
  lang: string;
  text: string;
  /** Case "Affiche dans le carrousel du site". */
  carousel: boolean;
  /** Langue enregistree avant la modification (edition seulement). */
  previous_lang?: string;
};

/** Cle de message (admin_reviews.err_*) d'une saisie invalide. */
export type ReviewInputError = "err_name" | "err_rating" | "err_date" | "err_lang" | "err_text";

/**
 * Donnees ecrites dans public.reviews, uniquement dans ses colonnes : le
 * texte dans la colonne de la langue choisie, la langue dans source_lang,
 * la case du carrousel dans is_published. En edition, si la langue change,
 * l'ancienne colonne d'origine est videe (le texte a ete deplace) ; les
 * traductions des autres langues ne sont pas touchees.
 */
export function buildReviewWrite(
  input: ReviewFormInput,
): { ok: true; data: Partial<Record<ReviewColumn, string | number | boolean | null>> } | { ok: false; error: ReviewInputError } {
  const name = input.name.trim();
  if (!name || name.length > 200) return { ok: false, error: "err_name" };
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { ok: false, error: "err_rating" };
  const date = input.review_date.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) return { ok: false, error: "err_date" };
  if (!isReviewLang(input.lang)) return { ok: false, error: "err_lang" };
  const text = input.text.trim();
  if (!text || text.length > 5000) return { ok: false, error: "err_text" };

  const data: Partial<Record<ReviewColumn, string | number | boolean | null>> = {
    name,
    rating,
    review_date: date,
    source_lang: input.lang,
    is_published: input.carousel,
    [REVIEW_TEXT_COLUMN[input.lang]]: text,
  };
  if (isReviewLang(input.previous_lang) && input.previous_lang !== input.lang) {
    data[REVIEW_TEXT_COLUMN[input.previous_lang]] = null;
  }
  return { ok: true, data };
}

// Motif clair d'un echec en base : lib/admin/db-error.ts (commun a
// l'admin), repris ici pour les avis.
export { dbErrorReason as reviewDbErrorReason, type DbError } from "@/lib/admin/db-error";
