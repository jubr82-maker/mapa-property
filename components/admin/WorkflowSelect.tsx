"use client";

import { useState, useTransition } from "react";
import { updateWorkflowStatus as updateLeadWorkflowStatus } from "@/app/admin/leads/actions";
import {
  WORKFLOW_STATUSES,
  WORKFLOW_LABELS,
  WorkflowBadge,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";

// Signature des Server Actions workflow (alignée sur leads/actions.ts)
type UpdateWorkflowAction = (
  id: string,
  newStatus: string,
  reason?: string,
) => Promise<void>;

export function WorkflowSelect({
  leadId,
  initialStatus,
  action,
}: {
  leadId: string;
  initialStatus: string | null | undefined;
  /**
   * Server Action à appeler. Si omise, on cible /admin/leads (compat
   * ascendante). Pour réutiliser sur mandats / arcova_waitlist /
   * offmarket_requests, passer l'action depuis le module concerné.
   */
  action?: UpdateWorkflowAction;
}) {
  const updateWorkflowStatus = action ?? updateLeadWorkflowStatus;
  const [status, setStatus] = useState<WorkflowStatus>(
    (initialStatus && WORKFLOW_STATUSES.includes(initialStatus as WorkflowStatus)
      ? (initialStatus as WorkflowStatus)
      : "new"),
  );
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const handleChange = (next: WorkflowStatus) => {
    if (next === status) return;
    setError(null);
    const prev = status;
    setStatus(next);
    startTransition(async () => {
      try {
        await updateWorkflowStatus(leadId, next, reason || undefined);
        setReason("");
      } catch (e) {
        setStatus(prev);
        setError(e instanceof Error ? e.message : "Erreur Supabase");
      }
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#3D4F63]/15 bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
          Statut workflow
        </p>
        <WorkflowBadge status={status} size="md" />
      </div>
      <div className="flex flex-wrap gap-2">
        {WORKFLOW_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy || s === status}
            onClick={() => handleChange(s)}
            className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors disabled:opacity-50 ${
              s === status
                ? "bg-[#3D4F63] text-[#F5EFE1]"
                : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e]"
            }`}
          >
            {WORKFLOW_LABELS[s]}
          </button>
        ))}
      </div>
      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
          Motif (optionnel — sera historisé)
        </label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Ex. budget insuffisant, RDV programmé…"
          className="mt-1 block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#e0af6e] focus:outline-none"
        />
      </div>
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 font-mono text-[11px] text-red-700 ring-1 ring-inset ring-red-200">
          {error}
        </p>
      )}
    </div>
  );
}
