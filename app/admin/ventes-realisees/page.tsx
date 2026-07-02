// Page admin — ventes realisees MAPA Property (Sprint 1/3 : gestion complete).
// Source : table public.mapa_historical_sales (RLS strict : auth.email dans
// (admin@mapagroup.org, j.brebion@mapagroup.org)).
//
//   - Vue LISTE (plate) : filtres commune + agent + annee, actions par ligne
//     (editer, supprimer, case "comparable").
//   - Vue PAR LOCALITE : ventes regroupees par commune (count + biens + €/m²).
//   - Ajout via SaleForm (POST).
//
// use_as_comparable (migration 20260701c) : lu en best-effort — si la colonne
// n'est pas encore appliquee en base, on degrade (defaut true) sans casser la
// page (convention projet, cf. AGENTS.md).
//
// Reste (sprints suivants) : indexation prix + branchement moteur EVS.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SaleForm } from "./SaleForm";
import { DeleteSaleButton } from "./DeleteSaleButton";
import { ComparableToggle } from "./ComparableToggle";

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
  use_as_comparable: boolean;
}

const SELECT_WITH_COMPARABLE =
  "id, property_type, surface_habitable, surface_terrain, chambres, classe_energie, annee_construction, etat, adresse, commune, prix_vente, date_acte, agent, notes, created_at, use_as_comparable";
const SELECT_LEGACY =
  "id, property_type, surface_habitable, surface_terrain, chambres, classe_energie, annee_construction, etat, adresse, commune, prix_vente, date_acte, agent, notes, created_at";

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

function pricePerSqm(r: SaleRow): number | null {
  return r.surface_habitable ? Math.round(r.prix_vente / r.surface_habitable) : null;
}

function yearOf(iso: string): string {
  return iso.slice(0, 4);
}

type SearchParams = { commune?: string; agent?: string; year?: string; vue?: string };

export default async function AdminVentesRealiseesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login?from=/admin/ventes-realisees");

  const params = await searchParams;
  const communeFilter = params.commune?.trim() || undefined;
  const agentFilter = params.agent?.trim() || undefined;
  const yearFilter = params.year?.trim() || undefined;
  const vue = params.vue === "commune" ? "commune" : "liste";

  // Filtre commune + agent en SQL (le filtre annee est applique en JS pour
  // pouvoir alimenter le menu deroulant des annees disponibles).
  function buildQuery(select: string) {
    let q = supabase
      .from("mapa_historical_sales")
      .select(select)
      .order("date_acte", { ascending: false })
      .limit(500);
    if (communeFilter) q = q.ilike("commune", `%${communeFilter}%`);
    if (agentFilter) q = q.eq("agent", agentFilter);
    return q;
  }

  // Best-effort : tente avec use_as_comparable, fallback si colonne absente.
  let comparableColumnMissing = false;
  let res = await buildQuery(SELECT_WITH_COMPARABLE);
  if (res.error) {
    comparableColumnMissing = true;
    res = await buildQuery(SELECT_LEGACY);
  }
  const error = res.error;
  const allRows: SaleRow[] = ((res.data as unknown as SaleRow[] | null) ?? []).map((r) => ({
    ...r,
    use_as_comparable: comparableColumnMissing ? true : (r.use_as_comparable ?? true),
  }));

  const availableYears = Array.from(new Set(allRows.map((r) => yearOf(r.date_acte))))
    .sort()
    .reverse();

  const rows = yearFilter ? allRows.filter((r) => yearOf(r.date_acte) === yearFilter) : allRows;

  const totalCount = rows.length;
  const totalVolume = rows.reduce((sum, r) => sum + Number(r.prix_vente || 0), 0);

  // href helper : preserve les filtres, change la vue.
  const qs = (over: Partial<SearchParams>) => {
    const p = new URLSearchParams();
    const merged = { commune: communeFilter, agent: agentFilter, year: yearFilter, vue, ...over };
    if (merged.commune) p.set("commune", merged.commune);
    if (merged.agent) p.set("agent", merged.agent);
    if (merged.year) p.set("year", merged.year);
    if (merged.vue && merged.vue !== "liste") p.set("vue", merged.vue);
    const str = p.toString();
    return str ? `/admin/ventes-realisees?${str}` : "/admin/ventes-realisees";
  };

  // Groupement par commune (vue localite).
  const byCommune = new Map<string, SaleRow[]>();
  for (const r of rows) {
    const arr = byCommune.get(r.commune) ?? [];
    arr.push(r);
    byCommune.set(r.commune, arr);
  }
  const communeGroups = Array.from(byCommune.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.05em]">
          Ventes réalisées MAPA Property
        </h1>
        <p className="mt-2 text-sm text-[#3D4F63]/80">
          Historique interne des actes notariés. Données strictement
          confidentielles (RLS : admin uniquement). Sert d&apos;assise à la
          méthode <em>Comparaison Directe</em> du moteur EVS (branchement à venir).
        </p>
      </header>

      {comparableColumnMissing && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-700">
            Migration en attente
          </p>
          <p className="mt-1">
            Colonne <code className="font-mono">use_as_comparable</code> absente —
            appliquer <code className="font-mono">supabase/migrations/20260701c_add_use_as_comparable.sql</code>{" "}
            dans Supabase Studio. En attendant, toutes les ventes sont considérées comme comparables.
          </p>
        </div>
      )}

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
          <p className="mt-1 font-display text-3xl font-bold">{fmtEur(totalVolume)}</p>
        </div>
        <form
          method="get"
          className="space-y-2 rounded-lg border border-[#3D4F63]/20 bg-white p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            Filtrer
          </p>
          {vue !== "liste" && <input type="hidden" name="vue" value={vue} />}
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
          <select
            name="year"
            defaultValue={yearFilter ?? ""}
            className="w-full rounded border border-[#3D4F63]/30 px-3 py-1.5 text-sm"
          >
            <option value="">Toutes les années</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
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
          Tous les champs marqués * sont obligatoires. Précisez le bien et les
          conditions exactes de la transaction.
        </p>
        <SaleForm />
      </section>

      {/* Onglets de vue */}
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Link
            href={qs({ vue: "liste" })}
            className={`rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] ${
              vue === "liste" ? "bg-[#3D4F63] text-white" : "border border-[#3D4F63]/20 text-[#3D4F63]"
            }`}
          >
            Liste ({totalCount})
          </Link>
          <Link
            href={qs({ vue: "commune" })}
            className={`rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] ${
              vue === "commune" ? "bg-[#3D4F63] text-white" : "border border-[#3D4F63]/20 text-[#3D4F63]"
            }`}
          >
            Par localité ({communeGroups.length})
          </Link>
        </div>

        {error && (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            Erreur lecture Supabase : {error.message}
          </p>
        )}
        {!error && rows.length === 0 && (
          <p className="rounded border border-[#3D4F63]/20 bg-white p-6 text-sm text-[#3D4F63]/70">
            Aucune vente enregistrée pour ces filtres.
          </p>
        )}

        {/* Vue LISTE */}
        {!error && rows.length > 0 && vue === "liste" && (
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
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">Comparable</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3D4F63]/10">
                {rows.map((r) => {
                  const ppsqm = pricePerSqm(r);
                  return (
                    <tr key={r.id} className="hover:bg-[#F5EFE1]/40">
                      <td className="px-3 py-2 font-mono text-xs">{fmtDate(r.date_acte)}</td>
                      <td className="px-3 py-2 font-medium">{r.commune}</td>
                      <td className="px-3 py-2 text-xs text-[#3D4F63]/80">{r.adresse}</td>
                      <td className="px-3 py-2 text-xs">{r.property_type}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{r.surface_habitable} m²</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{fmtEur(r.prix_vente)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[#9E7B2A]">
                        {ppsqm ? `${ppsqm} €` : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs capitalize">{r.agent}</td>
                      <td className="px-3 py-2">
                        <ComparableToggle id={r.id} initial={r.use_as_comparable} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/ventes-realisees/${r.id}/edit`}
                            className="rounded border border-[#3D4F63]/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63] hover:bg-[#3D4F63]/5"
                          >
                            Éditer
                          </Link>
                          <DeleteSaleButton id={r.id} label={`${r.commune} — ${r.adresse}`} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Vue PAR LOCALITE */}
        {!error && rows.length > 0 && vue === "commune" && (
          <div className="space-y-6">
            {communeGroups.map(([commune, list]) => {
              const vol = list.reduce((s, r) => s + Number(r.prix_vente || 0), 0);
              return (
                <div key={commune} className="overflow-hidden rounded-lg border border-[#3D4F63]/20 bg-white">
                  <div className="flex items-baseline justify-between border-b border-[#3D4F63]/10 bg-[#3D4F63]/5 px-4 py-2">
                    <h3 className="font-display text-lg font-bold">{commune}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
                      {list.length} vente{list.length > 1 ? "s" : ""} · {fmtEur(vol)}
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-left">
                      <tr className="text-[#3D4F63]/60">
                        <th className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em]">Date</th>
                        <th className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em]">Type</th>
                        <th className="px-4 py-1.5 text-right font-mono text-[10px] uppercase tracking-[0.15em]">Surface</th>
                        <th className="px-4 py-1.5 text-right font-mono text-[10px] uppercase tracking-[0.15em]">Prix</th>
                        <th className="px-4 py-1.5 text-right font-mono text-[10px] uppercase tracking-[0.15em]">€/m²</th>
                        <th className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em]">Comparable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3D4F63]/10">
                      {list.map((r) => {
                        const ppsqm = pricePerSqm(r);
                        return (
                          <tr key={r.id} className={r.use_as_comparable ? "" : "opacity-50"}>
                            <td className="px-4 py-1.5 font-mono text-xs">{fmtDate(r.date_acte)}</td>
                            <td className="px-4 py-1.5 text-xs">{r.property_type}</td>
                            <td className="px-4 py-1.5 text-right font-mono text-xs">{r.surface_habitable} m²</td>
                            <td className="px-4 py-1.5 text-right font-mono font-bold">{fmtEur(r.prix_vente)}</td>
                            <td className="px-4 py-1.5 text-right font-mono text-xs text-[#9E7B2A]">
                              {ppsqm ? `${ppsqm} €` : "—"}
                            </td>
                            <td className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#3D4F63]/60">
                              {r.use_as_comparable ? "Oui" : "Non"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
