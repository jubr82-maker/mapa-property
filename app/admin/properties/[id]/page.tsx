import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { PropertyVideoForm } from "@/components/admin/PropertyVideoForm";

export const dynamic = "force-dynamic";

export default async function AdminPropertyEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("properties")
    .select("id, slug, title_fr, city, country, transaction, video_url")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin/properties/[id]] query error:", error);
  }
  if (!data) notFound();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href="/admin/properties"
          className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70 hover:text-[#B8865A]"
        >
          ← Properties
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
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

      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white p-6">
        <header className="mb-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
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

      <section className="rounded-2xl border border-[#3D4F63]/10 bg-[#F5EFE1]/40 p-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
          Aperçu public
        </p>
        <Link
          href={`/fr/biens/${data.slug ?? data.id}`}
          target="_blank"
          className="mt-2 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:text-[#B8865A]"
        >
          Voir la fiche ↗
        </Link>
      </section>
    </div>
  );
}
