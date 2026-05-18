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
} from "@/app/admin/arcova/actions";

export const dynamic = "force-dynamic";

type HistoryEntry = {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
};

type ArcovaFull = {
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
  admin_notes?: string | null;
  next_follow_up?: string | null;
  workflow_history?: HistoryEntry[] | null;
};

const FULL_SELECT =
  "id,created_at,email,first_name,last_name,phone,company,role,message,status,notes,workflow_status,admin_notes,next_follow_up,workflow_history";

const FALLBACK_SELECT =
  "id,created_at,email,first_name,last_name,phone,company,role,message,status,notes";

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

export default async function AdminArcovaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  let migrationApplied = true;
  let item: ArcovaFull | null = null;

  const tryFull = await supabase
    .from("arcova_waitlist")
    .select(FULL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (tryFull.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("arcova_waitlist")
      .select(FALLBACK_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (fallback.error || !fallback.data) notFound();
    item = fallback.data as ArcovaFull;
  } else {
    if (!tryFull.data) notFound();
    item = tryFull.data as ArcovaFull;
  }

  const fullName =
    [item.first_name, item.last_name].filter(Boolean).join(" ") || item.email;
  const ws = (item.workflow_status as WorkflowStatus | null) ?? "new";
  const history: HistoryEntry[] = Array.isArray(item.workflow_history)
    ? item.workflow_history
    : [];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/arcova"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70 hover:text-[#B8865A]"
        >
          <ArrowLeft className="size-3" />
          Retour à la waitlist
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#B8865A]">
            ARCOVA · waitlist
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {fullName}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            Inscrit le {formatDateTime(item.created_at)}
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
              supabase/migrations/20260512_admin_workflow_arcova.sql
            </code>{" "}
            n&apos;est pas appliqué dans le SQL Editor Supabase.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              Contact
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Email" value={item.email} />
              <Field label="Téléphone" value={item.phone} />
              <Field label="Entreprise" value={item.company} />
              <Field label="Rôle" value={item.role} />
              <Field label="Statut legacy" value={item.status ?? "—"} />
            </dl>
          </div>

          {item.message && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Message
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {item.message}
              </p>
            </div>
          )}

          {item.notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Notes (legacy)
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {item.notes}
              </p>
            </div>
          )}

          {item.admin_notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Dernière note admin
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {item.admin_notes}
              </p>
            </div>
          )}

          {/* BUG 8 : placeholder « Action Phase B » masqué (bloc inerte).
              Backlog : docs/admin/PHASE_B_BACKLOG_2026-05-18.md */}
        </div>

        <aside className="space-y-5">
          <WorkflowSelect
            leadId={item.id}
            initialStatus={ws}
            action={updateWorkflowStatus}
          />
          <AdminNotes
            leadId={item.id}
            history={history}
            initialFollowUp={item.next_follow_up ?? null}
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
