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
import {
  EditMandatForm,
  type MandatEditable,
} from "@/components/admin/EditMandatForm";
import { DeleteMandatButton } from "@/components/admin/DeleteMandatButton";

export const dynamic = "force-dynamic";

// Sprint MANDATS-A PARTIE 6 — fiche detail editable. Affichage 3 sections
// (type_transaction = vente / recherche / location), zones d'edition via
// EditMandatForm + actions workflow (WorkflowSelect, AdminNotes) +
// suppression RGPD via DeleteMandatButton + lien lead d'origine.

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

const TYPE_TRANSACTION_LABEL: Record<string, string> = {
  vente: "Vente",
  recherche: "Recherche",
  location: "Location",
};

const TYPE_MANDAT_LABEL: Record<string, string> = {
  exclusif: "Exclusif",
  "semi-exclusif": "Semi-exclusif",
  simple: "Simple",
  autonome: "Autonome",
};

const STATUS_LABEL: Record<string, string> = {
  actif: "Actif",
  vendu: "Vendu",
  loue: "Loué",
  expire: "Expiré",
  resilie: "Résilié",
};

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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatPrice(value: number | null): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-LU", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
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

  const { data, error } = await supabase
    .from("mandats")
    .select(FULL_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) notFound();
  const mandat = data as unknown as MandatFull;

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

  const sectionLabel =
    TYPE_TRANSACTION_LABEL[mandat.type_transaction] ?? mandat.type_transaction;
  const typeMandatLabel = mandat.type_mandat
    ? (TYPE_MANDAT_LABEL[mandat.type_mandat] ?? mandat.type_mandat)
    : null;
  const statusLabel = mandat.status
    ? (STATUS_LABEL[mandat.status] ?? mandat.status)
    : "—";

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
          Retour aux mandats
        </Link>
        {mandat.lead_id && (
          <Link
            href={`/admin/leads/${mandat.lead_id}`}
            className="inline-flex items-center gap-2 rounded-full border border-[#e0af6e]/40 bg-[#e0af6e]/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-[#9E7B2A] hover:bg-[#e0af6e]/20"
          >
            ← Lead d&apos;origine
          </Link>
        )}
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#e0af6e]">
            Mandat · {sectionLabel}
            {typeMandatLabel ? ` · ${typeMandatLabel}` : ""}
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold text-[#3D4F63]">
            {mandat.client_name?.trim() || mandat.client_email || "—"}
          </h1>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
            Créé le {formatDateTime(mandat.created_at)} · Statut {statusLabel}
          </p>
        </div>
        <WorkflowBadge status={ws} size="md" />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Colonne gauche : infos statiques + edit form + danger zone */}
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
            </dl>
          </div>

          {(isVente || isLocation) && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Bien
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label="Adresse" value={mandat.bien_adresse} />
                <Field label="Type de bien" value={mandat.bien_type} />
                <Field
                  label={isLocation ? "Loyer souhaité" : "Prix de mise en vente"}
                  value={formatPrice(mandat.prix_mise_en_vente)}
                />
                <Field label="Commission" value={mandat.commission} />
              </dl>
            </div>
          )}

          {isRecherche && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Critères de recherche
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Field label="Type de bien recherché" value={mandat.property_type} />
                <Field
                  label="Budget"
                  value={formatBudget(mandat.budget_min, mandat.budget_max)}
                />
                <Field
                  label="Zones"
                  value={
                    Array.isArray(mandat.zones) && mandat.zones.length > 0
                      ? mandat.zones.join(", ")
                      : (mandat.client_city ?? "—")
                  }
                />
                <Field
                  label="Chambres min."
                  value={
                    mandat.min_bedrooms != null
                      ? String(mandat.min_bedrooms)
                      : null
                  }
                />
                <Field
                  label="Surface min. (m²)"
                  value={
                    mandat.min_surface != null
                      ? String(mandat.min_surface)
                      : null
                  }
                />
              </dl>
            </div>
          )}

          <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
              Cycle commercial
            </p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <Field label="Date début" value={formatDate(mandat.date_debut)} />
              <Field label="Date fin" value={formatDate(mandat.date_fin)} />
              <Field
                label="Date de signature"
                value={formatDate(mandat.signed_at)}
              />
              <Field label="Statut" value={statusLabel} />
            </dl>
          </div>

          {mandat.notes && (
            <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
                Notes
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

          <EditMandatForm id={mandat.id} initial={editable} />

          {/* Zone danger : suppression RGPD definitive */}
          <div className="rounded-xl border border-red-300 bg-red-50/60 p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-red-700">
              Zone danger
            </p>
            <p className="mt-2 text-sm text-red-900">
              La suppression définitive efface ce mandat de la base. Action
              irréversible — usage RGPD uniquement.
            </p>
            <div className="mt-3">
              <DeleteMandatButton id={mandat.id} />
            </div>
          </div>
        </div>

        {/* Colonne droite : workflow + notes admin */}
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
