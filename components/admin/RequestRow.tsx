"use client";

import { useState, useTransition } from "react";
import {
  REQUEST_STATUSES,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  type RequestStatus,
} from "@/lib/admin/offmarket";
import {
  updateRequestStatus,
  updateRequestNotes,
} from "@/app/admin/offmarket/actions";

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
};

export function RequestRow({ request }: { request: Request }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<RequestStatus>(request.status as RequestStatus);
  const [notes, setNotes] = useState(request.notes_admin ?? "");
  const [busy, startTransition] = useTransition();

  const changeStatus = (next: RequestStatus) => {
    setStatus(next);
    startTransition(async () => {
      await updateRequestStatus(request.id, next);
    });
  };

  const saveNotes = () => {
    startTransition(async () => {
      await updateRequestNotes(request.id, notes);
    });
  };

  return (
    <li className="rounded-2xl border border-[#3D4F63]/15 bg-white p-5">
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
            <span
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.15em] ${REQUEST_STATUS_TONES[status]}`}
            >
              {REQUEST_STATUS_LABELS[status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#3D4F63]/70">
            {request.email}
            {request.telephone && ` · ${request.telephone}`}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/50">
            {new Date(request.created_at).toLocaleString("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        <span className="font-mono text-xs text-[#3D4F63]/60">
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open && (
        <div className="mt-5 space-y-5 border-t border-[#3D4F63]/10 pt-5">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Pays cherché" value={request.pays_recherche} />
            <Info label="Ville / quartier" value={request.ville_quartier} />
            <Info
              label="Budget max"
              value={
                request.budget_max_eur
                  ? request.budget_max_eur.toLocaleString("fr-FR") + " €"
                  : null
              }
            />
            <Info
              label="Surface souhaitée"
              value={
                request.surface_souhaitee_m2
                  ? `${request.surface_souhaitee_m2} m²`
                  : null
              }
            />
            {request.criteres_precis && (
              <div className="sm:col-span-2">
                <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                  Critères précis
                </dt>
                <dd className="mt-1 text-sm leading-relaxed text-[#1A1F2A]">
                  {request.criteres_precis}
                </dd>
              </div>
            )}
          </dl>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
              Workflow
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
                  {REQUEST_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor={`notes-${request.id}`}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60"
            >
              Notes admin
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
              {busy ? "…" : "Enregistrer notes"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-[#1A1F2A]">{value ?? "—"}</dd>
    </div>
  );
}
