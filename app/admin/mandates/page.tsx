import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SimpleTable } from "@/components/admin/SimpleTable";

export const dynamic = "force-dynamic";

export default async function AdminMandatesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: mandates } = await supabase
    .from("mandate_requests")
    .select(
      "id,created_at,first_name,last_name,email,phone,city,country,budget_min,budget_max,property_type,timeline,status",
    )
    .order("created_at", { ascending: false });

  const rows = (mandates ?? []).map((m) => ({
    id: m.id,
    cells: [
      new Date(m.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }),
      `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || "—",
      m.email,
      m.phone ?? "—",
      [m.country, m.city].filter(Boolean).join(" · ") || "—",
      m.budget_min && m.budget_max
        ? `${(m.budget_min / 1000).toFixed(0)}k – ${(m.budget_max / 1000).toFixed(0)}k €`
        : "—",
      m.property_type ?? "—",
      m.timeline ?? "—",
      m.status ?? "pending",
    ],
  }));

  return (
    <div className="space-y-8">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
          Console MAPA
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
          Mandats de recherche
        </h1>
        <p className="mt-1 text-sm text-[#3D4F63]/70">
          {rows.length} mandat{rows.length > 1 ? "s" : ""}
        </p>
      </header>

      <SimpleTable
        headers={["Date", "Nom", "Email", "Téléphone", "Localisation", "Budget", "Type", "Délai", "Statut"]}
        rows={rows}
        emptyText="Aucun mandat de recherche soumis."
      />
    </div>
  );
}
