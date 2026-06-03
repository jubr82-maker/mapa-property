import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import {
  WorkflowBadge,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";

export const dynamic = "force-dynamic";

type SearchParams = {
  tab?: string;
  q?: string;
  type?: string;
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
  transaction_type: string | null;
  budget_min: number | null;
  budget_max: number | null;
  zones: string[] | null;
  status: string | null;
  notes: string | null;
  workflow_status?: string | null;
  next_follow_up?: string | null;
};

const TABS: { key: string; label: string }[] = [
  { key: "new", label: "Nouveau" },
  { key: "in_progress", label: "En cours" },
  { key: "on_hold", label: "En suspens" },
  { key: "validated", label: "Validé" },
  { key: "rejected", label: "Exclu" },
  { key: "completed", label: "Traités" },
  { key: "all", label: "Tous" },
];

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

export default async function AdminMandatsRecherchePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tab = sp.tab && TABS.some((t) => t.key === sp.tab) ? sp.tab : "all";
  const supabase = await createSupabaseServerClient();

  // Tentative avec les nouvelles colonnes workflow
  let migrationApplied = true;
  let mandats: MandatRow[] = [];

  const tryNew = await supabase
    .from("mandats_recherche")
    .select(
      "id,created_at,client_name,client_email,client_phone,client_country,client_city,property_type,transaction_type,budget_min,budget_max,zones,status,notes,workflow_status,next_follow_up",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (tryNew.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("mandats_recherche")
      .select(
        "id,created_at,client_name,client_email,client_phone,client_country,client_city,property_type,transaction_type,budget_min,budget_max,zones,status,notes",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    mandats = (fallback.data ?? []) as MandatRow[];
  } else {
    mandats = (tryNew.data ?? []) as MandatRow[];
  }

  // Compteurs par statut workflow
  const counts: Record<string, number> = { all: mandats.length };
  for (const s of WORKFLOW_STATUSES) counts[s] = 0;
  for (const m of mandats) {
    const ws = (m.workflow_status as WorkflowStatus | null) ?? "new";
    if (counts[ws] !== undefined) counts[ws]++;
  }

  // Filtrage par tab
  let filtered = mandats;
  if (migrationApplied && tab !== "all") {
    filtered = filtered.filter((m) => (m.workflow_status ?? "new") === tab);
  }

  // Filtres additionnels
  if (sp.type) filtered = filtered.filter((m) => m.property_type === sp.type);
  if (sp.q) {
    const needle = sp.q.toLowerCase();
    filtered = filtered.filter((m) => {
      const hay = `${m.client_email ?? ""} ${m.client_name ?? ""} ${m.client_phone ?? ""} ${m.client_city ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  const buildTabHref = (key: string) => {
    const params = new URLSearchParams();
    params.set("tab", key);
    if (sp.q) params.set("q", sp.q);
    if (sp.type) params.set("type", sp.type);
    return `/admin/mandats-recherche?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            Console MAPA
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            Mandats de recherche
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {filtered.length} mandat{filtered.length > 1 ? "s" : ""} affiché
            {filtered.length > 1 ? "s" : ""} · {mandats.length} au total
          </p>
        </div>
      </header>

      {!migrationApplied && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-700">
            Migration en attente
          </p>
          <p className="mt-1">
            Les colonnes <code className="font-mono">workflow_status</code>,{" "}
            <code className="font-mono">admin_notes</code>,{" "}
            <code className="font-mono">next_follow_up</code> et{" "}
            <code className="font-mono">workflow_history</code> n&apos;existent
            pas encore. Applique{" "}
            <code className="font-mono">
              supabase/migrations/20260512_admin_workflow_mandats.sql
            </code>{" "}
            dans le SQL Editor Supabase pour activer les sous-onglets, le
            workflow 6 statuts et les notes admin. En attendant, vue
            &laquo;&nbsp;Tous&nbsp;&raquo; uniquement.
          </p>
        </div>
      )}

      {/* Sous-onglets workflow */}
      <nav className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = counts[t.key] ?? 0;
          const disabled = !migrationApplied && t.key !== "all";
          return (
            <Link
              key={t.key}
              href={disabled ? "#" : buildTabHref(t.key)}
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
            Liste ({filtered.length})
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
                      {[m.transaction_type, m.property_type]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                      {" · "}
                      {formatBudget(m.budget_min, m.budget_max)}
                      {" · "}
                      {formatZones(m.zones, m.client_city)}
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
                    href={`/admin/mandats-recherche/${m.id}`}
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
