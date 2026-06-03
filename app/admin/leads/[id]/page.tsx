import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-ssr-server";
import { WorkflowSelect } from "@/components/admin/WorkflowSelect";
import { AdminNotes } from "@/components/admin/AdminNotes";
import { WorkflowBadge, type WorkflowStatus } from "@/components/admin/WorkflowBadge";
import { ConvertToMandatButton } from "@/components/admin/ConvertToMandatButton";
import { DeleteLeadButton } from "@/components/admin/DeleteLeadButton";
import { ExportLeadButton } from "@/components/admin/ExportLeadButton";

export const dynamic = "force-dynamic";

type HistoryEntry = {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
};

type LeadFull = {
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
  subject: string | null;
  status: string | null;
  property_ref: string | null;
  notes: string | null;
  // Nouvelles colonnes (migration 20260512)
  workflow_status?: string | null;
  admin_notes?: string | null;
  next_follow_up?: string | null;
  workflow_history?: HistoryEntry[] | null;
};

// Fix 404 sur la fiche detail : les colonnes `name` et `user_agent`
// n'existent pas dans la table leads. Leur presence dans le SELECT
// faisait echouer tryFull ET fallback avec 42703, ce qui declenchait
// notFound() systematiquement.
const FULL_SELECT =
  "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,subject,status,property_ref,notes,workflow_status,admin_notes,next_follow_up,workflow_history";

const FALLBACK_SELECT =
  "id,created_at,first_name,last_name,email,phone,type,source,country,city,message,subject,status,property_ref,notes";

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

export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  let migrationApplied = true;
  let lead: LeadFull | null = null;

  const tryFull = await supabase
    .from("leads")
    .select(FULL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (tryFull.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("leads")
      .select(FALLBACK_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (fallback.error || !fallback.data) {
      notFound();
    }
    lead = fallback.data as LeadFull;
  } else {
    if (!tryFull.data) notFound();
    lead = tryFull.data as LeadFull;
  }

  const fullName =
    [lead.first_name, lead.last_name].filter(Boolean).join(" ") ||
    lead.email;

  const ws = (lead.workflow_status as WorkflowStatus | null) ?? "new";

  const history: HistoryEntry[] = Array.isArray(lead.workflow_history)
    ? lead.workflow_history
    : [];

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/leads"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70 hover:text-[#e0af6e]"
        >
          <ArrowLeft className="size-3" />
          Retour aux leads
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            Lead · {lead.type ?? "contact"}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {fullName}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            Créé le {formatDateTime(lead.created_at)}
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
              supabase/migrations/20260512_admin_workflow_leads.sql
            </code>{" "}
            n&apos;est pas appliqué dans le SQL Editor Supabase.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Colonne gauche : infos lead */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              Contact
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Email" value={lead.email} />
              <Field label="Téléphone" value={lead.phone} />
              <Field label="Pays" value={lead.country} />
              <Field label="Ville" value={lead.city} />
              <Field label="Source" value={lead.source} />
              <Field label="Type" value={lead.type} />
              {lead.property_ref && (
                <Field label="Bien réf." value={lead.property_ref} />
              )}
              {lead.subject && <Field label="Sujet" value={lead.subject} />}
              <Field
                label="Statut legacy"
                value={lead.status ?? "—"}
              />
            </dl>
          </div>

          {lead.message && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Message
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {lead.message}
              </p>
            </div>
          )}

          {lead.admin_notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Dernière note admin
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {lead.admin_notes}
              </p>
            </div>
          )}

          {lead.notes && !lead.admin_notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Notes (legacy)
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {lead.notes}
              </p>
            </div>
          )}

          {/* Sprint Export RGPD — bloc actions non destructives.
              Droit d'acces / portabilite : telecharge le lead + mandat
              associe eventuel au format JSON. Place AVANT la Zone danger
              pour separer visuellement export (neutre) et delete (rouge). */}
          <div className="rounded-xl border border-[#e0af6e]/40 bg-[#e0af6e]/5 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#9E7B2A]">
              Actions RGPD
            </p>
            <p className="mt-2 text-sm text-[#1A1F2A]">
              Télécharger toutes les données de ce contact (format JSON,
              portabilité RGPD). Inclut le mandat associé s&apos;il existe.
            </p>
            <div className="mt-3">
              <ExportLeadButton id={lead.id} />
            </div>
          </div>

          {/* Sprint MANDATS-A PARTIE 7 — Zone danger : suppression RGPD.
              FK ON DELETE SET NULL cote mandats : si ce lead a deja ete
              converti, le mandat survit avec lead_id=NULL. */}
          <div className="rounded-xl border border-red-300 bg-red-50/60 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-red-700">
              Zone danger
            </p>
            <p className="mt-2 text-sm text-red-900">
              La suppression définitive efface ce lead de la base. Action
              irréversible — usage RGPD (droit à l&apos;oubli). Si ce lead
              a été converti en mandat, le mandat reste accessible sans
              référence au lead.
            </p>
            <div className="mt-3">
              <DeleteLeadButton id={lead.id} />
            </div>
          </div>
        </div>

        {/* Colonne droite : actions workflow + conversion mandat */}
        <aside className="space-y-5">
          <WorkflowSelect leadId={lead.id} initialStatus={ws} />
          <AdminNotes
            leadId={lead.id}
            history={history}
            initialFollowUp={lead.next_follow_up ?? null}
          />
          <ConvertToMandatButton leadId={lead.id} />
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
