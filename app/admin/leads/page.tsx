import Link from "next/link";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { LeadsTable } from "@/components/admin/LeadsTable";
import { AdminDateCell } from "@/components/admin/AdminDateCell";
import { DateSortToggle, parseDateSort } from "@/components/admin/DateSortToggle";
import { getAdminDateTimeT } from "@/lib/admin/datetime-labels";
import { getTranslations } from "next-intl/server";
import {
  ADMIN_LOCALE,
  formatDateOnly,
  formatDateTime,
  formatDateTimeShort,
  lastModifiedAt,
} from "@/lib/datetime";
import { ExcelExportButton } from "@/components/admin/ExcelExportButton";
import {
  WorkflowBadge,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";
import { AdminNotice } from "@/components/admin/AdminNotice";

export const dynamic = "force-dynamic";

type SearchParams = {
  type?: string;
  status?: string;
  q?: string;
  tab?: string;
  sort?: string;
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
  /** Sujet pre-cadre du formulaire /contact (peut etre vide). */
  subject?: string | null;
  workflow_history?: unknown;
};

// Consentement RGPD. Source structuree : colonne rgpd_consent_at. A
// defaut, on derive de l'audit toujours present dans `message`
// (« [RGPD] consentement accordé le <ISO> »), sans changer la requete.
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

// Onglets de suivi ; libelles : cles "tab_*" du namespace "admin_workflow".
const TABS: { key: string }[] = [
  { key: "new" },
  { key: "in_progress" },
  { key: "on_hold" },
  { key: "validated" },
  { key: "rejected" },
  { key: "completed" },
  { key: "all" },
];

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tab = sp.tab && TABS.some((t) => t.key === sp.tab) ? sp.tab : "all";
  const sort = parseDateSort(sp.sort);
  const tDate = await getAdminDateTimeT();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_leads" });
  const tw = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_workflow" });
  await requireAdminPage();
  // Lecture leads via service_role : table sans policy SELECT confirmée
  // pour le role authenticated (leads est en ecriture seule par conception).
  const supabase = supabaseService();

  // Tentative avec les nouvelles colonnes (workflow_status, next_follow_up)
  let migrationApplied = true;
  let leads: LeadRow[] = [];

  // Tentative avec subject ; repli en cascade vers les colonnes de suivi
  // puis vers les colonnes d'origine si certaines colonnes manquent.
  const tryC3 = await supabase
    .from("leads")
    .select(
      "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,status,property_ref,workflow_status,next_follow_up,subject,workflow_history",
    )
    .order("created_at", { ascending: sort === "asc" })
    .limit(500);

  if (!tryC3.error) {
    leads = (tryC3.data ?? []) as LeadRow[];
  } else {
    const tryNew = await supabase
      .from("leads")
      .select(
        "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,status,property_ref,workflow_status,next_follow_up,workflow_history",
      )
      .order("created_at", { ascending: sort === "asc" })
      .limit(500);

    if (tryNew.error) {
      // Colonnes de suivi absentes : repli sur les colonnes existantes
      migrationApplied = false;
      const fallback = await supabase
        .from("leads")
        .select(
          "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,status,property_ref",
        )
        .order("created_at", { ascending: sort === "asc" })
        .limit(500);
      leads = (fallback.data ?? []) as LeadRow[];
    } else {
      leads = (tryNew.data ?? []) as LeadRow[];
    }
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
    params.set("sort", sort);
    return `/admin/leads?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {tw("console_eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {t("title")}
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {t("count", { shown: filtered.length, total: leads.length })}
          </p>
        </div>
        <ExcelExportButton
          exportPath="/api/admin/exports/leads"
          params={{ tab, type: sp.type, status: sp.status, q: sp.q }}
        />
      </header>

      {!migrationApplied && (
        <AdminNotice kind="workflow_list" />
      )}

      {/* Sous-onglets workflow : ligne defilante sur telephone (dans la
          ligne seulement, jamais la page). */}
      <nav className="-mx-4 flex flex-nowrap items-center gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0">
        {TABS.map((t) => {
          const active = tab === t.key;
          const count = counts[t.key] ?? 0;
          const disabled = !migrationApplied && t.key !== "all";
          return (
            <Link
              key={t.key}
              href={disabled ? "#" : buildTabHref(t.key)}
              aria-disabled={disabled}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                active
                  ? "bg-[#3D4F63] text-[#F5EFE1]"
                  : disabled
                    ? "cursor-not-allowed border border-[#3D4F63]/10 text-[#3D4F63]/40"
                    : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
              }`}
            >
              <span>{tw(`tab_${t.key}`)}</span>
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

      {/* Date et heure formatees cote serveur (fuseau Europe/Luxembourg,
          libelles next-intl) puis transmises au tableau client. */}
      <LeadsTable
        sortControl={
          <DateSortToggle
            basePath="/admin/leads"
            sort={sort}
            params={{ tab: sp.tab, q: sp.q, type: sp.type }}
          />
        }
        leads={
          filtered.map((l) => {
            const updated = lastModifiedAt(l);
            return {
              ...l,
              created_label: formatDateTimeShort(l.created_at),
              updated_label:
                updated && updated !== l.created_at
                  ? tDate("updated", { date: formatDateTimeShort(updated) })
                  : null,
            };
          }) as never
        }
        createdColumnLabel={tDate("created_col")}
      />

      {/* Vue compacte alternative : liste avec lien Voir (ordinateur ; sur
          telephone, les cartes de LeadsTable la remplacent). */}
      <section className="hidden rounded-2xl border border-[#3D4F63]/15 bg-white md:block">
        <header className="border-b border-[#3D4F63]/10 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
            {t("quick_view", { count: filtered.length })}
          </p>
        </header>
        <ul className="divide-y divide-[#3D4F63]/10">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-[#3D4F63]/60">
              {t("empty_selection")}
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
                        title={t("rgpd_consent_title", { date: formatDateTime(c) })}
                        className="rounded-full bg-emerald-600/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-emerald-700"
                      >
                        {t("rgpd_yes", { date: formatDateTimeShort(c) })}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#3D4F63]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/50">
                        {t("rgpd_no")}
                      </span>
                    );
                  })()}
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    <AdminDateCell createdAt={l.created_at} updatedAt={lastModifiedAt(l)} />
                  </span>
                  {l.next_follow_up && (
                    <span className="rounded-full bg-[#e0af6e]/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#e0af6e]">
                      {tw("followup_badge", { date: formatDateOnly(l.next_follow_up) })}
                    </span>
                  )}
                  <Link
                    href={`/admin/leads/${l.id}`}
                    className="rounded-full border border-[#3D4F63]/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
                  >
                    {tw("view")}
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
