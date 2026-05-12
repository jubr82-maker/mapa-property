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
  property?: string;
};

type RequestRow = {
  id: string;
  created_at: string;
  property_id: string;
  prenom: string | null;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  pays_recherche: string | null;
  ville_quartier: string | null;
  budget_max_eur: number | null;
  surface_souhaitee_m2: number | null;
  status: string | null; // métier off-market (legacy)
  notes_admin: string | null;
  workflow_status?: string | null;
  next_follow_up?: string | null;
  properties_offmarket?: {
    id: string;
    reference: string;
    title: string | null;
    city_label: string | null;
    city_anonymized: string | null;
  } | null;
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

export default async function AdminOffmarketRequestsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tab = sp.tab && TABS.some((t) => t.key === sp.tab) ? sp.tab : "all";
  const supabase = await createSupabaseServerClient();

  let migrationApplied = true;
  let list: RequestRow[] = [];

  const FULL_SELECT =
    "id,created_at,property_id,prenom,nom,email,telephone,pays_recherche,ville_quartier,budget_max_eur,surface_souhaitee_m2,status,notes_admin,workflow_status,next_follow_up,properties_offmarket!inner(id,reference,title,city_label,city_anonymized)";
  const FALLBACK_SELECT =
    "id,created_at,property_id,prenom,nom,email,telephone,pays_recherche,ville_quartier,budget_max_eur,surface_souhaitee_m2,status,notes_admin,properties_offmarket!inner(id,reference,title,city_label,city_anonymized)";

  const tryNew = await supabase
    .from("offmarket_requests")
    .select(FULL_SELECT)
    .order("created_at", { ascending: false })
    .limit(500);

  if (tryNew.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("offmarket_requests")
      .select(FALLBACK_SELECT)
      .order("created_at", { ascending: false })
      .limit(500);
    list = (fallback.data ?? []) as unknown as RequestRow[];
  } else {
    list = (tryNew.data ?? []) as unknown as RequestRow[];
  }

  // Compteurs
  const counts: Record<string, number> = { all: list.length };
  for (const s of WORKFLOW_STATUSES) counts[s] = 0;
  for (const r of list) {
    const ws = (r.workflow_status as WorkflowStatus | null) ?? "new";
    if (counts[ws] !== undefined) counts[ws]++;
  }

  let filtered = list;
  if (migrationApplied && tab !== "all") {
    filtered = filtered.filter((r) => (r.workflow_status ?? "new") === tab);
  }
  if (sp.property) {
    filtered = filtered.filter((r) => r.property_id === sp.property);
  }
  if (sp.q) {
    const needle = sp.q.toLowerCase();
    filtered = filtered.filter((r) => {
      const hay = `${r.email ?? ""} ${r.prenom ?? ""} ${r.nom ?? ""} ${r.telephone ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  const buildTabHref = (key: string) => {
    const params = new URLSearchParams();
    params.set("tab", key);
    if (sp.q) params.set("q", sp.q);
    if (sp.property) params.set("property", sp.property);
    return `/admin/offmarket/requests?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
            Off-Market
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            Demandes d&apos;accès
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {filtered.length} demande{filtered.length > 1 ? "s" : ""} affichée
            {filtered.length > 1 ? "s" : ""} · {list.length} au total
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
              supabase/migrations/20260512_admin_workflow_offmarket.sql
            </code>{" "}
            dans le SQL Editor Supabase pour activer le workflow générique 6
            statuts (en complément du statut métier <code>status</code>
            existant). En attendant, vue &laquo;&nbsp;Tous&nbsp;&raquo;
            uniquement.
          </p>
        </div>
      )}

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
                    : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
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
              Aucune demande pour cette sélection.
            </li>
          )}
          {filtered.slice(0, 100).map((r) => {
            const fullName = [r.prenom, r.nom].filter(Boolean).join(" ");
            const ws = (r.workflow_status as WorkflowStatus | null) ?? "new";
            const followUpPast = isPast(r.next_follow_up);
            const property = r.properties_offmarket;
            return (
              <li
                key={`req-${r.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <WorkflowBadge status={ws} />
                  <div>
                    <p className="text-sm font-medium text-[#1A1F2A]">
                      {fullName || r.email || "—"}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#3D4F63]/60">
                      {r.email}
                      {property && ` · ${property.reference}`}
                      {property?.title && ` · ${property.title}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    {new Date(r.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {r.status && (
                    <span className="rounded-full bg-[#3D4F63]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]">
                      {r.status}
                    </span>
                  )}
                  {r.next_follow_up && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${
                        followUpPast
                          ? "bg-red-100 text-red-700 ring-1 ring-inset ring-red-300"
                          : "bg-[#B8865A]/15 text-[#B8865A]"
                      }`}
                    >
                      Suivi : {r.next_follow_up}
                    </span>
                  )}
                  <Link
                    href={`/admin/offmarket/requests/${r.id}`}
                    className="rounded-full border border-[#3D4F63]/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#B8865A] hover:text-[#B8865A]"
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
