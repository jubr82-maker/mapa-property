import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import type { OffmarketRow } from "@/lib/admin/offmarket";

export async function fetchOffmarketAdminList(): Promise<OffmarketRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties_offmarket")
    .select(
      "id,reference,status,title,property_type,country,region,city_label,city_real,surface_habitable:surface_hab,surface_terrain,chambres:bedrooms,salles_de_bain:bathrooms,classe_energetique:energy_class,price_estimate,price_label,price_display,short_description:short_pitch,full_description:description,prestations,highlights,cover_image_url,photo_urls:gallery_urls,photos_locked,is_published,exclusive_until,signed_mandate_url,views_count,requests_count,last_request_at,created_at,updated_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[admin] fetchOffmarketAdminList", error.message);
    return [];
  }
  return (data ?? []) as unknown as OffmarketRow[];
}

export async function fetchOffmarketAdminById(
  id: string,
): Promise<OffmarketRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties_offmarket")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[admin] fetchOffmarketAdminById", error.message);
    return null;
  }
  return (data as unknown as OffmarketRow) ?? null;
}
