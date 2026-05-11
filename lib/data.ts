import { supabaseServer } from "./supabase-server";
import type {
  BlogPost,
  InterestRates,
  Property,
  PropertyImage,
  PropertyOffmarket,
  Review,
} from "./types";

const safeArray = <T>(value: T[] | null | undefined): T[] => value ?? [];

export async function fetchFeaturedProperties(limit = 6): Promise<Property[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("properties")
    .select("*")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("featured_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[data] fetchFeaturedProperties", error.message);
    return [];
  }
  return safeArray<Property>(data as Property[] | null);
}

export type PropertyWithCover = Property & { cover_url: string | null };

export async function fetchFeaturedPropertiesWithCover(
  limit = 6,
): Promise<PropertyWithCover[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("properties")
    .select("*, property_images(url, sort)")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("featured_order", { ascending: true })
    .limit(limit);
  if (error) {
    console.error("[data] fetchFeaturedPropertiesWithCover", error.message);
    return [];
  }
  type Row = Property & { property_images: { url: string; sort: number | null }[] | null };
  return ((data as Row[] | null) ?? []).map((row) => {
    const sorted = (row.property_images ?? [])
      .slice()
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    return {
      ...row,
      cover_url: sorted[0]?.url ?? row.cover_image_url ?? null,
    };
  });
}

// Coups de cœur unifiés (CHANTIER 5 V3) : Apimo is_featured + Off-Market
// is_coup_de_coeur, limité à 6, classés par created_at DESC. Type pivot
// "HomeFeatured" pour permettre des liens distincts (/biens/[slug] vs
// /off-market/[id]).
export type HomeFeatured = {
  id: string;
  kind: "apimo" | "offmarket";
  slug: string | null;
  title: string | null;
  city: string | null;
  country: string | null;
  price: number | null;
  price_label: string | null;
  cover_url: string | null;
  surface: number | null;
  bedrooms: number | null;
  created_at: string | null;
};

export async function fetchHomeFeatured(limit = 6): Promise<HomeFeatured[]> {
  const sb = supabaseServer();

  const [apimoRes, offmarketRes] = await Promise.all([
    sb
      .from("properties")
      .select("id,slug,title_fr,city,country,price,surface,bedrooms,cover_image_url,created_at,property_images(url,sort)")
      .eq("is_published", true)
      .eq("is_featured", true)
      .order("created_at", { ascending: false })
      .limit(limit),
    sb
      .from("properties_offmarket")
      .select("id,reference,title,city_label,country,price_label,price_display,surface_hab,bedrooms,cover_image_url,created_at,is_coup_de_coeur,is_published,status")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (apimoRes.error) console.error("[data] fetchHomeFeatured apimo", apimoRes.error.message);
  if (offmarketRes.error) console.error("[data] fetchHomeFeatured offmarket", offmarketRes.error.message);

  type ApimoRow = {
    id: string;
    slug: string | null;
    title_fr: string | null;
    city: string | null;
    country: string | null;
    price: number | null;
    surface: number | null;
    bedrooms: number | null;
    cover_image_url: string | null;
    created_at: string | null;
    property_images: { url: string; sort: number | null }[] | null;
  };
  type OffmarketRow = {
    id: string;
    reference: string | null;
    title: string | null;
    city_label: string | null;
    country: string | null;
    price_label: string | null;
    price_display: string | null;
    surface_hab: number | null;
    bedrooms: number | null;
    cover_image_url: string | null;
    created_at: string | null;
    is_coup_de_coeur: boolean | null;
    is_published: boolean | null;
    status: string | null;
  };

  const apimo: HomeFeatured[] = ((apimoRes.data as ApimoRow[] | null) ?? []).map((row) => {
    const sorted = (row.property_images ?? []).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    return {
      id: row.id,
      kind: "apimo",
      slug: row.slug,
      title: row.title_fr,
      city: row.city,
      country: row.country,
      price: row.price,
      price_label: row.price
        ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(row.price) + " €"
        : null,
      cover_url: sorted[0]?.url ?? row.cover_image_url ?? null,
      surface: row.surface,
      bedrooms: row.bedrooms,
      created_at: row.created_at,
    };
  });

  const offmarket: HomeFeatured[] = ((offmarketRes.data as OffmarketRow[] | null) ?? [])
    .filter(
      (row) =>
        row.is_coup_de_coeur === true &&
        row.is_published === true &&
        row.status === "published",
    )
    .map((row) => ({
      id: row.id,
      kind: "offmarket",
      slug: row.reference,
      title: row.title,
      city: row.city_label,
      country: row.country,
      price: null,
      price_label: row.price_label ?? row.price_display ?? "Prix sur demande",
      cover_url: row.cover_image_url,
      surface: row.surface_hab,
      bedrooms: row.bedrooms,
      created_at: row.created_at,
    }));

  const all = [...apimo, ...offmarket]
    .sort((a, b) => {
      const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bd - ad;
    })
    .slice(0, limit);

  return all;
}

export async function fetchAllPropertiesWithCover(): Promise<PropertyWithCover[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("properties")
    .select("*, property_images(url, sort)")
    .eq("is_published", true);
  if (error) {
    console.error("[data] fetchAllPropertiesWithCover", error.message);
    return [];
  }
  type Row = Property & { property_images: { url: string; sort: number | null }[] | null };
  return ((data as Row[] | null) ?? []).map((row) => {
    const sorted = (row.property_images ?? [])
      .slice()
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    return {
      ...row,
      cover_url: sorted[0]?.url ?? row.cover_image_url ?? null,
    };
  });
}

export async function fetchPublishedProperties(): Promise<Property[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("properties")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[data] fetchPublishedProperties", error.message);
    return [];
  }
  return safeArray<Property>(data as Property[] | null);
}

export async function fetchPropertyBySlug(slug: string): Promise<Property | null> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("[data] fetchPropertyBySlug", error.message);
    return null;
  }
  return (data as Property | null) ?? null;
}

export async function fetchPropertyImages(
  propertyId: string,
): Promise<PropertyImage[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("property_images")
    .select("*")
    .eq("property_id", propertyId)
    .order("sort", { ascending: true });
  if (error) {
    console.error("[data] fetchPropertyImages", error.message);
    return [];
  }
  return safeArray<PropertyImage>(data as PropertyImage[] | null);
}

export async function fetchOffmarketList(): Promise<PropertyOffmarket[]> {
  const sb = supabaseServer();
  // Lecture publique via VIEW (champs non-confidentiels uniquement).
  const { data, error } = await sb
    .from("properties_offmarket_public")
    .select("*")
    .order("display_order", { ascending: true });
  if (error) {
    // Fallback : table directe avec colonnes legacy si la VIEW n'existe pas encore.
    const fallback = await sb
      .from("properties_offmarket")
      .select("*")
      .eq("is_published", true)
      .order("display_order", { ascending: true });
    if (fallback.error) {
      console.error("[data] fetchOffmarketList", error.message);
      return [];
    }
    return mapPublicRows(fallback.data);
  }
  return mapPublicRows(data);
}

export async function fetchOffmarketById(
  id: string,
): Promise<PropertyOffmarket | null> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("properties_offmarket_public")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    const fallback = await sb
      .from("properties_offmarket")
      .select("*")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();
    if (fallback.error || !fallback.data) {
      if (error) console.error("[data] fetchOffmarketById", error.message);
      return null;
    }
    return mapPublicRows([fallback.data])[0] ?? null;
  }
  return mapPublicRows([data])[0] ?? null;
}

function mapPublicRows(rows: unknown[] | null): PropertyOffmarket[] {
  if (!rows) return [];
  return rows.map((raw) => {
    const r = raw as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      title: (r.title as string | null) ?? null,
      internal_ref: (r.reference as string | null) ?? (r.internal_ref as string | null) ?? null,
      country: (r.country as string | null) ?? null,
      city_label:
        (r.city_anonymized as string | null) ??
        (r.city_label as string | null) ??
        null,
      surface_hab:
        (r.surface_habitable as number | null) ??
        (r.surface_hab as number | null) ??
        null,
      surface_terrain: (r.surface_terrain as number | null) ?? null,
      bedrooms:
        (r.chambres as number | null) ?? (r.bedrooms as number | null) ?? null,
      bathrooms:
        (r.salles_de_bain as number | null) ??
        (r.bathrooms as number | null) ??
        null,
      energy_class:
        (r.classe_energetique as string | null) ??
        (r.energy_class as string | null) ??
        null,
      price_display:
        (r.price_label as string | null) ??
        (r.price_display as string | null) ??
        null,
      short_pitch:
        (r.short_description as string | null) ??
        (r.short_pitch as string | null) ??
        null,
      description: (r.full_description as string | null) ?? (r.description as string | null) ?? null,
      highlights: (r.highlights as string[] | null) ?? null,
      cover_image_url: (r.cover_image_url as string | null) ?? null,
      gallery_urls: (r.gallery_urls as string[] | null) ?? null,
      is_published: true,
      display_order: (r.display_order as number | null) ?? null,
    };
  });
}

export async function fetchPublishedReviews(limit = 12): Promise<Review[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("reviews")
    .select("*")
    .eq("is_published", true)
    .order("review_date", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[data] fetchPublishedReviews", error.message);
    return [];
  }
  return safeArray<Review>(data as Review[] | null);
}

export async function fetchLatestBlogPosts(limit = 3): Promise<BlogPost[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[data] fetchLatestBlogPosts", error.message);
    return [];
  }
  return safeArray<BlogPost>(data as BlogPost[] | null);
}

export async function fetchAllBlogPosts(): Promise<BlogPost[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });
  if (error) {
    console.error("[data] fetchAllBlogPosts", error.message);
    return [];
  }
  return safeArray<BlogPost>(data as BlogPost[] | null);
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) {
    console.error("[data] fetchBlogPostBySlug", error.message);
    return null;
  }
  return (data as BlogPost | null) ?? null;
}

export async function fetchLatestInterestRates(): Promise<InterestRates | null> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("interest_rates")
    .select("*")
    .order("reference_month", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[data] fetchLatestInterestRates", error.message);
    return null;
  }
  return (data as InterestRates | null) ?? null;
}
