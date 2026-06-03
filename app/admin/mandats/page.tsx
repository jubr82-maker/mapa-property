import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import {
  WorkflowBadge,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";

export const dynamic = "force-dynamic";

// Sprint MANDATS-A PARTIE 5 — page admin /admin/mandats avec 3 sections
// type_transaction (Vente / Recherche / Location) + onglets workflow
// existants conserves PAR SECTION. Tri date asc/desc.

type Section = "vente" | "recherche" | "location";
type SortDir = "asc" | "desc";

type SearchParams = {
  section?: string;
  tab?: string;
  q?: string;
  sort?: string;
};

type MandatRow = {
  id: string;
  created_at: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_country: string | null;
  client_city: string | null;
  property_type: string | null;
  type_transaction: string;
  type_mandat: string | null;
  bien_adresse: string | null;
  prix_mise_en_vente: number | null;
  budget_min: number | null;
  budget_max: number | null;
  zones: string[] | null;
  status: string | null;
  notes: string | null;
  workflow_status?: string | null;
  next_follow_up?: string | null;
};

const SECTIONS: { key: Section; label: string }[] = [
  { key: "vente", label: "Vente" },
  { key: "recherche", label: "Recherche" },
  { key: "location", label: "Location" },
];

const WORKFLOW_TABS: { key: string; label: string }[] = [
  { key: "new", label: "Nouveau" },
  { key: "in_progress", label: "En cours" },
  { key: "on_hold", label: "En suspens" },
  { key: "validated", label: "Validé" },
  { key: "rejected", label: "Exclu" },
  { key: "completed", label: "Traités" },
  { key: "all", label: "Tous" },
];

const TYPE_MANDAT_LABEL: Record<string, string> = {
  exclusif: "Exclusif",
  "semi-exclusif": "Semi-exclusif",
  simple: "Simple",
  autonome: "Autonome",
};

const STATUS_LABEL: Record<string, string> = {
  actif: "Actif",
  vendu: "Vendu",
  loue: "Loué",
  expire: "Expiré",
  resilie: "Résilié",
};

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  const fmt = (n: number) => `${(n / 1000).toFixed(0)}k`;
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)} €`;
  if (min != null) return `≥ ${fmt(min)} €`;
  if (max != null) return `≤ ${fmt(max)} €`;
  return "—";
}

function formatPrice(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-LU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatZonesOrCity(
  zones: string[] | null,
  city: string | null,
): string {
  if (Array.isArray(zones) && zones.length > 0) return zones.join(", ");
  if (city) return city;
  return "—";
}

function isPast(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.getTime() < today.getTime();
  } catch {
    return false;
  }
}

export default async function AdminMandatsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const section: Section =
    sp.section === "recherche" || sp.section === "location"
      ? sp.section
      : "vente";
  const workflowTab =
    sp.tab && WORKFLOW_TABS.some((t) => t.key === sp.tab) ? sp.tab : "all";
  const sortDir: SortDir = sp.sort === "asc" ? "asc" : "desc";

  const supabase = await createSupabaseServerClient();

  // 1 SELECT global (limit 500), filtrage section + workflow + q cote JS.
  // Pour 500 rows max en admin (table peu volumineuse) c'est plus simple
  // que 4 requetes (1 par section + counts).
  let migrationApplied = true;
  let mandats: MandatRow[] = [];

  const fullSelect =
    "id,created_at,client_name,client_email,client_phone,client_country,client_city," +
    "property_type,type_transaction,type_mandat,bien_adresse,prix_mise_en_vente," +
    "budget_min,budget_max,zones,status,notes,workflow_status,next_follow_up";

  const fallbackSelect =
    "id,created_at,client_name,client_email,client_phone,client_country,client_city," +
    "property_type,type_transaction,type_mandat,bien_adresse,prix_mise_en_vente," +
    "budget_min,budget_max,zones,status,notes";

  const tryNew = await supabase
    .from("mandats")
    .select(fullSelect)
    .order("created_at", { ascending: sortDir === "asc" })
    .limit(500);

  if (tryNew.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("mandats")
      .select(fallbackSelect)
      .order("created_at", { ascending: sortDir === "asc" })
      .limit(500);
    mandats = (fallback.data ?? []) as unknown as MandatRow[];
  } else {
    mandats = (tryNew.data ?? []) as unknown as MandatRow[];
  }

  // Compteurs par section (sans filtre workflow).
  const sectionCounts: Record<Section, number> = {
    vente: 0,
    recherche: 0,
    location: 0,
  };
  for (const m of mandats) {
    const tt = m.type_transaction as Section;
    if (tt in sectionCounts) sectionCounts[tt]++;
  }

  // Filtre par section active.
  const inSection = mandats.filter((m) => m.type_transaction === section);

  // Compteurs workflow DANS la section active.
  const workflowCounts: Record<string, number> = { all: inSection.length };
  for (const s of WORKFLOW_STATUSES) workflowCounts[s] = 0;
  for (const m of inSection) {
    const ws = (m.workflow_status as WorkflowStatus | null) ?? "new";
    if (workflowCounts[ws] !== undefined) workflowCounts[ws]++;
  }

  // Filtre workflow + recherche libre.
  let filtered = inSection;
  if (migrationApplied && workflowTab !== "all") {
    filtered = filtered.filter(
      (m) => (m.workflow_status ?? "new") === workflowTab,
    );
  }
  if (sp.q) {
    const needle = sp.q.toLowerCase();
    filtered = filtered.filter((m) => {
      const hay =
        `${m.client_email ?? ""} ${m.client_name ?? ""} ${m.client_phone ?? ""} ${m.client_city ?? ""} ${m.bien_adresse ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  // Helpers URL preservant les autres params.
  const buildHref = (overrides: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    params.set("section", overrides.section ?? section);
    params.set("tab", overrides.tab ?? workflowTab);
    if (overrides.sort ?? sortDir) {
      params.set("sort", overrides.sort ?? sortDir);
    }
    if (sp.q) params.set("q", sp.q);
    return `/admin/mandats?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            Console MAPA
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            Mandats
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {filtered.length} mandat{filtered.length > 1 ? "s" : ""} affiché
            {filtered.length > 1 ? "s" : ""} · {sectionCounts[section]} dans la
            section · {mandats.length} au total
          </p>
        </div>
        <Link
          href={buildHref({ sort: sortDir === "desc" ? "asc" : "desc" })}
          className="inline-flex items-center gap-2 rounded-full border border-[#3D4F63]/20 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
          aria-label={
            sortDir === "desc"
              ? "Trier du plus ancien au plus récent"
              : "Trier du plus récent au plus ancien"
          }
        >
          <span>Date</span>
          <span aria-hidden>{sortDir === "desc" ? "↓" : "↑"}</span>
        </Link>
      </header>

      {!migrationApplied && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-700">
            Données partielles
          </p>
          <p className="mt-1">
            Les colonnes workflow (statut, notes, follow-up) ne sont pas
            disponibles. Vérifie que la migration{" "}
            <code className="font-mono">
              20260512_admin_workflow_mandats.sql
            </code>{" "}
            est appliquée.
          </p>
        </div>
      )}

      {/* Onglets section type_transaction (Vente / Recherche / Location) */}
      <nav className="flex flex-wrap items-center gap-2 border-b border-[#3D4F63]/15 pb-3">
        {SECTIONS.map((s) => {
          const active = section === s.key;
          return (
            <Link
              key={s.key}
              href={buildHref({ section: s.key, tab: "all" })}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 font-mono text-[11px] uppercase tracking-[0.2em] transition-colors ${
                active
                  ? "bg-[#3D4F63] text-[#F5EFE1]"
                  : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
              }`}
            >
              <span>{s.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  active
                    ? "bg-[#F5EFE1]/20 text-[#F5EFE1]"
                    : "bg-[#3D4F63]/10 text-[#3D4F63]/70"
                }`}
              >
                {sectionCounts[s.key]}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Sous-onglets workflow (preserves de l'existant) */}
      <nav className="flex flex-wrap items-center gap-2">
        {WORKFLOW_TABS.map((t) => {
          const active = workflowTab === t.key;
          const count = workflowCounts[t.key] ?? 0;
          const disabled = !migrationApplied && t.key !== "all";
          return (
            <Link
              key={t.key}
              href={disabled ? "#" : buildHref({ tab: t.key })}
              aria-disabled={disabled}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                active
                  ? "bg-[#3D4F63] text-[#F5EFE1]"
                  : disabled
                    ? "cursor-not-allowed border border-[#3D4F63]/10 text-[#3D4F63]/40"
                    : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
              }`}
            >
              <span>{t.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${
                  active
                    ? "bg-[#F5EFE1]/20 text-[#F5EFE1]"
                    : "bg-[#3D4F63]/10 text-[#3D4F63]/70"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </nav>

      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white">
        <header className="border-b border-[#3D4F63]/10 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
            Liste — {SECTIONS.find((s) => s.key === section)?.label} (
            {filtered.length})
          </p>
        </header>
        <ul className="divide-y divide-[#3D4F63]/10">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-[#3D4F63]/60">
              Aucun mandat pour cette sélection.
            </li>
          )}
          {filtered.slice(0, 100).map((m) => {
            const ws = (m.workflow_status as WorkflowStatus | null) ?? "new";
            const followUpPast = isPast(m.next_follow_up);
            const localite =
              section === "recherche"
                ? formatZonesOrCity(m.zones, m.client_city)
                : (m.bien_adresse ?? m.client_city ?? "—");
            const prix =
              section === "recherche"
                ? formatBudget(m.budget_min, m.budget_max)
                : formatPrice(m.prix_mise_en_vente);
            const statusLabel = m.status ? (STATUS_LABEL[m.status] ?? m.status) : "—";
            return (
              <li
                key={`mandat-${m.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <WorkflowBadge status={ws} />
                  <div>
                    <p className="text-sm font-medium text-[#1A1F2A]">
                      {m.client_name?.trim() || m.client_email || "—"}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#3D4F63]/60">
                      {section === "vente" && m.type_mandat
                        ? `${TYPE_MANDAT_LABEL[m.type_mandat] ?? m.type_mandat} · `
                        : ""}
                      {localite}
                      {" · "}
                      {prix}
                      {" · "}
                      {statusLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    {new Date(m.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {m.next_follow_up && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${
                        followUpPast
                          ? "bg-red-100 text-red-700 ring-1 ring-inset ring-red-300"
                          : "bg-[#e0af6e]/15 text-[#e0af6e]"
                      }`}
                    >
                      Suivi : {m.next_follow_up}
                    </span>
                  )}
                  <Link
                    href={`/admin/mandats/${m.id}`}
                    className="rounded-full border border-[#3D4F63]/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
                  >
                    Voir
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
