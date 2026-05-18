import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { LeadsTable } from "@/components/admin/LeadsTable";
import {
  WorkflowBadge,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";

export const dynamic = "force-dynamic";

type SearchParams = {
  type?: string;
  status?: string;
  q?: string;
  tab?: string;
};

type LeadRow = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  type: string | null;
  source: string | null;
  country: string | null;
  city: string | null;
  message: string | null;
  status: string | null;
  property_ref: string | null;
  workflow_status?: string | null;
  next_follow_up?: string | null;
  rgpd_consent_at?: string | null;
};

// Consentement RGPD (BUG 7). Source structurée = colonne
// rgpd_consent_at (après migration 20260518_rgpd_consent.sql). Tant
// qu'elle n'est pas migrée, on dérive de l'audit toujours présent
// dans `message` (« [RGPD] consentement accordé le <ISO> ») —
// résilient, aucun changement de requête à risque.
function rgpdConsentAt(l: {
  rgpd_consent_at?: string | null;
  message: string | null;
}): string | null {
  if (l.rgpd_consent_at) return l.rgpd_consent_at;
  const m = l.message?.match(
    /\[RGPD\]\s*consentement accordé le\s*(\S+)/i,
  );
  return m ? m[1] : null;
}

const TABS: { key: string; label: string }[] = [
  { key: "new", label: "Nouveau" },
  { key: "in_progress", label: "En cours" },
  { key: "on_hold", label: "En suspens" },
  { key: "validated", label: "Validé" },
  { key: "rejected", label: "Exclu" },
  { key: "completed", label: "Traités" },
  { key: "all", label: "Tous" },
];

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tab = sp.tab && TABS.some((t) => t.key === sp.tab) ? sp.tab : "all";
  const supabase = await createSupabaseServerClient();

  // Tentative avec les nouvelles colonnes (workflow_status, next_follow_up)
  let migrationApplied = true;
  let leads: LeadRow[] = [];

  const tryNew = await supabase
    .from("leads")
    .select(
      "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,status,property_ref,workflow_status,next_follow_up",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (tryNew.error) {
    // Migration pas encore appliquée → fallback sur les colonnes existantes
    migrationApplied = false;
    const fallback = await supabase
      .from("leads")
      .select(
        "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,status,property_ref",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    leads = (fallback.data ?? []) as LeadRow[];
  } else {
    leads = (tryNew.data ?? []) as LeadRow[];
  }

  // Compteurs par statut workflow (sans filtres q/type)
  const counts: Record<string, number> = { all: leads.length };
  for (const s of WORKFLOW_STATUSES) counts[s] = 0;
  for (const l of leads) {
    const ws = (l.workflow_status as WorkflowStatus | null) ?? "new";
    if (counts[ws] !== undefined) counts[ws]++;
  }

  // Filtrage par tab (workflow_status)
  let filtered = leads;
  if (migrationApplied && tab !== "all") {
    filtered = filtered.filter(
      (l) => (l.workflow_status ?? "new") === tab,
    );
  }

  // Filtre type
  if (sp.type) filtered = filtered.filter((l) => l.type === sp.type);
  // Filtre legacy status (compat)
  if (sp.status) filtered = filtered.filter((l) => l.status === sp.status);
  // Recherche libre
  if (sp.q) {
    const needle = sp.q.toLowerCase();
    filtered = filtered.filter((l) => {
      const hay = `${l.email} ${l.first_name ?? ""} ${l.last_name ?? ""} ${l.phone ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  // URL helper conservant les autres params
  const buildTabHref = (key: string) => {
    const params = new URLSearchParams();
    params.set("tab", key);
    if (sp.q) params.set("q", sp.q);
    if (sp.type) params.set("type", sp.type);
    return `/admin/leads?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
            Console MAPA
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            Leads
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {filtered.length} lead{filtered.length > 1 ? "s" : ""} affiché
            {filtered.length > 1 ? "s" : ""} · {leads.length} au total
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
              supabase/migrations/20260512_admin_workflow_leads.sql
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

      <LeadsTable leads={filtered as never} />

      {/* Vue compacte alternative : liste avec lien Voir */}
      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white">
        <header className="border-b border-[#3D4F63]/10 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
            Vue rapide ({filtered.length})
          </p>
        </header>
        <ul className="divide-y divide-[#3D4F63]/10">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-[#3D4F63]/60">
              Aucun lead pour cette sélection.
            </li>
          )}
          {filtered.slice(0, 50).map((l) => {
            const fullName = [l.first_name, l.last_name].filter(Boolean).join(" ");
            const ws = (l.workflow_status as WorkflowStatus | null) ?? "new";
            return (
              <li
                key={`quick-${l.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <WorkflowBadge status={ws} />
                  <div>
                    <p className="text-sm font-medium text-[#1A1F2A]">
                      {fullName || l.email}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#3D4F63]/60">
                      {l.email}
                      {l.phone && ` · ${l.phone}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {(() => {
                    const c = rgpdConsentAt(l);
                    return c ? (
                      <span
                        title={`Consentement RGPD obtenu le ${new Date(c).toLocaleString("fr-FR")}`}
                        className="rounded-full bg-emerald-600/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-700"
                      >
                        RGPD ✓{" "}
                        {new Date(c).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#3D4F63]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/50">
                        RGPD ✗
                      </span>
                    );
                  })()}
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    {new Date(l.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {l.next_follow_up && (
                    <span className="rounded-full bg-[#B8865A]/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#B8865A]">
                      Suivi : {l.next_follow_up}
                    </span>
                  )}
                  <Link
                    href={`/admin/leads/${l.id}`}
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
