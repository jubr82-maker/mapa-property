import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ADMIN_LOCALE, formatDateTime } from "@/lib/datetime";
import { REQUEST_STATUSES } from "@/lib/admin/offmarket";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { WorkflowSelect } from "@/components/admin/WorkflowSelect";
import { AdminNotes } from "@/components/admin/AdminNotes";
import {
  WorkflowBadge,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";
import {
  updateRequestWorkflowStatus,
  addRequestAdminNote,
  setRequestNextFollowUp,
} from "@/app/admin/offmarket/actions";
import { PdfExportButton } from "@/components/admin/PdfExportButton";
import { formatPrice, formatSurface } from "@/lib/format/numbers";
import { AdminNotice } from "@/components/admin/AdminNotice";

export const dynamic = "force-dynamic";

type HistoryEntry = {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
};

type RequestFull = {
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
  criteres_precis: string | null;
  status: string | null;
  notes_admin: string | null;
  nda_url: string | null;
  workflow_status?: string | null;
  admin_notes?: string | null;
  next_follow_up?: string | null;
  workflow_history?: HistoryEntry[] | null;
  properties_offmarket?: {
    id: string;
    reference: string;
    title: string | null;
    city_label: string | null;
  } | null;
};

const FULL_SELECT =
  "id,created_at,property_id,prenom,nom,email,telephone,pays_recherche,ville_quartier,budget_max_eur,surface_souhaitee_m2,criteres_precis,status,notes_admin,nda_url,workflow_status,admin_notes,next_follow_up,workflow_history,properties_offmarket(id,reference,title,city_label)";
const FALLBACK_SELECT =
  "id,created_at,property_id,prenom,nom,email,telephone,pays_recherche,ville_quartier,budget_max_eur,surface_souhaitee_m2,criteres_precis,status,notes_admin,nda_url,properties_offmarket(id,reference,title,city_label)";

export default async function AdminOffmarketRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPage();
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_offmarket" });
  const supabase = supabaseService();

  let migrationApplied = true;
  let item: RequestFull | null = null;

  const tryFull = await supabase
    .from("offmarket_requests")
    .select(FULL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (tryFull.error) {
    migrationApplied = false;
    const fallback = await supabase
      .from("offmarket_requests")
      .select(FALLBACK_SELECT)
      .eq("id", id)
      .maybeSingle();
    if (fallback.error || !fallback.data) notFound();
    item = fallback.data as unknown as RequestFull;
  } else {
    if (!tryFull.data) notFound();
    item = tryFull.data as unknown as RequestFull;
  }

  const fullName =
    [item.prenom, item.nom].filter(Boolean).join(" ") || item.email || t("requests.anonymous");
  const empty = t("notProvided");
  const ws = (item.workflow_status as WorkflowStatus | null) ?? "new";
  const history: HistoryEntry[] = Array.isArray(item.workflow_history)
    ? item.workflow_history
    : [];
  const property = item.properties_offmarket;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/offmarket/requests"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70 hover:text-[#e0af6e]"
        >
          <ArrowLeft className="size-3" />
          {t("detail.back")}
        </Link>
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {t("detail.eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {fullName}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            {t("detail.receivedOn", { date: formatDateTime(item.created_at) })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PdfExportButton href={`/api/admin/exports/offmarket-requests/${item.id}`} />
          <WorkflowBadge status={ws} size="md" />
        </div>
      </header>

      {!migrationApplied && (
        <AdminNotice kind="workflow_partial" />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          {property && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {t("detail.property")}
              </p>
              <p className="mt-2 text-sm font-medium text-[#1A1F2A]">
                {property.reference} · {property.title ?? t("untitled")}
              </p>
              {property.city_label && (
                <p className="text-xs text-[#3D4F63]/70">
                  {property.city_label}
                </p>
              )}
              <Link
                href={`/admin/offmarket/${property.id}/requests`}
                className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-[#e0af6e] hover:underline"
              >
                {t("detail.allRequests")} →
              </Link>
            </div>
          )}

          <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              {t("detail.applicant")}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label={t("detail.email")} value={item.email} empty={empty} />
              <Field label={t("detail.phone")} value={item.telephone} empty={empty} />
              <Field label={t("requestRow.country")} value={item.pays_recherche} empty={empty} />
              <Field label={t("requestRow.city")} value={item.ville_quartier} empty={empty} />
              <Field
                label={t("requestRow.budget")}
                empty={empty}
                value={
                  item.budget_max_eur
                    ? formatPrice(item.budget_max_eur, "fr")
                    : null
                }
              />
              <Field
                label={t("requestRow.surface")}
                empty={empty}
                value={
                  item.surface_souhaitee_m2
                    ? formatSurface(item.surface_souhaitee_m2, "fr")
                    : null
                }
              />
              <Field
                label={t("detail.dossierStatus")}
                empty={empty}
                value={
                  item.status
                    ? (REQUEST_STATUSES as readonly string[]).includes(item.status)
                      ? t(`requestStatus.${item.status}`)
                      : t("requestStatus.unknown")
                    : null
                }
              />
            </dl>
          </div>

          {item.criteres_precis && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {t("requestRow.criteria")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {item.criteres_precis}
              </p>
            </div>
          )}

          {item.notes_admin && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {t("detail.dossierNotes")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {item.notes_admin}
              </p>
            </div>
          )}

          {item.admin_notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {t("detail.lastNote")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {item.admin_notes}
              </p>
            </div>
          )}

          {item.nda_url && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {t("detail.nda")}
              </p>
              <a
                href={item.nda_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block font-mono text-sm text-[#e0af6e] hover:underline"
              >
                {t("detail.openNda")}
              </a>
            </div>
          )}
        </div>

        <aside className="space-y-5">
          <WorkflowSelect
            leadId={item.id}
            initialStatus={ws}
            action={updateRequestWorkflowStatus}
          />
          <AdminNotes
            leadId={item.id}
            history={history}
            initialFollowUp={item.next_follow_up ?? null}
            addNoteAction={addRequestAdminNote}
            setFollowUpAction={setRequestNextFollowUp}
          />
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
