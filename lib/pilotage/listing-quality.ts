// Qualite des annonces (oct. 2026) : biens publies et non archives sans
// traduction anglaise ou allemande, sans photo de couverture (photo de
// rang 0 dans property_images, meme regle que la liste admin), sans prix
// (hors "prix sur demande"), sans surface, ou en ligne depuis plus de
// LISTING_STALE_DAYS jours (date de creation de la fiche : il n'existe pas
// de date de publication en base).
import { supabaseService } from "@/lib/supabase-service";
import { LISTING_STALE_DAYS } from "@/lib/pilotage/config";

export type ListingIssue = "no_en" | "no_de" | "no_cover" | "no_price" | "no_surface" | "stale";

export type ListingQualityItem = { id: string; title: string; issues: ListingIssue[] };

export type ListingQuality = {
  available: boolean;
  published: number;
  items: ListingQualityItem[];
  counts: Record<ListingIssue, number>;
};

type Row = {
  id: string;
  slug: string | null;
  title_fr: string | null;
  title_en: string | null;
  title_de: string | null;
  description_en: string | null;
  description_de: string | null;
  price: number | null;
  price_on_demand: boolean | null;
  surface: number | null;
  living_surface: number | null;
  created_at: string | null;
  archived_at?: string | null;
  property_images: { url: string; sort: number | null }[] | null;
};

export async function loadListingQuality(): Promise<ListingQuality> {
  const cols =
    "id,slug,title_fr,title_en,title_de,description_en,description_de,price,price_on_demand,surface,living_surface,created_at,property_images(url,sort)";
  const svc = supabaseService();
  let res = (await svc.from("properties").select(`${cols},archived_at`).eq("is_published", true).limit(1000)) as unknown as {
    data: Row[] | null;
    error: { code?: string } | null;
  };
  if (res.error?.code === "42703" || res.error?.code === "PGRST204") {
    res = (await svc.from("properties").select(cols).eq("is_published", true).limit(1000)) as unknown as typeof res;
  }
  const empty: Record<ListingIssue, number> = { no_en: 0, no_de: 0, no_cover: 0, no_price: 0, no_surface: 0, stale: 0 };
  if (res.error) return { available: false, published: 0, items: [], counts: empty };
  const rows = (res.data ?? []).filter((r) => !r.archived_at);
  const staleBefore = Date.now() - LISTING_STALE_DAYS * 86400_000;
  const items: ListingQualityItem[] = [];
  for (const r of rows) {
    const issues: ListingIssue[] = [];
    if (!r.title_en?.trim() || !r.description_en?.trim()) issues.push("no_en");
    if (!r.title_de?.trim() || !r.description_de?.trim()) issues.push("no_de");
    if (!(r.property_images ?? []).some((i) => (i.sort ?? 0) === 0)) issues.push("no_cover");
    if (!r.price_on_demand && !(r.price && r.price > 0)) issues.push("no_price");
    if (!((r.surface ?? 0) > 0 || (r.living_surface ?? 0) > 0)) issues.push("no_surface");
    if (r.created_at && new Date(r.created_at).getTime() < staleBefore) issues.push("stale");
    for (const i of issues) empty[i] += 1;
    if (issues.length) items.push({ id: r.id, title: r.title_fr || r.slug || r.id.slice(0, 8), issues });
  }
  items.sort((a, b) => b.issues.length - a.issues.length);
  return { available: true, published: rows.length, items, counts: empty };
}
