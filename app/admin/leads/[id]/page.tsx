import Link from "next/link";
import { AdminDateCell } from "@/components/admin/AdminDateCell";
import { ADMIN_LOCALE, lastModifiedAt } from "@/lib/datetime";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { WorkflowSelect } from "@/components/admin/WorkflowSelect";
import { AdminNotes } from "@/components/admin/AdminNotes";
import {
  WorkflowBadge,
  sourceLabel,
  workflowLabelKey,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";
import { ConvertToMandatButton } from "@/components/admin/ConvertToMandatButton";
import { DeleteLeadButton } from "@/components/admin/DeleteLeadButton";
import { ExportLeadButton } from "@/components/admin/ExportLeadButton";
import { PdfExportButton } from "@/components/admin/PdfExportButton";
import { AdminNotice } from "@/components/admin/AdminNotice";

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
  // Colonnes de suivi (absentes sur une base non mise a jour)
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


export default async function AdminLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPage();
  // Lecture leads via service_role : cf. app/admin/leads/page.tsx.
  const supabase = supabaseService();

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

  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_leads" });
  const tw = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_workflow" });
  const notProvided = tw("not_provided");
  const typeLabel = (v: string | null) =>
    v ? (t.has(`type_${v}`) ? t(`type_${v}`) : v) : null;
  const subjectLabel = (v: string | null) =>
    v ? (t.has(`subject_${v}`) ? t(`subject_${v}`) : v) : null;
  // Ancienne colonne `status` : libelle de suivi si la valeur est connue.
  const legacyStatus = (v: string | null) => {
    if (!v) return null;
    const key = workflowLabelKey(v);
    return key === "status_unknown" ? v : tw(key);
  };

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
          {t("back")}
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {t("detail_eyebrow", { type: typeLabel(lead.type) ?? t("type_contact") })}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {fullName}
          </h1>
          <div className="mt-1 font-mono text-[11px] tracking-[0.1em] text-[#3D4F63]/60">
            <AdminDateCell
              createdAt={lead.created_at}
              updatedAt={lastModifiedAt(lead)}
              variant="long"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <PdfExportButton href={`/api/admin/exports/leads/${lead.id}`} />
          <WorkflowBadge status={ws} size="md" />
        </div>
      </header>

      {!migrationApplied && (
        <AdminNotice kind="workflow_partial" />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Colonne gauche : infos lead */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              {tw("section_contact")}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label={tw("field_email")} value={lead.email} empty={notProvided} />
              <Field label={tw("field_phone")} value={lead.phone} empty={notProvided} />
              <Field label={tw("field_country")} value={lead.country} empty={notProvided} />
              <Field label={tw("field_city")} value={lead.city} empty={notProvided} />
              <Field label={tw("field_source")} value={sourceLabel(tw, lead.source)} empty={notProvided} />
              <Field label={t("field_type")} value={typeLabel(lead.type)} empty={notProvided} />
              {lead.property_ref && (
                <Field label={t("field_property_ref")} value={lead.property_ref} empty={notProvided} />
              )}
              {lead.subject && (
                <Field label={t("field_subject")} value={subjectLabel(lead.subject)} empty={notProvided} />
              )}
              <Field
                label={tw("field_legacy_status")}
                value={legacyStatus(lead.status)}
                empty={notProvided}
              />
            </dl>
          </div>

          {lead.message && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {tw("field_message")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {lead.message}
              </p>
            </div>
          )}

          {lead.admin_notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {tw("last_note")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {lead.admin_notes}
              </p>
            </div>
          )}

          {lead.notes && !lead.admin_notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {tw("legacy_notes")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {lead.notes}
              </p>
            </div>
          )}

          {/* Export RGPD : bloc d'actions non destructives.
              Droit d'acces et portabilite : telecharge le lead et le mandat
              associe eventuel au format JSON. Place avant la zone de
              suppression pour separer export (neutre) et suppression (rouge). */}
          <div className="rounded-xl border border-[#e0af6e]/40 bg-[#e0af6e]/5 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#9E7B2A]">
              {tw("rgpd_title")}
            </p>
            <p className="mt-2 text-sm text-[#1A1F2A]">
              {t("rgpd_text")}
            </p>
            <div className="mt-3">
              <ExportLeadButton id={lead.id} />
            </div>
          </div>

          {/* Suppression RGPD. Cle etrangere ON DELETE SET NULL cote
              mandats : si ce lead a deja ete converti, le mandat survit
              avec lead_id=NULL. */}
          <div className="rounded-xl border border-red-300 bg-red-50/60 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-red-700">
              {tw("danger_title")}
            </p>
            <p className="mt-2 text-sm text-red-900">
              {t("danger_text")}
            </p>
            <div className="mt-3">
              <DeleteLeadButton id={lead.id} />
            </div>
          </div>
        </div>

        {/* Colonne droite : suivi et conversion en mandat */}
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
  empty,
}: {
  label: string;
  value: string | null | undefined;
  empty: string;
}) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[#1A1F2A]">
        {value && value.trim() ? value : empty}
      </dd>
    </div>
  );
}
