import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SimpleTable } from "@/components/admin/SimpleTable";

export const dynamic = "force-dynamic";

export default async function AdminBlogPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("id,slug,title_fr,primary_tag,published_at,is_published")
    .order("published_at", { ascending: false });

  const rows = (data ?? []).map((p) => ({
    id: p.id,
    cells: [
      p.title_fr ?? p.slug,
      p.primary_tag ?? "—",
      p.published_at ? new Date(p.published_at).toLocaleDateString("fr-FR") : "—",
      <span
        key="status"
        className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
          p.is_published ? "bg-emerald-100 text-emerald-800" : "bg-[#3D4F63]/10 text-[#3D4F63]"
        }`}
      >
        {p.is_published ? "Publié" : "Brouillon"}
      </span>,
      <Link
        key="edit"
        href={`/admin/blog/${p.id}/edit`}
        className="rounded border border-[#3D4F63]/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
      >
        Éditer
      </Link>,
    ],
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
            Console MAPA
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            Blog
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {rows.length} article{rows.length > 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/blog/new"
          className="rounded-full bg-[#B8865A] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-white hover:bg-[#9d6e44]"
        >
          + Nouvel article
        </Link>
      </header>

      <SimpleTable
        headers={["Titre", "Catégorie", "Publié le", "Statut", "Actions"]}
        rows={rows}
        emptyText="Aucun article."
      />
    </div>
  );
}
