// Page admin : ventes realisees MAPA Property (gestion complete).
// Source : table public.mapa_historical_sales (RLS strict : auth.email dans
// (admin@mapagroup.org, j.brebion@mapagroup.org)).
//
//   - Vue LISTE (plate) : filtres commune + agent + annee, actions par ligne
//     (editer, supprimer, controle comparabilite 3 etats).
//   - Vue PAR LOCALITE : ventes regroupees par commune (count + biens + €/m²).
//   - Ajout via SaleForm (POST).
//
// Comparabilite (logique 2 etats lue par le moteur EVS) :
//   est_comparable = comparable_override IS NOT NULL ? comparable_override
//                                                     : (date_acte <= 12 mois)
//   La colonne comparable_override (migration 20260701d) est lue en
//   best-effort : si absente, on degrade (mode auto par defaut) + banniere.

import { AdminFilterPanel } from "@/components/admin/AdminFilterPanel";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { SaleForm } from "./SaleForm";
import { DeleteSaleButton } from "./DeleteSaleButton";
import { ComparableControl } from "./ComparableControl";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE, formatDateOnly } from "@/lib/datetime";

const KNOWN_TYPES = ["appartement", "maison", "penthouse", "duplex", "villa", "immeuble", "terrain"];
const KNOWN_AGENTS = ["julien", "frederic"];

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
  comparable_override: boolean | null;
}

const SELECT_WITH_OVERRIDE =
  "id, property_type, surface_habitable, surface_terrain, chambres, classe_energie, annee_construction, etat, adresse, commune, prix_vente, date_acte, agent, notes, created_at, comparable_override";
const SELECT_LEGACY =
  "id, property_type, surface_habitable, surface_terrain, chambres, classe_energie, annee_construction, etat, adresse, commune, prix_vente, date_acte, agent, notes, created_at";

function fmtEur(n: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
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
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_sales" });
  const typeLabel = (v: string) => (KNOWN_TYPES.includes(v) ? t(`propertyType.${v}`) : v);
  const agentLabel = (v: string) => (KNOWN_AGENTS.includes(v) ? t(`agent.${v}`) : v);

  const params = await searchParams;
  const communeFilter = params.commune?.trim() || undefined;
  const agentFilter = params.agent?.trim() || undefined;
  const yearFilter = params.year?.trim() || undefined;
  const vue = params.vue === "commune" ? "commune" : "liste";

  // Fenetre auto 12 mois (meme regle que le moteur), calculee cote serveur.
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

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

  // Best-effort : tente avec comparable_override, fallback si colonne absente.
  let overrideColumnMissing = false;
  let res = await buildQuery(SELECT_WITH_OVERRIDE);
  if (res.error) {
    overrideColumnMissing = true;
    res = await buildQuery(SELECT_LEGACY);
  }
  const error = res.error;
  const allRows: SaleRow[] = ((res.data as unknown as SaleRow[] | null) ?? []).map((r) => ({
    ...r,
    comparable_override: overrideColumnMissing ? null : (r.comparable_override ?? null),
  }));

  const availableYears = Array.from(new Set(allRows.map((r) => yearOf(r.date_acte))))
    .sort()
    .reverse();

  const rows = yearFilter ? allRows.filter((r) => yearOf(r.date_acte) === yearFilter) : allRows;

  // Comparabilite effective (2 etats) + mode.
  const autoEffective = (r: SaleRow) => r.date_acte >= cutoffIso;
  const isEffective = (r: SaleRow) =>
    r.comparable_override === null ? autoEffective(r) : r.comparable_override;

  const totalCount = rows.length;
  const totalVolume = rows.reduce((sum, r) => sum + Number(r.prix_vente || 0), 0);

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
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-[#3D4F63]/80">
          {t("intro")}
        </p>
      </header>

      {overrideColumnMissing && (
        <AdminNotice kind="comparable" />
      )}

      {/* Totaux + filtres */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-[#3D4F63]/20 bg-white p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            {t("count")}
          </p>
          <p className="mt-1 font-display text-3xl font-bold">{totalCount}</p>
        </div>
        <div className="rounded-lg border border-[#3D4F63]/20 bg-white p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            {t("volume")}
          </p>
          <p className="mt-1 font-display text-3xl font-bold">{fmtEur(totalVolume)}</p>
        </div>
        <AdminFilterPanel active={[communeFilter, agentFilter, yearFilter].filter(Boolean).length}>
        <form
          method="get"
          className="space-y-2 rounded-lg border border-[#3D4F63]/20 bg-white p-5"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            {t("filters.title")}
          </p>
          {vue !== "liste" && <input type="hidden" name="vue" value={vue} />}
          <input
            type="text"
            name="commune"
            placeholder={t("filters.commune")}
            defaultValue={communeFilter ?? ""}
            className="w-full rounded border border-[#3D4F63]/30 px-3 py-1.5 text-sm"
          />
          <select
            name="agent"
            defaultValue={agentFilter ?? ""}
            className="w-full rounded border border-[#3D4F63]/30 px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allAgents")}</option>
            <option value="julien">{t("agent.julien")}</option>
            <option value="frederic">{t("agent.frederic")}</option>
          </select>
          <select
            name="year"
            defaultValue={yearFilter ?? ""}
            className="w-full rounded border border-[#3D4F63]/30 px-3 py-1.5 text-sm"
          >
            <option value="">{t("filters.allYears")}</option>
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
            {t("filters.apply")}
          </button>
        </form>
        </AdminFilterPanel>
      </section>

      {/* Formulaire ajout */}
      <section className="rounded-lg border border-[#3D4F63]/20 bg-white p-6">
        <h2 className="font-display text-xl font-bold uppercase tracking-[0.05em]">
          {t("add.title")}
        </h2>
        <p className="mt-1 text-xs text-[#3D4F63]/70">
          {t("add.intro")}
        </p>
        <SaleForm />
      </section>

      {/* Onglets de vue */}
      <section>
        <div className="mb-4 flex items-center gap-2" data-admin-chips>
          <Link
            href={qs({ vue: "liste" })}
            className={`rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] ${
              vue === "liste" ? "bg-[#3D4F63] text-white" : "border border-[#3D4F63]/20 text-[#3D4F63]"
            }`}
          >
            {t("tabs.list", { count: totalCount })}
          </Link>
          <Link
            href={qs({ vue: "commune" })}
            className={`rounded-full px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] ${
              vue === "commune" ? "bg-[#3D4F63] text-white" : "border border-[#3D4F63]/20 text-[#3D4F63]"
            }`}
          >
            {t("tabs.byCommune", { count: communeGroups.length })}
          </Link>
        </div>

        {error && (
          <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {t("loadError")}
          </p>
        )}
        {!error && rows.length === 0 && (
          <p className="rounded border border-[#3D4F63]/20 bg-white p-6 text-sm text-[#3D4F63]/70">
            {allRows.length === 0 && !communeFilter && !agentFilter ? t("empty") : t("emptyFiltered")}
          </p>
        )}

        {/* Vue LISTE */}
        {!error && rows.length > 0 && vue === "liste" && (
          <div className="overflow-x-auto rounded-lg border border-[#3D4F63]/20 bg-white">
            <table data-card-primary="2" data-card-keep="1,2,4,6,10" className="w-full text-sm">
              <thead className="bg-[#3D4F63]/5 text-left">
                <tr>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.date")}</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.commune")}</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.address")}</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.type")}</th>
                  <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.surface")}</th>
                  <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.price")}</th>
                  <th className="px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.pricePerM2")}</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.agent")}</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.comparable")}</th>
                  <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3D4F63]/10">
                {rows.map((r) => {
                  const ppsqm = pricePerSqm(r);
                  return (
                    <tr key={r.id} className="hover:bg-[#F5EFE1]/40">
                      <td className="px-3 py-2 font-mono text-xs">{formatDateOnly(r.date_acte)}</td>
                      <td className="px-3 py-2 font-medium">{r.commune}</td>
                      <td className="px-3 py-2 text-xs text-[#3D4F63]/80">{r.adresse}</td>
                      <td className="px-3 py-2 text-xs">{typeLabel(r.property_type)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">{r.surface_habitable} m²</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{fmtEur(r.prix_vente)}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs text-[#9E7B2A]">
                        {ppsqm ? `${ppsqm} €` : ""}
                      </td>
                      <td className="px-3 py-2 text-xs">{agentLabel(r.agent)}</td>
                      <td className="px-3 py-2">
                        {overrideColumnMissing ? (
                          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#3D4F63]/50">
                            {isEffective(r) ? `● ${t("comparable.counts")}` : `○ ${t("comparable.ignored")}`}
                            {` (${t("comparable.mode_auto")})`}
                          </span>
                        ) : (
                          <ComparableControl
                            id={r.id}
                            override={r.comparable_override}
                            autoEffective={autoEffective(r)}
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/admin/ventes-realisees/${r.id}/edit`}
                            className="rounded border border-[#3D4F63]/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63] hover:bg-[#3D4F63]/5"
                          >
                            {t("edit")}
                          </Link>
                          <DeleteSaleButton id={r.id} label={`${r.commune} · ${r.adresse}`} />
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
              const nbComparable = list.filter(isEffective).length;
              return (
                <div key={commune} className="overflow-hidden rounded-lg border border-[#3D4F63]/20 bg-white">
                  <div className="flex items-baseline justify-between border-b border-[#3D4F63]/10 bg-[#3D4F63]/5 px-4 py-2">
                    <h3 className="font-display text-lg font-bold">{commune}</h3>
                    <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
                      {t("group.summary", { count: list.length, comparable: nbComparable, volume: fmtEur(vol) })}
                    </p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="text-left">
                      <tr className="text-[#3D4F63]/60">
                        <th className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.date")}</th>
                        <th className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.type")}</th>
                        <th className="px-4 py-1.5 text-right font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.surface")}</th>
                        <th className="px-4 py-1.5 text-right font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.price")}</th>
                        <th className="px-4 py-1.5 text-right font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.pricePerM2")}</th>
                        <th className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em]">{t("col.comparable")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#3D4F63]/10">
                      {list.map((r) => {
                        const ppsqm = pricePerSqm(r);
                        const eff = isEffective(r);
                        const mode = r.comparable_override === null ? t("comparable.mode_auto") : t("comparable.mode_forced");
                        return (
                          <tr key={r.id} className={eff ? "" : "opacity-50"}>
                            <td className="px-4 py-1.5 font-mono text-xs">{formatDateOnly(r.date_acte)}</td>
                            <td className="px-4 py-1.5 text-xs">{typeLabel(r.property_type)}</td>
                            <td className="px-4 py-1.5 text-right font-mono text-xs">{r.surface_habitable} m²</td>
                            <td className="px-4 py-1.5 text-right font-mono font-bold">{fmtEur(r.prix_vente)}</td>
                            <td className="px-4 py-1.5 text-right font-mono text-xs text-[#9E7B2A]">
                              {ppsqm ? `${ppsqm} €` : ""}
                            </td>
                            <td className="px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#3D4F63]/60">
                              {eff ? `● ${t("comparable.counts")}` : `○ ${t("comparable.ignored")}`} · {mode}
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
