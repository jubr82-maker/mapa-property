"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { updateLeadStatus, updateLeadNotes } from "@/app/admin/leads/actions";

type Lead = {
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
  status: string | null;
  property_ref: string | null;
};

const LEAD_STATUSES = ["pending", "contacted", "qualified", "converted", "rejected"] as const;
const LEAD_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  contacted: "Contacté",
  qualified: "Qualifié",
  converted: "Converti",
  rejected: "Refusé",
};

const LEAD_TYPES = [
  "contact",
  "buy",
  "sell",
  "rent",
  "estimate",
  "mandate_search",
  "mandate_exclusive",
  "mandate_semi",
  "mandate_simple",
  "mandate_autonomous",
  "offmarket_request",
] as const;

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.replace(`/admin/leads?${next.toString()}`);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#3D4F63]/15 bg-white p-4">
        <input
          type="search"
          placeholder="Recherche email / nom / tel…"
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => setParam("q", e.target.value)}
          className="min-w-[260px] flex-1 rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#B8865A] focus:outline-none"
        />
        <select
          value={sp.get("type") ?? ""}
          onChange={(e) => setParam("type", e.target.value)}
          className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
        >
          <option value="">Tous types</option>
          {LEAD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={sp.get("status") ?? ""}
          onChange={(e) => setParam("status", e.target.value)}
          className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
        >
          <option value="">Tous statuts</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEAD_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#3D4F63]/15 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Localisation</th>
              <th className="px-4 py-3">Statut</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3D4F63]/10">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#3D4F63]/60">
                  Aucun lead.
                </td>
              </tr>
            ) : (
              leads.map((l) => (
                <LeadRow
                  key={l.id}
                  lead={l}
                  open={openId === l.id}
                  onToggle={() => setOpenId(openId === l.id ? null : l.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadRow({
  lead,
  open,
  onToggle,
}: {
  lead: Lead;
  open: boolean;
  onToggle: () => void;
}) {
  const [status, setStatus] = useState(lead.status ?? "pending");
  const [notes, setNotes] = useState("");
  const [busy, startTransition] = useTransition();

  const changeStatus = (next: string) => {
    setStatus(next);
    startTransition(() => updateLeadStatus(lead.id, next));
  };

  const saveNotes = () => {
    startTransition(() => updateLeadNotes(lead.id, notes));
  };

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");

  return (
    <>
      <tr className="cursor-pointer hover:bg-[#3D4F63]/5" onClick={onToggle}>
        <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
          {new Date(lead.created_at).toLocaleDateString("fr-FR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </td>
        <td className="px-4 py-3 font-mono text-xs">{lead.type ?? "—"}</td>
        <td className="px-4 py-3">
          <p className="font-medium text-[#1A1F2A]">{fullName || lead.email}</p>
          <p className="text-xs text-[#3D4F63]/60">
            {lead.email}
            {lead.phone && ` · ${lead.phone}`}
          </p>
        </td>
        <td className="px-4 py-3 text-xs text-[#3D4F63]/80">
          {[lead.country, lead.city].filter(Boolean).join(" · ") || "—"}
        </td>
        <td className="px-4 py-3">
          <span className="rounded-full bg-[#3D4F63]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]">
            {LEAD_STATUS_LABELS[status] ?? status}
          </span>
        </td>
        <td className="px-4 py-3 text-right font-mono text-xs text-[#3D4F63]/60">
          {open ? "▴" : "▾"}
        </td>
      </tr>
      {open && (
        <tr className="bg-[#F5EFE1]/40">
          <td colSpan={6} className="px-4 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                  Message
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                  {lead.message || "—"}
                </p>
                {lead.property_ref && (
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    Bien réf : <span className="text-[#B8865A]">{lead.property_ref}</span>
                  </p>
                )}
                {lead.source && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    Source : <span className="text-[#3D4F63]">{lead.source}</span>
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    Workflow
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {LEAD_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busy || s === status}
                        onClick={() => changeStatus(s)}
                        className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors disabled:opacity-50 ${
                          s === status
                            ? "bg-[#3D4F63] text-[#F5EFE1]"
                            : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#B8865A]"
                        }`}
                      >
                        {LEAD_STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    Notes admin
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#B8865A] focus:outline-none"
                  />
                  <button
                    onClick={saveNotes}
                    disabled={busy}
                    className="mt-2 rounded-full bg-[#3D4F63] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5EFE1] hover:bg-[#B8865A] disabled:opacity-50"
                  >
                    {busy ? "…" : "Enregistrer notes"}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
