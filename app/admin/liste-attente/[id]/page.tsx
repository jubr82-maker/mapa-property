import Link from "next/link";
import { AdminDateCell } from "@/components/admin/AdminDateCell";
import { lastModifiedAt } from "@/lib/datetime";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";
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
} from "@/app/admin/liste-attente/actions";

export const dynamic = "force-dynamic";

type HistoryEntry = {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
};

type WaitlistFull = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  message: string | null;
  source: string | null;
  status: string | null;
  workflow_status?: string | null;
  admin_notes?: string | null;
  next_follow_up?: string | null;
  workflow_history?: HistoryEntry[] | null;
};

const FULL_SELECT =
  "id,created_at,first_name,last_name,email,message,source,status,workflow_status,admin_notes,next_follow_up,workflow_history";

const FALLBACK_SELECT =
  "id,created_at,first_name,last_name,email,message,source,status";

// Parse les tags [CHAMP] inseres dans `message` par /api/liste-attente
// (cf. app/admin/liste-attente/page.tsx, meme logique).
function extractTag(message: string | null, tag: string): string | null {
  if (!message) return null;
  const inline = message.match(
    new RegExp(`\\[${tag}\\][ \\t]+([^\\n]+)`, "i"),
  );
  if (inline) return inline[1].trim();
  const block = message.match(
    new RegExp(`\\[${tag}\\]\\s*\\n([\\s\\S]*?)(?=\\n\\[[A-Z_]+\\]|$)`, "i"),
  );
  if (block) return block[1].trim();
  return null;
}


export default async function AdminWaitlistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPage();
  const supabase = supabaseService();

  let migrationApplied = true;
  let item: WaitlistFull | null = null;

  const tryFull = await supabase
    .from("leads")
    .select(FULL_SELECT)
    .eq("id", id)
    .eq("type", "waitlist")
    .maybeSingle();

  if (tryFull.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("leads")
      .select(FALLBACK_SELECT)
      .eq("id", id)
      .eq("type", "waitlist")
      .maybeSingle();
    if (fallback.error || !fallback.data) notFound();
    item = fallback.data as WaitlistFull;
  } else {
    if (!tryFull.data) notFound();
    item = tryFull.data as WaitlistFull;
  }

  const fullName =
    [item.first_name, item.last_name].filter(Boolean).join(" ") ||
    item.email;
  const ws = (item.workflow_status as WorkflowStatus | null) ?? "new";
  const history: HistoryEntry[] = Array.isArray(item.workflow_history)
    ? item.workflow_history
    : [];

  const budget = extractTag(item.message, "BUDGET");
  const budgetValidated = extractTag(item.message, "BUDGET_VALIDE");
  const search = extractTag(item.message, "RECHERCHE");

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/liste-attente"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70 hover:text-[#e0af6e]"
        >
          <ArrowLeft className="size-3" />
          Retour a la liste d&apos;attente
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            Liste d&apos;attente
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {fullName}
          </h1>
          <div className="mt-1 font-mono text-[11px] tracking-[0.1em] text-[#3D4F63]/60">
            <AdminDateCell
              createdAt={item.created_at}
              updatedAt={lastModifiedAt(item)}
              variant="long"
            />
          </div>
        </div>
        <WorkflowBadge status={ws} size="md" />
      </header>

      {!migrationApplied && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-700">
            Migration en attente
          </p>
          <p className="mt-1">
            Les fonctionnalites workflow (statut, notes, follow up) sont
            desactivees tant que{" "}
            <code className="font-mono">
              supabase/migrations/20260512_admin_workflow_leads.sql
            </code>{" "}
            n&apos;est pas applique dans le SQL Editor Supabase.
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
              <Field label="Source" value={item.source} />
              <Field label="Budget" value={budget} />
              <Field label="Budget valide" value={budgetValidated} />
              <Field label="Statut legacy" value={item.status ?? "—"} />
            </dl>
          </div>

          {search && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Recherche
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {search}
              </p>
            </div>
          )}

          {item.admin_notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Derniere note admin
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {item.admin_notes}
              </p>
            </div>
          )}
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
