"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { formatDateTime } from "@/lib/datetime";
import {
  addAdminNote as addLeadAdminNote,
  setNextFollowUp as setLeadNextFollowUp,
} from "@/app/admin/leads/actions";
import { workflowLabelKey } from "@/components/admin/WorkflowBadge";

type AddNoteAction = (id: string, noteText: string) => Promise<void>;
type SetFollowUpAction = (id: string, date: string | null) => Promise<void>;

type HistoryEntry = {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
};


export function AdminNotes({
  leadId,
  history,
  initialFollowUp,
  addNoteAction,
  setFollowUpAction,
}: {
  leadId: string;
  history: HistoryEntry[];
  initialFollowUp: string | null;
  /**
   * Server Actions dediees. Si omises, ciblent /admin/leads (compatibilite
   * ascendante). Pour reutiliser sur mandats, arcova_waitlist ou
   * offmarket_requests, passer les actions du module concerne.
   */
  addNoteAction?: AddNoteAction;
  setFollowUpAction?: SetFollowUpAction;
}) {
  const t = useTranslations("admin_workflow");
  const addAdminNote = addNoteAction ?? addLeadAdminNote;
  const setNextFollowUp = setFollowUpAction ?? setLeadNextFollowUp;
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState(initialFollowUp ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const sortedHistory = [...(history ?? [])].sort((a, b) =>
    b.at.localeCompare(a.at),
  );

  const statusLabel = (value: string | undefined) => t(workflowLabelKey(value));

  const submitNote = () => {
    if (!note.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await addAdminNote(leadId, note);
        setNote("");
      } catch (e) {
        console.error("[AdminNotes]", e);
        setError(t("error_generic"));
      }
    });
  };

  const submitFollowUp = (value: string) => {
    setFollowUp(value);
    setError(null);
    startTransition(async () => {
      try {
        await setNextFollowUp(leadId, value || null);
      } catch (e) {
        console.error("[AdminNotes]", e);
        setError(t("error_generic"));
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
          {t("followup_title")}
        </p>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="date"
            value={followUp}
            disabled={busy}
            onChange={(e) => submitFollowUp(e.target.value)}
            className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#e0af6e] focus:outline-none"
          />
          {followUp && (
            <button
              type="button"
              onClick={() => submitFollowUp("")}
              disabled={busy}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60 hover:text-[#e0af6e]"
            >
              {t("clear")}
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
          {t("note_title")}
        </p>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("note_placeholder")}
          className="mt-2 block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#e0af6e] focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={submitNote}
            disabled={busy || !note.trim()}
            className="rounded-full bg-[#3D4F63] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5EFE1] hover:bg-[#e0af6e] disabled:opacity-50"
          >
            {busy ? t("busy") : t("note_submit")}
          </button>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-1 font-mono text-[11px] text-red-700 ring-1 ring-inset ring-red-200">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
          {t("history_title", { count: sortedHistory.length })}
        </p>
        {sortedHistory.length === 0 ? (
          <p className="mt-2 text-sm text-[#3D4F63]/60">
            {t("history_empty")}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {sortedHistory.map((entry, i) => (
              <li
                key={`${entry.at}-${i}`}
                className="rounded-md border border-[#3D4F63]/10 bg-[#F5EFE1]/40 p-3"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                  {formatDateTime(entry.at)}
                </p>
                {entry.note ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#1A1F2A]">
                    {entry.note}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-[#1A1F2A]">
                    {t("history_status")}{" "}
                    <span className="font-mono text-xs uppercase tracking-[0.15em]">
                      {statusLabel(entry.from)}
                    </span>{" "}
                    →{" "}
                    <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#e0af6e]">
                      {statusLabel(entry.to)}
                    </span>
                    {entry.reason && (
                      <span className="block text-xs text-[#3D4F63]/70">
                        {t("history_reason", { reason: entry.reason })}
                      </span>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
