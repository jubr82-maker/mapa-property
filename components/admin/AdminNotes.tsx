"use client";

import { useState, useTransition } from "react";
import { addAdminNote, setNextFollowUp } from "@/app/admin/leads/actions";

type HistoryEntry = {
  at: string;
  from?: string;
  to?: string;
  reason?: string | null;
  note?: string;
};

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AdminNotes({
  leadId,
  history,
  initialFollowUp,
}: {
  leadId: string;
  history: HistoryEntry[];
  initialFollowUp: string | null;
}) {
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState(initialFollowUp ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const sortedHistory = [...(history ?? [])].sort((a, b) =>
    b.at.localeCompare(a.at),
  );

  const submitNote = () => {
    if (!note.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await addAdminNote(leadId, note);
        setNote("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur Supabase");
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
        setError(e instanceof Error ? e.message : "Erreur Supabase");
      }
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
          Prochain follow-up
        </p>
        <div className="mt-2 flex items-center gap-3">
          <input
            type="date"
            value={followUp}
            disabled={busy}
            onChange={(e) => submitFollowUp(e.target.value)}
            className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#B8865A] focus:outline-none"
          />
          {followUp && (
            <button
              type="button"
              onClick={() => submitFollowUp("")}
              disabled={busy}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60 hover:text-[#B8865A]"
            >
              Effacer
            </button>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-[#3D4F63]/15 bg-white p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
          Ajouter une note admin
        </p>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note interne — historisée avec horodatage."
          className="mt-2 block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#B8865A] focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={submitNote}
            disabled={busy || !note.trim()}
            className="rounded-full bg-[#3D4F63] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5EFE1] hover:bg-[#B8865A] disabled:opacity-50"
          >
            {busy ? "..." : "Ajouter la note"}
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
          Historique workflow ({sortedHistory.length})
        </p>
        {sortedHistory.length === 0 ? (
          <p className="mt-2 text-sm text-[#3D4F63]/60">
            Aucun événement historisé pour le moment.
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
                    Statut :{" "}
                    <span className="font-mono text-xs uppercase tracking-[0.15em]">
                      {entry.from ?? "—"}
                    </span>{" "}
                    →{" "}
                    <span className="font-mono text-xs uppercase tracking-[0.15em] text-[#B8865A]">
                      {entry.to ?? "—"}
                    </span>
                    {entry.reason && (
                      <span className="block text-xs text-[#3D4F63]/70">
                        Motif : {entry.reason}
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
