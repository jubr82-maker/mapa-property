import Link from "next/link";
import { AdminDateCell } from "@/components/admin/AdminDateCell";
import { ADMIN_LOCALE, formatDateOnly, lastModifiedAt } from "@/lib/datetime";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { supabaseService } from "@/lib/supabase-service";
import { requireAdminPage } from "@/lib/admin/require-admin";
import { WorkflowSelect } from "@/components/admin/WorkflowSelect";
import { AdminNotes } from "@/components/admin/AdminNotes";
import {
  WorkflowBadge,
  type AdminTranslator,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";
import { formatPrice as formatPriceShared, formatSurface as formatSurfaceShared } from "@/lib/format/numbers";
import {
  updateWorkflowStatus,
  addAdminNote,
  setNextFollowUp,
} from "@/app/admin/mandats/actions";
import {
  EditMandatForm,
  type MandatEditable,
} from "@/components/admin/EditMandatForm";
import { DeleteMandatButton } from "@/components/admin/DeleteMandatButton";
import { ExportMandatButton } from "@/components/admin/ExportMandatButton";
import { PdfExportButton } from "@/components/admin/PdfExportButton";

export const dynamic = "force-dynamic";

// Fiche detail editable. Affichage selon 3 sections (type_transaction :
// vente, recherche, location), edition via EditMandatForm, suivi
// (WorkflowSelect, AdminNotes), suppression RGPD via DeleteMandatButton et
// lien vers le lead d'origine.

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
  lead_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  client_country: string | null;
  client_city: string | null;
  property_type: string | null;
  type_transaction: "vente" | "recherche" | "location";
  type_mandat: string | null;
  bien_adresse: string | null;
  bien_type: string | null;
  prix_mise_en_vente: number | null;
  commission: string | null;
  date_debut: string | null;
  date_fin: string | null;
  signed_at: string | null;
  budget_min: number | null;
  budget_max: number | null;
  zones: string[] | null;
  min_bedrooms: number | null;
  min_surface: number | null;
  status: string | null;
  notes: string | null;
  workflow_status?: string | null;
  admin_notes?: string | null;
  next_follow_up?: string | null;
  workflow_history?: HistoryEntry[] | null;
};

const FULL_SELECT =
  "id,created_at,lead_id,client_name,client_email,client_phone,client_country,client_city," +
  "property_type,type_transaction,type_mandat,bien_adresse,bien_type,prix_mise_en_vente," +
  "commission,date_debut,date_fin,signed_at,budget_min,budget_max,zones,min_bedrooms,min_surface," +
  "status,notes,workflow_status,admin_notes,next_follow_up,workflow_history";

/** Libelle traduit d'une valeur enregistree ("semi-exclusif" -> cle "..._semi_exclusif"). */
function labelOf(t: AdminTranslator, prefix: string, value: string): string {
  const key = `${prefix}${value.replace(/-/g, "_")}`;
  return t.has(key) ? t(key) : value;
}

function formatPrice(value: number | null): string {
  if (value == null) return "";
  return formatPriceShared(value, "fr");
}

function formatBudget(t: AdminTranslator, min: number | null, max: number | null): string {
  const fmt = (n: number) => formatPriceShared(n, "fr");
  if (min != null && max != null) return t("budget_range", { min: fmt(min), max: fmt(max) });
  if (min != null) return t("budget_from", { min: fmt(min) });
  if (max != null) return t("budget_up_to", { max: fmt(max) });
  return "";
}

export default async function AdminMandatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdminPage();
  const supabase = supabaseService();

  const { data, error } = await supabase
    .from("mandats")
    .select(FULL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const mandat = data as unknown as MandatFull;

  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_mandats" });
  const tw = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_workflow" });
  const notProvided = tw("not_provided");

  const ws = (mandat.workflow_status as WorkflowStatus | null) ?? "new";
  const history: HistoryEntry[] = Array.isArray(mandat.workflow_history)
    ? mandat.workflow_history
    : [];

  const editable: MandatEditable = {
    type_transaction: mandat.type_transaction,
    type_mandat: mandat.type_mandat,
    bien_adresse: mandat.bien_adresse,
    bien_type: mandat.bien_type,
    prix_mise_en_vente: mandat.prix_mise_en_vente,
    commission: mandat.commission,
    date_debut: mandat.date_debut,
    date_fin: mandat.date_fin,
    signed_at: mandat.signed_at,
    status: mandat.status,
    notes: mandat.notes,
  };

  const sectionLabel = labelOf(t, "section_", mandat.type_transaction);
  const typeMandatLabel = mandat.type_mandat
    ? labelOf(t, "type_mandat_", mandat.type_mandat)
    : null;
  const statusLabel = mandat.status
    ? labelOf(t, "status_", mandat.status)
    : notProvided;

  const isVente = mandat.type_transaction === "vente";
  const isRecherche = mandat.type_transaction === "recherche";
  const isLocation = mandat.type_transaction === "location";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <Link
          href={`/admin/mandats?section=${mandat.type_transaction}`}
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70 hover:text-[#e0af6e]"
        >
          <ArrowLeft className="size-3" />
          {t("back")}
        </Link>
        {mandat.lead_id && (
          <Link
            href={`/admin/leads/${mandat.lead_id}`}
            className="inline-flex items-center gap-2 rounded-full border border-[#e0af6e]/40 bg-[#e0af6e]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[#9E7B2A] hover:bg-[#e0af6e]/20"
          >
            {t("origin_lead")}
          </Link>
        )}
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            {t("detail_eyebrow", { section: sectionLabel })}
            {typeMandatLabel ? ` · ${typeMandatLabel}` : ""}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {mandat.client_name?.trim() || mandat.client_email || notProvided}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            <AdminDateCell
              createdAt={mandat.created_at}
              updatedAt={lastModifiedAt(mandat)}
              variant="long"
            />
            {t("status_line", { status: statusLabel })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PdfExportButton href={`/api/admin/exports/mandats/${mandat.id}`} />
          <WorkflowBadge status={ws} size="md" />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Colonne gauche : informations, edition et suppression */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              {t("contact_title")}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label={tw("field_email")} value={mandat.client_email} empty={notProvided} />
              <Field label={tw("field_phone")} value={mandat.client_phone} empty={notProvided} />
              <Field label={tw("field_country")} value={mandat.client_country} empty={notProvided} />
              <Field label={tw("field_city")} value={mandat.client_city} empty={notProvided} />
            </dl>
          </div>

          {(isVente || isLocation) && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {t("property_title")}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label={t("field_address")} value={mandat.bien_adresse} empty={notProvided} />
                <Field label={t("form_property_type")} value={mandat.bien_type} empty={notProvided} />
                <Field
                  label={isLocation ? t("field_rent") : t("field_price")}
                  value={formatPrice(mandat.prix_mise_en_vente)}
                  empty={notProvided}
                />
                <Field label={t("form_commission")} value={mandat.commission} empty={notProvided} />
              </dl>
            </div>
          )}

          {isRecherche && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {t("search_title")}
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label={t("field_search_property_type")} value={mandat.property_type} empty={notProvided} />
                <Field
                  label={t("field_budget")}
                  value={formatBudget(t, mandat.budget_min, mandat.budget_max)}
                  empty={notProvided}
                />
                <Field
                  label={t("field_zones")}
                  value={
                    Array.isArray(mandat.zones) && mandat.zones.length > 0
                      ? mandat.zones.join(", ")
                      : mandat.client_city
                  }
                  empty={notProvided}
                />
                <Field
                  label={t("field_min_bedrooms")}
                  empty={notProvided}
                  value={
                    mandat.min_bedrooms != null
                      ? String(mandat.min_bedrooms)
                      : null
                  }
                />
                <Field
                  label={t("field_min_surface")}
                  empty={notProvided}
                  value={
                    mandat.min_surface != null
                      ? formatSurfaceShared(mandat.min_surface, "fr", { withUnit: false })
                      : null
                  }
                />
              </dl>
            </div>
          )}

          <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              {t("cycle_title")}
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label={t("form_date_start")} value={formatDateOnly(mandat.date_debut)} empty={notProvided} />
              <Field label={t("form_date_end")} value={formatDateOnly(mandat.date_fin)} empty={notProvided} />
              <Field
                label={t("form_signed")}
                value={formatDateOnly(mandat.signed_at)}
                empty={notProvided}
              />
              <Field label={t("form_status")} value={statusLabel} empty={notProvided} />
            </dl>
          </div>

          {mandat.notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {t("notes_title")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {mandat.notes}
              </p>
            </div>
          )}

          {mandat.admin_notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                {tw("last_note")}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                {mandat.admin_notes}
              </p>
            </div>
          )}

          <EditMandatForm id={mandat.id} initial={editable} />

          {/* Export RGPD : bloc d'actions non destructives. Droit d'acces
              et portabilite : telecharge le mandat au format JSON. Place
              avant la zone de suppression pour separer export (neutre) et
              suppression (rouge). */}
          <div className="rounded-xl border border-[#e0af6e]/40 bg-[#e0af6e]/5 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#9E7B2A]">
              {tw("rgpd_title")}
            </p>
            <p className="mt-2 text-sm text-[#1A1F2A]">
              {t("rgpd_text")}
            </p>
            <div className="mt-3">
              <ExportMandatButton id={mandat.id} />
            </div>
          </div>

          {/* Suppression RGPD definitive */}
          <div className="rounded-xl border border-red-300 bg-red-50/60 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-red-700">
              {tw("danger_title")}
            </p>
            <p className="mt-2 text-sm text-red-900">
              {t("danger_text")}
            </p>
            <div className="mt-3">
              <DeleteMandatButton id={mandat.id} />
            </div>
          </div>
        </div>

        {/* Colonne droite : suivi et notes internes */}
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
