import Link from "next/link";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";
import {
  WorkflowBadge,
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminDateCell } from "@/components/admin/AdminDateCell";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE, formatDateOnly } from "@/lib/datetime";

export const dynamic = "force-dynamic";

type SearchParams = {
  tab?: string;
  q?: string;
  role?: string;
};

type ArcovaRow = {
  id: string;
  created_at: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  role: string | null;
  message: string | null;
  status: string | null;
  notes: string | null;
  workflow_status?: string | null;
  next_follow_up?: string | null;
};

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

export default async function AdminArcovaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tab = sp.tab && TABS.some((t) => t.key === sp.tab) ? sp.tab : "all";
  await requireAdminPage();
  const supabase = supabaseService();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_arcova" });
  const tw = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_workflow" });

  let migrationApplied = true;
  let items: ArcovaRow[] = [];

  const tryNew = await supabase
    .from("arcova_waitlist")
    .select(
      "id,email,first_name,last_name,phone,company,role,message,status,created_at,notes,workflow_status,next_follow_up",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (tryNew.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("arcova_waitlist")
      .select(
        "id,email,first_name,last_name,phone,company,role,message,status,created_at,notes",
      )
      .order("created_at", { ascending: false })
      .limit(500);
    items = (fallback.data ?? []) as ArcovaRow[];
  } else {
    items = (tryNew.data ?? []) as ArcovaRow[];
  }

  // Compteurs
  const counts: Record<string, number> = { all: items.length };
  for (const s of WORKFLOW_STATUSES) counts[s] = 0;
  for (const it of items) {
    const ws = (it.workflow_status as WorkflowStatus | null) ?? "new";
    if (counts[ws] !== undefined) counts[ws]++;
  }

  let filtered = items;
  if (migrationApplied && tab !== "all") {
    filtered = filtered.filter((i) => (i.workflow_status ?? "new") === tab);
  }
  if (sp.role) {
    const needle = sp.role.toLowerCase();
    filtered = filtered.filter((i) =>
      (i.role ?? "").toLowerCase().includes(needle),
    );
  }
  if (sp.q) {
    const needle = sp.q.toLowerCase();
    filtered = filtered.filter((i) => {
      const hay = `${i.email} ${i.first_name ?? ""} ${i.last_name ?? ""} ${i.company ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  const buildTabHref = (key: string) => {
    const params = new URLSearchParams();
    params.set("tab", key);
    if (sp.q) params.set("q", sp.q);
    if (sp.role) params.set("role", sp.role);
    return `/admin/arcova?${params.toString()}`;
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
            {t("count", { shown: filtered.length, total: items.length })}
          </p>
        </div>
      </header>

      {!migrationApplied && (
        <AdminNotice kind="workflow_list" />
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

      <section className="rounded-2xl border border-[#3D4F63]/15 bg-white">
        <header className="border-b border-[#3D4F63]/10 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
            {t("list_title", { count: filtered.length })}
          </p>
        </header>
        <ul className="divide-y divide-[#3D4F63]/10">
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-[#3D4F63]/60">
              {t("empty_selection")}
            </li>
          )}
          {filtered.slice(0, 100).map((i) => {
            const fullName = [i.first_name, i.last_name]
              .filter(Boolean)
              .join(" ");
            const ws = (i.workflow_status as WorkflowStatus | null) ?? "new";
            const followUpPast = isPast(i.next_follow_up);
            return (
              <li
                key={`arcova-${i.id}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <WorkflowBadge status={ws} />
                  <div>
                    <p className="text-sm font-medium text-[#1A1F2A]">
                      {fullName || i.email}
                    </p>
                    <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#3D4F63]/60">
                      {i.email}
                      {i.company && ` · ${i.company}`}
                      {i.role && ` · ${i.role}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    <AdminDateCell createdAt={i.created_at} />
                  </span>
                  {i.next_follow_up && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${
                        followUpPast
                          ? "bg-red-100 text-red-700 ring-1 ring-inset ring-red-300"
                          : "bg-[#e0af6e]/15 text-[#e0af6e]"
                      }`}
                    >
                      {tw("followup_badge", { date: formatDateOnly(i.next_follow_up) })}
                    </span>
                  )}
                  <Link
                    href={`/admin/arcova/${i.id}`}
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
