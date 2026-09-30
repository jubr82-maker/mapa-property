import Link from "next/link";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";
import {
  WORKFLOW_STATUSES,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";
import { ExcelExportButton } from "@/components/admin/ExcelExportButton";
import { WaitlistTable } from "@/components/admin/WaitlistTable";

export const dynamic = "force-dynamic";

type SearchParams = { tab?: string; q?: string };

type WaitlistRow = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  message: string | null;
  source: string | null;
  status: string | null;
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

export default async function AdminWaitlistPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tab = sp.tab && TABS.some((t) => t.key === sp.tab) ? sp.tab : "all";
  await requireAdminPage();
  // Lecture leads via service_role : cf. app/admin/leads/page.tsx.
  const supabase = supabaseService();

  let migrationApplied = true;
  let rows: WaitlistRow[] = [];

  const tryNew = await supabase
    .from("leads")
    .select(
      "id,created_at,first_name,last_name,email,message,source,status,workflow_status,next_follow_up",
    )
    .eq("type", "waitlist")
    .order("created_at", { ascending: false })
    .limit(500);

  if (tryNew.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("leads")
      .select("id,created_at,first_name,last_name,email,message,source,status")
      .eq("type", "waitlist")
      .order("created_at", { ascending: false })
      .limit(500);
    rows = (fallback.data ?? []) as WaitlistRow[];
  } else {
    rows = (tryNew.data ?? []) as WaitlistRow[];
  }

  const counts: Record<string, number> = { all: rows.length };
  for (const s of WORKFLOW_STATUSES) counts[s] = 0;
  for (const r of rows) {
    const ws = (r.workflow_status as WorkflowStatus | null) ?? "new";
    if (counts[ws] !== undefined) counts[ws]++;
  }

  let filtered = rows;
  if (migrationApplied && tab !== "all") {
    filtered = filtered.filter((r) => (r.workflow_status ?? "new") === tab);
  }
  if (sp.q) {
    const needle = sp.q.toLowerCase();
    filtered = filtered.filter((r) => {
      const hay =
        `${r.email} ${r.first_name ?? ""} ${r.last_name ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }

  const buildTabHref = (key: string) => {
    const params = new URLSearchParams();
    params.set("tab", key);
    if (sp.q) params.set("q", sp.q);
    return `/admin/liste-attente?${params.toString()}`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            Console MAPA
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            Liste d&apos;attente
          </h1>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {filtered.length} inscription{filtered.length > 1 ? "s" : ""} ·{" "}
            {rows.length} au total
          </p>
        </div>
        <ExcelExportButton
          exportPath="/api/admin/exports/liste-attente"
          params={{ tab, q: sp.q }}
        />
      </header>

      {!migrationApplied && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-700">
            Migration en attente
          </p>
          <p className="mt-1">
            Colonnes <code className="font-mono">workflow_status</code> /{" "}
            <code className="font-mono">next_follow_up</code> absentes —
            tabs workflow désactivés en attendant l&apos;application de la
            migration 20260512.
          </p>
        </div>
      )}

      <nav className="flex flex-wrap items-center gap-2">
        {TABS.map((tt) => {
          const active = tab === tt.key;
          const count = counts[tt.key] ?? 0;
          const disabled = !migrationApplied && tt.key !== "all";
          return (
            <Link
              key={tt.key}
              href={disabled ? "#" : buildTabHref(tt.key)}
              aria-disabled={disabled}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition-colors ${
                active
                  ? "bg-[#3D4F63] text-[#F5EFE1]"
                  : disabled
                    ? "cursor-not-allowed border border-[#3D4F63]/10 text-[#3D4F63]/40"
                    : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
              }`}
            >
              <span>{tt.label}</span>
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
            Inscriptions ({filtered.length})
          </p>
        </header>
        <WaitlistTable items={filtered} />
      </section>
    </div>
  );
}
