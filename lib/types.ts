export type Transaction = "sale" | "rent" | "offmarket";
export type Locale = "fr" | "en" | "de";

export interface Property {
  id: string;
  slug: string;
  transaction: Transaction;
  // Slug riche optionnel (lib/taxonomy/property-types.ts TRANSACTION_TYPES,
  // ex. "vente-en-viager"). NULL pour les biens créés avant cette colonne :
  // l'affichage retombe alors sur transaction (Vente/Location).
  transaction_detail?: string | null;
  country: string | null;
  city: string | null;
  title_fr: string | null;
  title_en: string | null;
  title_de: string | null;
  description_fr: string | null;
  description_en: string | null;
  description_de: string | null;
  price: number | null;
  surface: number | null;
  living_surface: number | null;
  land_surface: number | null;
  terrace_surface: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  badge: string | null;
  // Type de mandat (SQL 16, oct. 2026) : exclusive, semi_exclusive, simple,
  // autonomous. Absent tant que la colonne n'existe pas.
  mandate_type?: string | null;
  // Modele d'annonce (SQL 17) : pieces par niveau (textes alternatifs).
  listing_data?: unknown;
  // Sprint badges commerciaux : libellé admin-driven (allowlist 6 valeurs
  // côté server action) + taille (S/M/L) + position (4 coins). Couleur
  // dérivée du libellé via mapping côté code (PropertyCard).
  badge_size: "S" | "M" | "L" | null;
  badge_position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | null;
  parking: number | null;
  year: number | null;
  energy: string | null;
  is_featured: boolean | null;
  featured_order: number | null;
  is_published: boolean | null;
  video_url?: string | null;
  // Sprint C13 : colonne reelle de la table public.properties (Capitalized
  // FR + variantes Apimo). Consommee par matchesTypeQuery pour le filtrage
  // par equivalences (maison<->villa, appartement<->duplex<->penthouse...).
  // Optionnel a la lecture pour les rows mal renseignees (fallback title).
  property_type?: string | null;
  // Note : la table public.properties n'a PAS de colonne cover_image_url
  // (les photos sont dans la table séparée property_images via property_id
  // + sort). Voir lib/properties.ts pour les helpers getCoverImage /
  // getAllImages.
}

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  sort: number | null;
  // Textes alternatifs et piece de la photo (SQL 20, oct. 2026), absents avant.
  alt_fr?: string | null;
  alt_en?: string | null;
  alt_de?: string | null;
  room_id?: string | null;
}

export interface PropertyOffmarket {
  id: string;
  title: string | null;
  internal_ref: string | null;
  // AJOUT 2026-09-08 : distinction Vente/Location, alignée sur les
  // valeurs de Transaction (sale/rent). Nullable — colonne
  // potentiellement absente tant que la migration n'est pas appliquée.
  transaction: "sale" | "rent" | null;
  country: string | null;
  city_label: string | null;
  surface_hab: number | null;
  surface_terrain: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  energy_class: string | null;
  price_display: string | null;
  price_mode: string | null;
  price_estimate: number | null;
  price_min: number | null;
  price_max: number | null;
  price_custom_text: string | null;
  // POL2-9 : masque le prix ("Prix sur demande") si true. Colonne
  // potentiellement absente tant que la migration n'est pas appliquée
  // → traitée comme false (prix affiché) côté mapper/composant.
  price_on_demand: boolean | null;
  short_pitch: string | null;
  description: string | null;
  highlights: string[] | null;
  cover_image_url: string | null;
  gallery_urls: string[] | null;
  // POL2-10 : vidéo de présentation. Colonne potentiellement absente
  // tant que la migration n'est pas appliquée → traitée comme null.
  video_url: string | null;
  is_published: boolean | null;
  display_order: number | null;
}

// Colonnes reelles de public.reviews : lib/reviews.ts (REVIEW_COLUMNS).
export interface Review {
  id: string;
  name: string | null;
  rating: number | null;
  comment: string | null;
  comment_en: string | null;
  comment_de: string | null;
  source_lang: string | null;
  review_date: string | null;
  is_published: boolean | null;
}

export interface BlogPost {
  id: string;
  slug: string;
  title_fr: string | null;
  title_en: string | null;
  title_de: string | null;
  excerpt_fr: string | null;
  excerpt_en: string | null;
  excerpt_de: string | null;
  content_fr: string | null;
  content_en: string | null;
  content_de: string | null;
  cover_image: string | null;
  published_at: string | null;
  is_published: boolean | null;
  author: string | null;
  primary_tag: string | null;
  tags: string[] | null;
  faq_fr: unknown;
  faq_en: unknown;
  faq_de: unknown;
  meta_title: string | null;
  meta_description: string | null;
  seo_title_fr?: string | null;
  seo_title_en?: string | null;
  seo_title_de?: string | null;
  seo_description_fr?: string | null;
  seo_description_en?: string | null;
  seo_description_de?: string | null;
  commune?: string | null;
  show_standard_ending?: boolean | null;
}

export interface InterestRates {
  id: string;
  rates: {
    fixed_5?: number;
    fixed_10?: number;
    fixed_15?: number;
    fixed_20?: number;
    fixed_25?: number;
    fixed_30?: number;
    variable?: number;
  };
  reference_month: string | null;
  source: string | null;
}

export interface LeadInsert {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  message?: string;
  type: string;
  property_ref?: string;
  source?: string;
  lang?: string;
  country?: string;
  city?: string;
  /** Sprint C3 : objet pre-cadre du formulaire /contact (NULLABLE). */
  subject?: string;
}

type WithLangColumns<T extends string> = `${T}_fr` | `${T}_en` | `${T}_de`;

export const pickLang = <
  T extends Partial<Record<WithLangColumns<K>, string | null>>,
  K extends string,
>(
  record: T,
  key: K,
  locale: Locale,
): string => {
  const keyed = `${key}_${locale}` as WithLangColumns<K>;
  const fallback = `${key}_fr` as WithLangColumns<K>;
  return (
    (record[keyed] as string | null | undefined) ??
    (record[fallback] as string | null | undefined) ??
    ""
  );
};
