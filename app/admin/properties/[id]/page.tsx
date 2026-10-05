import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE } from "@/lib/datetime";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { PropertyVideoForm } from "@/components/admin/PropertyVideoForm";
import { PropertyEditForm } from "@/components/admin/PropertyEditForm";
import { PropertyPhotosSection } from "@/components/admin/PropertyPhotosSection";
import { RevalidateButton } from "@/components/admin/RevalidateButton";
import type { PhotoData } from "@/components/admin/PhotoManager";

export const dynamic = "force-dynamic";

export default async function AdminPropertyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_properties" });
  const supabase = await createSupabaseServerClient();

  // Select elargi a toutes les colonnes de contenu de `properties` :
  // PropertyEditForm doit pouvoir modifier chaque champ de la fiche.
  const { data, error } = await supabase
    .from("properties")
    // Chaîne unique (littéral) requise : Supabase infère le type des colonnes
    // sélectionnées à partir du littéral exact passé à .select() : une
    // concaténation ou un .join() runtime dégrade le type en GenericStringError.
    .select(
      "id, slug, title_fr, title_en, title_de, description_fr, description_en, description_de, short_description_fr, short_description_en, short_description_de, price, price_on_demand, price_min, price_max, city, country, transaction, video_url, badge, badge_size, badge_position, surface, living_surface, usable_surface, land_surface, terrace_surface, balcony_surface, garden_surface, kitchen_surface, area_total, bedrooms, bathrooms, douches, wc, bureaux, locaux_stockage, floor, has_laundry, has_dressing, has_pool, parking, energy, thermal, ges, year, year_built, amenities, current_use, potential_use, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin/properties/[id]] query error:", error);
  }
  if (!data) notFound();

  // Photos depuis la table `property_images` (schema
  // réel = table jointe, pas colonne jsonb). cover = sort 0.
  // Reconstruire le path bucket à partir de l'URL publique : Supabase Storage
  // public URL pattern = `.../storage/v1/object/public/{bucket}/{path}`.
  // On extrait ce qui suit `/property-images/` pour permettre les deletes.
  const { data: imgs } = await supabase
    .from("property_images")
    .select("url, sort")
    .eq("property_id", id)
    .order("sort", { ascending: true });
  const initialPhotos: PhotoData[] = (imgs ?? []).map((row, i) => {
    const url = row.url ?? "";
    const m = url.match(/\/property-images\/(.+)$/);
    return {
      url,
      path: m ? m[1] : "",
      isCover: i === 0,
      order: i,
    };
  });

  const countryLabel =
    data.country && t.has(`country_${data.country}`) ? t(`country_${data.country}`) : data.country;
  const transactionLabel =
    data.transaction && t.has(`transaction_${data.transaction}`)
      ? t(`transaction_${data.transaction}`)
      : (data.transaction ?? "");

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href="/admin/properties"
          className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70 hover:text-[#e0af6e]"
        >
          {t("back_to_list")}
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          {t("edit_kicker")}
        </p>
        <h1 className="font-display text-3xl font-bold text-[#3D4F63]">
          {data.title_fr ?? data.slug ?? data.id}
        </h1>
        <p className="text-sm text-[#3D4F63]/70">
          {[countryLabel, data.city].filter(Boolean).join(" · ")}
          {transactionLabel && (
            <>
              {" · "}
              <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
                {transactionLabel}
              </span>
            </>
          )}
        </p>
      </header>

      {/* Formulaire complet de la fiche (description, caractéristiques,
          prix), au-dessus de la section vidéo. */}
      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <header className="mb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {t("content_kicker")}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-[#3D4F63]">
            {t("content_title")}
          </h2>
          <p className="mt-2 text-sm text-[#3D4F63]/70">
            {t("content_hint")}
          </p>
        </header>
        <PropertyEditForm
          propertyId={data.id}
          initial={{
            title_fr: data.title_fr ?? null,
            title_en: data.title_en ?? null,
            title_de: data.title_de ?? null,
            description_fr: data.description_fr ?? null,
            description_en: data.description_en ?? null,
            description_de: data.description_de ?? null,
            short_description_fr: data.short_description_fr ?? null,
            short_description_en: data.short_description_en ?? null,
            short_description_de: data.short_description_de ?? null,
            surface: data.surface ?? null,
            living_surface: data.living_surface ?? null,
            usable_surface: data.usable_surface ?? null,
            land_surface: data.land_surface ?? null,
            terrace_surface: data.terrace_surface ?? null,
            balcony_surface: data.balcony_surface ?? null,
            garden_surface: data.garden_surface ?? null,
            kitchen_surface: data.kitchen_surface ?? null,
            area_total: data.area_total ?? null,
            bedrooms: data.bedrooms ?? null,
            bathrooms: data.bathrooms ?? null,
            douches: data.douches ?? null,
            wc: data.wc ?? null,
            bureaux: data.bureaux ?? null,
            locaux_stockage: data.locaux_stockage ?? null,
            floor: data.floor ?? null,
            has_laundry: data.has_laundry ?? false,
            has_dressing: data.has_dressing ?? false,
            has_pool: data.has_pool ?? false,
            parking: data.parking ?? null,
            energy: data.energy ?? null,
            thermal: data.thermal ?? null,
            ges: data.ges ?? null,
            year: data.year ?? null,
            year_built: data.year_built ?? null,
            price: data.price ?? null,
            price_on_demand: data.price_on_demand ?? false,
            price_min: data.price_min ?? null,
            price_max: data.price_max ?? null,
            amenities: data.amenities ?? null,
            current_use: data.current_use ?? null,
            potential_use: data.potential_use ?? null,
            status: data.status ?? "published",
            badge: data.badge ?? null,
            badge_size: data.badge_size ?? null,
            badge_position: data.badge_position ?? null,
          }}
        />
      </section>

      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <header className="mb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {t("video_kicker")}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-[#3D4F63]">
            {t("video_title")}
          </h2>
          <p className="mt-2 text-sm text-[#3D4F63]/70">
            {t("video_hint")}
          </p>
        </header>
        <PropertyVideoForm
          propertyId={data.id}
          initialVideoUrl={data.video_url ?? ""}
        />
      </section>

      {/* Photos via PhotoManager generique (glisser-deposer, photo
          principale, suppression). */}
      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <header className="mb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {t("photos_kicker")}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-[#3D4F63]">
            {t("photos_title", { count: initialPhotos.length })}
          </h2>
          <p className="mt-2 text-sm text-[#3D4F63]/70">
            {t("photos_hint")}
          </p>
        </header>
        <PropertyPhotosSection
          propertyId={data.id}
          initialPhotos={initialPhotos}
        />
      </section>

      <section className="rounded-2xl border border-[#3D4F63]/10 bg-[#F5EFE1]/40 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
          {t("public_preview")}
        </p>
        <Link
          href={`/fr/biens/${data.slug ?? data.id}`}
          target="_blank"
          className="mt-2 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:text-[#e0af6e]"
        >
          {t("view_listing")}
        </Link>
        {/* Bouton de mise a jour manuelle de la fiche publique. Utile si
            l'admin veut voir ses modifs immediatement (revalidation de la
            fiche toutes les 30 min). Les server actions
            invalident deja la fiche par slug, ce bouton est un fallback
            de confort. */}
        {data.slug && (
          <div className="mt-4">
            <RevalidateButton path={`/fr/biens/${data.slug}`} />
          </div>
        )}
      </section>
    </div>
  );
}
