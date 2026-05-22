import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SimpleTable } from "@/components/admin/SimpleTable";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("reviews")
    .select("id,name,rating,comment,review_date,is_published")
    .order("review_date", { ascending: false });

  const rows = (data ?? []).map((r) => ({
    id: r.id,
    cells: [
      r.name ?? "—",
      "★".repeat(r.rating ?? 0) + "☆".repeat(Math.max(0, 5 - (r.rating ?? 0))),
      r.review_date ? new Date(r.review_date).toLocaleDateString("fr-FR") : "—",
      <span
        key="status"
        className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] ${
          r.is_published ? "bg-emerald-100 text-emerald-800" : "bg-[#3D4F63]/10 text-[#3D4F63]"
        }`}
      >
        {r.is_published ? "Publié" : "Brouillon"}
      </span>,
      <Link
        key="edit"
        href={`/admin/reviews/${r.id}/edit`}
        className="rounded border border-[#3D4F63]/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
      >
        Éditer
      </Link>,
    ],
  }));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            Console MAPA
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            Avis clients
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {rows.length} avis · ordre carrousel par date décroissante
          </p>
        </div>
        <Link
          href="/admin/reviews/new"
          className="rounded-full bg-[#e0af6e] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-white hover:bg-[#9d6e44]"
        >
          + Nouvel avis
        </Link>
      </header>

      <SimpleTable
        headers={["Nom", "Note", "Date", "Statut", "Actions"]}
        rows={rows}
        emptyText="Aucun avis."
      />
    </div>
  );
}
