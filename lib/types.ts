export type Transaction = "sale" | "rent" | "offmarket";
export type Locale = "fr" | "en" | "de";

export interface Property {
  id: string;
  slug: string;
  transaction: Transaction;
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
  parking: number | null;
  year: number | null;
  energy: string | null;
  is_featured: boolean | null;
  featured_order: number | null;
  is_published: boolean | null;
  video_url?: string | null;
  cover_image_url?: string | null;
}

export interface PropertyImage {
  id: string;
  property_id: string;
  url: string;
  sort: number | null;
}

export interface PropertyOffmarket {
  id: string;
  title: string | null;
  internal_ref: string | null;
  country: string | null;
  city_label: string | null;
  surface_hab: number | null;
  surface_terrain: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  energy_class: string | null;
  price_display: string | null;
  short_pitch: string | null;
  description: string | null;
  highlights: string[] | null;
  cover_image_url: string | null;
  gallery_urls: string[] | null;
  is_published: boolean | null;
  display_order: number | null;
}

export interface Review {
  id: string;
  name: string | null;
  rating: number | null;
  comment: string | null;
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
