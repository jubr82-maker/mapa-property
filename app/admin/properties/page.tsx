import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { PropertiesTable } from "@/components/admin/PropertiesTable";

export const dynamic = "force-dynamic";

export default async function AdminPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ featured?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("properties")
    .select(
      "id,slug,transaction,country,city,title_fr,price,surface,bedrooms,energy,is_published,is_featured,featured_order,cover_image_url,property_images(url,sort)",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (sp.featured === "1") query = query.eq("is_featured", true);

  const { data } = await query;
  const rows = (data ?? []).map((p) => {
    type Img = { url: string; sort: number | null };
    const imgs = (p.property_images as Img[] | null) ?? [];
    const sorted = [...imgs].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    const cover = sorted[0]?.url ?? p.cover_image_url ?? null;
    return {
      id: p.id,
      slug: p.slug,
      title: p.title_fr,
      city: p.city,
      country: p.country,
      transaction: p.transaction,
      price: p.price,
      surface: p.surface,
      bedrooms: p.bedrooms,
      energy: p.energy,
      cover,
      is_published: !!p.is_published,
      is_featured: !!p.is_featured,
    };
  });

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
            Console MAPA
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            Properties (Apimo)
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {rows.length} bien{rows.length > 1 ? "s" : ""} synchronisé{rows.length > 1 ? "s" : ""}
            {" "}— lecture seule, sauf <em>is_published</em> et <em>is_featured</em>.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/properties"
            className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] ${
              !sp.featured
                ? "bg-[#3D4F63] text-[#F5EFE1]"
                : "border border-[#3D4F63]/20 text-[#3D4F63]"
            }`}
          >
            Tous
          </Link>
          <Link
            href="/admin/properties?featured=1"
            className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] ${
              sp.featured === "1"
                ? "bg-[#B8865A] text-white"
                : "border border-[#3D4F63]/20 text-[#3D4F63]"
            }`}
          >
            Coups de cœur uniquement
          </Link>
        </div>
      </header>
      <PropertiesTable rows={rows} />
    </div>
  );
}
