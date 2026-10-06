import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE, formatDateOnly } from "@/lib/datetime";
import { REQUEST_STATUSES } from "@/lib/admin/offmarket";
import { AdminDateCell } from "@/components/admin/AdminDateCell";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";
import {
  WorkflowBadge,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";
import { ExcelExportButton } from "@/components/admin/ExcelExportButton";
import { AdminNotice } from "@/components/admin/AdminNotice";

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

const TABS: { key: string }[] = [
  { key: "new" },
  { key: "in_progress" },
  { key: "on_hold" },
  { key: "validated" },
  { key: "rejected" },
  { key: "completed" },
  { key: "all" },
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
  const tab = sp.tab && TABS.some((x) => x.key === sp.tab) ? sp.tab : "all";
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_offmarket" });
  const supabase = supabaseService();

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
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {t("list.eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {t("requests.title")}
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {t("requests.count", { count: filtered.length, total: list.length })}
          </p>
        </div>
        <ExcelExportButton
          exportPath="/api/admin/exports/offmarket-requests"
          params={{ tab, property: sp.property, q: sp.q }}
        />
      </header>

      {!migrationApplied && (
        <AdminNotice kind="workflow_list" />
      )}

      <nav className="flex flex-wrap items-center gap-2" data-admin-chips>
        {TABS.map((tb) => {
          const active = tab === tb.key;
          const count = counts[tb.key] ?? 0;
          const disabled = !migrationApplied && tb.key !== "all";
          return (
            <Link
              key={tb.key}
              href={disabled ? "#" : buildTabHref(tb.key)}
              aria-disabled={disabled}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                active
                  ? "bg-[#3D4F63] text-[#F5EFE1]"
                  : disabled
                    ? "cursor-not-allowed border border-[#3D4F63]/10 text-[#3D4F63]/40"
                    : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
              }`}
            >
              <span>{t(`requests.tab_${tb.key}`)}</span>
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
            {t("requests.listTitle", { count: filtered.length })}
          </p>
        </header>
        <ul className="divide-y divide-[#3D4F63]/10">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-[#3D4F63]/60">
              {list.length === 0 ? t("requests.empty") : t("requests.emptyFiltered")}
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
                      {fullName || r.email || t("requests.anonymous")}
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
                    <AdminDateCell createdAt={r.created_at} />
                  </span>
                  {r.status && (
                    <span className="rounded-full bg-[#3D4F63]/10 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]">
                      {(REQUEST_STATUSES as readonly string[]).includes(r.status)
                        ? t(`requestStatus.${r.status}`)
                        : t("requestStatus.unknown")}
                    </span>
                  )}
                  {r.next_follow_up && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${
                        followUpPast
                          ? "bg-red-100 text-red-700 ring-1 ring-inset ring-red-300"
                          : "bg-[#e0af6e]/15 text-[#e0af6e]"
                      }`}
                    >
                      {t("requests.followUp", { date: formatDateOnly(r.next_follow_up) })}
                    </span>
                  )}
                  <Link
                    href={`/admin/offmarket/requests/${r.id}`}
                    className="rounded-full border border-[#3D4F63]/20 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
                  >
                    {t("requests.view")}
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
