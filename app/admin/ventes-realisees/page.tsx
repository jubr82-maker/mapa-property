// Page admin Sprint B2 squelette — liste des ventes realisees MAPA Property.
// Source : table public.mapa_historical_sales (RLS strict : auth.email
// dans (j.brebion@mapagroup.org, f.mannis@mapagroup.org)).
//
// Scope MVP squelette :
//   - Liste triee par date_acte DESC
//   - Total cumulé (count + volume €)
//   - Formulaire d'ajout (client component SaleForm)
//   - Filtres simples (commune + agent) — version basique GET param
//
// Hors scope MVP (sprint suivant) :
//   - Edition/suppression d'une vente
//   - Export CSV
//   - Activation methodSalesComparison engine.ts (necessite >= 3 comparables)

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SaleForm } from "./SaleForm";

interface SaleRow {
  id: string;
  property_type: string;
  surface_habitable: number;
  surface_terrain: number | null;
  chambres: number | null;
  classe_energie: string | null;
  annee_construction: number | null;
  etat: string | null;
  adresse: string;
  commune: string;
  prix_vente: number;
  date_acte: string;
  agent: string;
  notes: string | null;
  created_at: string;
}

function fmtEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminVentesRealiseesPage({
  searchParams,
}: {
  searchParams: Promise<{ commune?: string; agent?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?from=/admin/ventes-realisees");

  const params = await searchParams;
  const communeFilter = params.commune?.trim() || undefined;
  const agentFilter = params.agent?.trim() || undefined;

  let query = supabase
    .from("mapa_historical_sales")
    .select(
      "id, property_type, surface_habitable, surface_terrain, chambres, classe_energie, annee_construction, etat, adresse, commune, prix_vente, date_acte, agent, notes, created_at",
    )
    .order("date_acte", { ascending: false })
    .limit(500);

  if (communeFilter) query = query.ilike("commune", `%${communeFilter}%`);
  if (agentFilter) query = query.eq("agent", agentFilter);

  const { data: rowsRaw, error } = await query;
  const rows: SaleRow[] = (rowsRaw as SaleRow[] | null) ?? [];

  const totalCount = rows.length;
  const totalVolume = rows.reduce((sum, r) => sum + Number(r.prix_vente || 0), 0);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.05em]">
          Ventes réalisées MAPA Property
        </h1>
        <p className="mt-2 text-sm text-[#3D4F63]/80">
          Historique interne des actes notariés. Données strictement
          confidentielles (RLS : Julien & Frédéric uniquement). Sert d&apos;assise
          à la méthode <em>Comparaison Directe</em> du moteur EVS (≥ 3
          comparables par commune cible requis).
        </p>
      </header>

      {/* Totaux + filtres */}
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#3D4F63]/20 bg-white p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            Nombre de ventes
          </p>
          <p className="mt-1 font-display text-3xl font-bold">{totalCount}</p>
        </div>
        <div className="rounded-lg border border-[#3D4F63]/20 bg-white p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            Volume cumulé
          </p>
          <p className="mt-1 font-display text-3xl font-bold">
            {fmtEur(totalVolume)}
          </p>
        </div>
        <form
          method="get"
          className="rounded-lg border border-[#3D4F63]/20 bg-white p-5 space-y-2"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            Filtrer
          </p>
          <input
            type="text"
            name="commune"
            placeholder="Commune"
            defaultValue={communeFilter ?? ""}
            className="w-full rounded border border-[#3D4F63]/30 px-3 py-1.5 text-sm"
          />
          <select
            name="agent"
            defaultValue={agentFilter ?? ""}
            className="w-full rounded border border-[#3D4F63]/30 px-3 py-1.5 text-sm"
          >
            <option value="">Tous les agents</option>
            <option value="julien">Julien</option>
            <option value="frederic">Frédéric</option>
          </select>
          <button
            type="submit"
            className="w-full rounded bg-[#3D4F63] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white"
          >
            Appliquer
          </button>
        </form>
      </section>

      {/* Formulaire ajout */}
      <section className="rounded-lg border border-[#3D4F63]/20 bg-white p-6">
        <h2 className="font-display text-xl font-bold uppercase tracking-[0.05em]">
          Ajouter une vente
        </h2>
        <p className="mt-1 text-xs text-[#3D4F63]/70">
          Tous les champs marqués * sont obligatoires. Précisez le bien et
          les conditions exactes de la transaction.
        </p>
        <SaleForm />
      </section>

      {/* Liste */}
      <section>
        <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-[0.05em]">
          Historique ({totalCount})
        </h2>
        {error && (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Erreur lecture Supabase : {error.message}
          </p>
        )}
        {!error && rows.length === 0 && (
          <p className="rounded border border-[#3D4F63]/20 bg-white p-6 text-sm text-[#3D4F63]/70">
            Aucune vente enregistrée pour ces filtres. Utilisez le formulaire
            ci-dessus pour saisir vos premières ventes — le moteur EVS V2
            activera la méthode <em>Comparaison Directe</em> dès qu&apos;une commune
            disposera d&apos;au moins 3 comparables récents (≤ 24 mois).
          </p>
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-[#3D4F63]/20 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[#3D4F63]/5 text-left">
                <tr>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">Date</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">Commune</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">Adresse</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">Type</th>
                  <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.15em]">Surface</th>
                  <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.15em]">Prix</th>
                  <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.15em]">€/m²</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3D4F63]/10">
                {rows.map((r) => {
                  const pricePerSqm = r.surface_habitable
                    ? Math.round(r.prix_vente / r.surface_habitable)
                    : null;
                  return (
                    <tr key={r.id} className="hover:bg-[#F5EFE1]/40">
                      <td className="px-3 py-2 font-mono text-xs">{fmtDate(r.date_acte)}</td>
                      <td className="px-3 py-2 font-medium">{r.commune}</td>
                      <td className="px-3 py-2 text-xs text-[#3D4F63]/80">{r.adresse}</td>
                      <td className="px-3 py-2 text-xs">{r.property_type}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{r.surface_habitable} m²</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{fmtEur(r.prix_vente)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[#9E7B2A]">
                        {pricePerSqm ? `${pricePerSqm} €` : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs capitalize">{r.agent}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
