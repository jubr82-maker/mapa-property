import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SimpleTable } from "@/components/admin/SimpleTable";

export const dynamic = "force-dynamic";

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)} €`;
  if (min != null) return `≥ ${fmt(min)} €`;
  if (max != null) return `≤ ${fmt(max)} €`;
  return "—";
}

function formatZones(zones: string[] | null, city: string | null): string {
  if (Array.isArray(zones) && zones.length > 0) return zones.join(", ");
  if (city) return city;
  return "—";
}

export default async function AdminMandatsRecherchePage() {
  const supabase = await createSupabaseServerClient();
  const { data: mandats } = await supabase
    .from("mandats_recherche")
    .select(
      "id,created_at,client_name,client_email,client_phone,client_country,client_city,property_type,transaction_type,budget_min,budget_max,zones,status,notes",
    )
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    created_at: string;
    client_name: string | null;
    client_email: string | null;
    client_phone: string | null;
    client_country: string | null;
    client_city: string | null;
    property_type: string | null;
    transaction_type: string | null;
    budget_min: number | null;
    budget_max: number | null;
    zones: string[] | null;
    status: string | null;
    notes: string | null;
  };

  const rows = ((mandats ?? []) as Row[]).map((m) => ({
    id: m.id,
    cells: [
      new Date(m.created_at).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      m.client_name?.trim() || "—",
      m.client_email ?? "—",
      m.client_phone ?? "—",
      [m.transaction_type, m.property_type].filter(Boolean).join(" · ") || "—",
      formatBudget(m.budget_min, m.budget_max),
      formatZones(m.zones, m.client_city),
      m.status ?? "draft",
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
        headers={[
          "Date",
          "Client",
          "Email",
          "Téléphone",
          "Type",
          "Budget",
          "Zones",
          "Statut",
        ]}
        rows={rows}
        emptyText="Aucun mandat de recherche soumis."
      />
    </div>
  );
}
