import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { WorkflowSelect } from "@/components/admin/WorkflowSelect";
import { AdminNotes } from "@/components/admin/AdminNotes";
import {
  WorkflowBadge,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";
import {
  updateWorkflowStatus,
  addAdminNote,
  setNextFollowUp,
} from "@/app/admin/mandats/actions";

export const dynamic = "force-dynamic";

type HistoryEntry = {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
};

type MandatFull = {
  id: string;
  created_at: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_country: string | null;
  client_city: string | null;
  property_type: string | null;
  type_transaction: string;
  budget_min: number | null;
  budget_max: number | null;
  zones: string[] | null;
  status: string | null;
  notes: string | null;
  workflow_status?: string | null;
  admin_notes?: string | null;
  next_follow_up?: string | null;
  workflow_history?: HistoryEntry[] | null;
};

const FULL_SELECT =
  "id,created_at,client_name,client_email,client_phone,client_country,client_city,property_type,type_transaction,budget_min,budget_max,zones,status,notes,workflow_status,admin_notes,next_follow_up,workflow_history";

const FALLBACK_SELECT =
  "id,created_at,client_name,client_email,client_phone,client_country,client_city,property_type,type_transaction,budget_min,budget_max,zones,status,notes";

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatBudget(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) +
    " €";
  if (min != null && max != null) return `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `≥ ${fmt(min)}`;
  if (max != null) return `≤ ${fmt(max)}`;
  return "—";
}

export default async function AdminMandatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  let migrationApplied = true;
  let mandat: MandatFull | null = null;

  const tryFull = await supabase
    .from("mandats")
    .select(FULL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (tryFull.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("mandats")
      .select(FALLBACK_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (fallback.error || !fallback.data) notFound();
    mandat = fallback.data as MandatFull;
  } else {
    if (!tryFull.data) notFound();
    mandat = tryFull.data as MandatFull;
  }

  const ws = (mandat.workflow_status as WorkflowStatus | null) ?? "new";
  const history: HistoryEntry[] = Array.isArray(mandat.workflow_history)
    ? mandat.workflow_history
    : [];

  const zones = Array.isArray(mandat.zones)
    ? mandat.zones.join(", ")
    : mandat.client_city ?? "—";

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/mandats"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70 hover:text-[#e0af6e]"
        >
          <ArrowLeft className="size-3" />
          Retour aux mandats
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            Mandat ·{" "}
            {[mandat.type_transaction, mandat.property_type]
              .filter(Boolean)
              .join(" · ") || "recherche"}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {mandat.client_name?.trim() || mandat.client_email || "—"}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            Créé le {formatDateTime(mandat.created_at)}
          </p>
        </div>
        <WorkflowBadge status={ws} size="md" />
      </header>

      {!migrationApplied && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-700">
            Migration en attente
          </p>
          <p className="mt-1">
            Les fonctionnalités workflow (statut, notes, follow-up) sont
            désactivées tant que{" "}
            <code className="font-mono">
              supabase/migrations/20260512_admin_workflow_mandats.sql
            </code>{" "}
            n&apos;est pas appliqué dans le SQL Editor Supabase.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              Contact client
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Email" value={mandat.client_email} />
              <Field label="Téléphone" value={mandat.client_phone} />
              <Field label="Pays" value={mandat.client_country} />
              <Field label="Ville" value={mandat.client_city} />
              <Field
                label="Statut legacy"
                value={mandat.status ?? "—"}
              />
            </dl>
          </div>

          <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              Critères de recherche
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Transaction" value={mandat.type_transaction} />
              <Field label="Type de bien" value={mandat.property_type} />
              <Field
                label="Budget"
                value={formatBudget(mandat.budget_min, mandat.budget_max)}
              />
              <Field label="Zones" value={zones} />
            </dl>
          </div>

          {mandat.notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Notes client (legacy)
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {mandat.notes}
              </p>
            </div>
          )}

          {mandat.admin_notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Dernière note admin
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {mandat.admin_notes}
              </p>
            </div>
          )}

          {/* BUG 8 : placeholder « Action Phase B » masqué — bloc inerte
              (aucune action) qui paraissait cassé. Le finir = écrire
              dans `properties` (table en lecture seule, interdit
              CLAUDE.md). Backlog : docs/admin/PHASE_B_BACKLOG_2026-05-18.md */}
        </div>

        <aside className="space-y-5">
          <WorkflowSelect
            leadId={mandat.id}
            initialStatus={ws}
            action={updateWorkflowStatus}
          />
          <AdminNotes
            leadId={mandat.id}
            history={history}
            initialFollowUp={mandat.next_follow_up ?? null}
            addNoteAction={addAdminNote}
            setFollowUpAction={setNextFollowUp}
          />
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[#1A1F2A]">
        {value && value.trim() ? value : "—"}
      </dd>
    </div>
  );
}
