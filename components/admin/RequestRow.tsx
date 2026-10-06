"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_TONES,
  type RequestStatus,
} from "@/lib/admin/offmarket";
import {
  updateRequestStatus,
  updateRequestNotes,
  updateRequestWorkflowStatus,
} from "@/app/admin/offmarket/actions";
import {
  WORKFLOW_STATUSES,
  WorkflowBadge,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";
import { formatPrice, formatSurface } from "@/lib/format/numbers";
import { formatDateTime } from "@/lib/datetime";

type Request = {
  id: string;
  property_id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string | null;
  pays_recherche: string | null;
  ville_quartier: string | null;
  budget_max_eur: number | null;
  surface_souhaitee_m2: number | null;
  criteres_precis: string | null;
  status: string;
  notes_admin: string | null;
  created_at: string;
  /** Statut workflow generique partage avec la liste /admin/offmarket/requests. */
  workflow_status?: string | null;
};

export function RequestRow({ request }: { request: Request }) {
  const t = useTranslations("admin_offmarket");
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RequestStatus>(request.status as RequestStatus);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>(
    request.workflow_status && WORKFLOW_STATUSES.includes(request.workflow_status as WorkflowStatus)
      ? (request.workflow_status as WorkflowStatus)
      : "new",
  );
  const [notes, setNotes] = useState(request.notes_admin ?? "");
  const [busy, startTransition] = useTransition();
  // Motif reel d'un echec (action { ok, error }), affiche dans la carte.
  const [rowError, setRowError] = useState<string | null>(null);
  const tn = useTranslations("admin_notices");
  const run = (action: () => Promise<{ ok: boolean; error?: string }>, undo?: () => void) => {
    setRowError(null);
    startTransition(async () => {
      try {
        const r = await action();
        if (!r.ok) {
          undo?.();
          setRowError(r.error ?? "");
        }
      } catch {
        undo?.();
        setRowError(tn("err_network"));
      }
    });
  };

  const changeStatus = (next: RequestStatus) => {
    const previous = status;
    setStatus(next);
    run(() => updateRequestStatus(request.id, next), () => setStatus(previous));
  };

  const changeWorkflowStatus = (next: WorkflowStatus) => {
    const previous = workflowStatus;
    setWorkflowStatus(next);
    run(() => updateRequestWorkflowStatus(request.id, next), () => setWorkflowStatus(previous));
  };

  const saveNotes = () => {
    run(() => updateRequestNotes(request.id, notes));
  };

  return (
    <li className="rounded-2xl border border-[#3D4F63]/15 bg-white p-5">
      {rowError && (
        <p role="alert" className="mb-2 text-sm text-red-700">
          {rowError}
        </p>
      )}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-lg font-bold text-[#3D4F63]">
              {request.prenom} {request.nom}
            </p>
            <WorkflowBadge status={workflowStatus} />
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${REQUEST_STATUS_TONES[status]}`}
              title={t("requestRow.dossierTitle")}
            >
              {t("requestRow.dossier", { status: t(`requestStatus.${status}`) })}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {request.email}
            {request.telephone && ` · ${request.telephone}`}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
            {formatDateTime(request.created_at)}
          </p>
        </div>
        <span className="font-mono text-xs text-[#3D4F63]/60">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className="mt-5 space-y-5 border-t border-[#3D4F63]/10 pt-5">
          <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Info label={t("requestRow.country")} value={request.pays_recherche} empty={t("notProvided")} />
            <Info label={t("requestRow.city")} value={request.ville_quartier} empty={t("notProvided")} />
            <Info
              empty={t("notProvided")}
              label={t("requestRow.budget")}
              value={
                request.budget_max_eur
                  ? formatPrice(request.budget_max_eur, "fr")
                  : null
              }
            />
            <Info
              empty={t("notProvided")}
              label={t("requestRow.surface")}
              value={
                request.surface_souhaitee_m2
                  ? formatSurface(request.surface_souhaitee_m2, "fr")
                  : null
              }
            />
            {request.criteres_precis && (
              <div className="sm:col-span-2">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                  {t("requestRow.criteria")}
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-[#1A1F2A]">
                  {request.criteres_precis}
                </dd>
              </div>
            )}
          </dl>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
              {t("requestRow.workflowTitle")}
            </p>
            <p className="mt-0.5 text-xs text-[#3D4F63]/60">
              {t("requestRow.workflowHint")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {WORKFLOW_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy || s === workflowStatus}
                  onClick={() => changeWorkflowStatus(s)}
                  className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors disabled:opacity-50 ${
                    s === workflowStatus
                      ? "bg-[#3D4F63] text-[#F5EFE1]"
                      : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
                  }`}
                >
                  {t(`workflow.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
              {t("requestRow.dossierSection")}
            </p>
            <p className="mt-0.5 text-xs text-[#3D4F63]/60">
              {t("requestRow.dossierHint")}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {REQUEST_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={busy || s === status}
                  onClick={() => changeStatus(s)}
                  className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors disabled:opacity-50 ${
                    s === status
                      ? "bg-[#3D4F63] text-[#F5EFE1]"
                      : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
                  }`}
                >
                  {t(`requestStatus.${s}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor={`notes-${request.id}`}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60"
            >
              {t("requestRow.notes")}
            </label>
            <textarea
              id={`notes-${request.id}`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#e0af6e] focus:outline-none"
            />
            <button
              type="button"
              onClick={saveNotes}
              disabled={busy}
              className="mt-2 rounded-full bg-[#3D4F63] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5EFE1] transition-colors hover:bg-[#e0af6e] disabled:opacity-50"
            >
              {busy ? "…" : t("requestRow.saveNotes")}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Info({ label, value, empty }: { label: string; value: string | null; empty: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[#1A1F2A]">{value ?? empty}</dd>
    </div>
  );
}
