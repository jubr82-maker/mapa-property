import Link from "next/link";
import { notFound } from "next/navigation";
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
  const supabase = await createSupabaseServerClient();

  // Sprint SAISIE-MANUELLE étape B : select élargi aux 47 + 23 colonnes
  // réelles de `properties` (cf. lib/apimo/mapper.ts pour les colonnes
  // historiques, supabase/migrations/20260904_properties_saisie_manuelle.sql
  // pour les 23 nouvelles) — PropertyEditForm doit pouvoir éditer chaque
  // champ listé par Julien.
  const { data, error } = await supabase
    .from("properties")
    // Chaîne unique (littéral) requise : Supabase infère le type des colonnes
    // sélectionnées à partir du littéral exact passé à .select() — une
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

  // POL4-A3 (HUGO) — fetch photos depuis la table `property_images` (schema
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

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href="/admin/properties"
          className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70 hover:text-[#e0af6e]"
        >
          ← Properties
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
          Édition bien
        </p>
        <h1 className="font-display text-3xl font-bold text-[#3D4F63]">
          {data.title_fr ?? data.slug ?? data.id}
        </h1>
        <p className="text-sm text-[#3D4F63]/70">
          {[data.country, data.city].filter(Boolean).join(" · ")} ·{" "}
          <span className="font-mono text-[11px] uppercase tracking-[0.2em]">
            {data.transaction ?? "—"}
          </span>
        </p>
      </header>

      {/* POL4-A2 (CAMILLE) : édition titre + description (TipTap) + prix.
          Au-DESSUS de la section vidéo existante (PropertyVideoForm intact). */}
      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <header className="mb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            Contenu rédactionnel
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-[#3D4F63]">
            Titre, description, prix
          </h2>
          <p className="mt-2 text-sm text-[#3D4F63]/70">
            Les champs synchronisés depuis Apimo sont écrasés à chaque
            sauvegarde locale. La description supporte le gras et l&apos;italique
            (rendu uniforme côté fiche publique).
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
            Vidéo de présentation
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-[#3D4F63]">
            URL vidéo (MP4 / WebM / lien Vimeo direct)
          </h2>
          <p className="mt-2 text-sm text-[#3D4F63]/70">
            Collez ici l&apos;URL d&apos;un fichier vidéo accessible publiquement.
            L&apos;upload natif Supabase Storage arrive en Phase B — pour le moment,
            hébergez le fichier sur un CDN (Cloudflare R2, Vimeo direct file, etc.).
          </p>
        </header>
        <PropertyVideoForm
          propertyId={data.id}
          initialVideoUrl={data.video_url ?? ""}
        />
      </section>

      {/* POL4-A3 (HUGO) : gestion photos via PhotoManager générique
          (drag-drop HTML5 natif, cover, suppression). Bucket
          property-images + table property_images en wipe-and-recreate. */}
      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <header className="mb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            Photos
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-[#3D4F63]">
            Galerie ({initialPhotos.length})
          </h2>
          <p className="mt-2 text-sm text-[#3D4F63]/70">
            Glissez-déposez pour réordonner. La première sert de cover
            publique. Cliquez sur « Enregistrer l&apos;ordre » pour
            persister.
          </p>
        </header>
        <PropertyPhotosSection
          propertyId={data.id}
          initialPhotos={initialPhotos}
        />
      </section>

      <section className="rounded-2xl border border-[#3D4F63]/10 bg-[#F5EFE1]/40 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
          Aperçu public
        </p>
        <Link
          href={`/fr/biens/${data.slug ?? data.id}`}
          target="_blank"
          className="mt-2 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:text-[#e0af6e]"
        >
          Voir la fiche ↗
        </Link>
        {/* Sprint OPTIM-1A : bouton refresh ISR manuel. Utile si l'admin
            veut voir ses modifs immediatement (le TTL revalidate ISR sur
            la fiche est de 30 min — cf. C2). Les server actions
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
