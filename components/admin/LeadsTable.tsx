"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { formatDateTimeShort } from "@/lib/datetime";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Mail, MessageSquarePlus, Phone } from "lucide-react";
import { updateWorkflowStatus, updateLeadNotes, addAdminNote } from "@/app/admin/leads/actions";
import { AdminFilterPanel } from "@/components/admin/AdminFilterPanel";
import {
  WORKFLOW_STATUSES,
  WORKFLOW_LABEL_KEYS,
  WorkflowBadge,
  sourceLabel,
  type WorkflowStatus,
} from "@/components/admin/WorkflowBadge";

type Lead = {
  id: string;
  created_at: string;
  /** Date et heure formatees cote serveur (lib/datetime.ts). */
  created_label?: string;
  updated_label?: string | null;
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
  /** Sujet pre-cadre du formulaire /contact (peut etre vide). */
  subject?: string | null;
  /** Statut de suivi partage avec la page /admin/mandats. */
  workflow_status?: string | null;
};

type Translator = ReturnType<typeof useTranslations>;

// Libelle lisible des sujets pre-cadres du formulaire /contact (cles
// "subject_*" du namespace "admin_leads"). Sujet libre : affiche tel quel.
function subjectLabel(t: Translator, s: string | null | undefined): string {
  if (!s) return "";
  return t.has(`subject_${s}`) ? t(`subject_${s}`) : s;
}

// Libelle lisible du type de demande (cles "type_*" de "admin_leads").
function typeLabel(t: Translator, v: string | null | undefined): string {
  if (!v) return "";
  return t.has(`type_${v}`) ? t(`type_${v}`) : v;
}

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
  "owner_search",
] as const;

export function LeadsTable({
  leads,
  createdColumnLabel,
  sortControl,
}: {
  leads: Lead[];
  createdColumnLabel: string;
  /** Tri par date (rendu serveur), place dans le panneau des filtres. */
  sortControl?: React.ReactNode;
}) {
  const t = useTranslations("admin_leads");
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

  const activeFilters = (sp.get("q") ? 1 : 0) + (sp.get("type") ? 1 : 0);

  return (
    <div className="space-y-4">
      <AdminFilterPanel active={activeFilters}>
      {sortControl}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#3D4F63]/15 bg-white p-4">
        <input
          type="search"
          placeholder={t("search_placeholder")}
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => setParam("q", e.target.value)}
          className="min-w-[260px] flex-1 rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#e0af6e] focus:outline-none"
        />
        <select
          value={sp.get("type") ?? ""}
          onChange={(e) => setParam("type", e.target.value)}
          className="rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm"
        >
          <option value="">{t("all_types")}</option>
          {LEAD_TYPES.map((type) => (
            <option key={type} value={type}>
              {typeLabel(t, type)}
            </option>
          ))}
        </select>
      </div>
      </AdminFilterPanel>

      {/* Telephone : une carte par lead, actions rapides (appel, e-mail,
          statut, note) en un ou deux gestes. Ordinateur : tableau. */}
      <ul className="space-y-3 md:hidden" data-admin-lead-cards>
        {leads.length === 0 ? (
          <li className="rounded-2xl border border-ink/15 bg-bg-soft p-5 text-center text-base text-ink-mid">{t("empty")}</li>
        ) : (
          leads.map((l) => <LeadCard key={l.id} lead={l} />)
        )}
      </ul>

      <div className="hidden overflow-hidden rounded-2xl border border-[#3D4F63]/15 bg-white md:block">
        <table data-no-cards className="w-full text-sm">
          <thead className="bg-[#3D4F63]/5 text-left font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/70">
            <tr>
              <th className="px-4 py-3">{createdColumnLabel}</th>
              <th className="px-4 py-3">{t("col_subject")}</th>
              <th className="px-4 py-3">{t("col_type")}</th>
              <th className="px-4 py-3">{t("col_contact")}</th>
              <th className="px-4 py-3">{t("col_location")}</th>
              <th className="px-4 py-3">{t("col_status")}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3D4F63]/10">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#3D4F63]/60">
                  {t("empty")}
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
  const t = useTranslations("admin_leads");
  const tw = useTranslations("admin_workflow");
  const [status, setStatus] = useState<WorkflowStatus>(
    lead.workflow_status && WORKFLOW_STATUSES.includes(lead.workflow_status as WorkflowStatus)
      ? (lead.workflow_status as WorkflowStatus)
      : "new",
  );
  const [notes, setNotes] = useState("");
  const [busy, startTransition] = useTransition();
  // Motif reel d'un echec (action { ok, error }), affiche sous la ligne.
  const [rowError, setRowError] = useState<string | null>(null);
  const tn = useTranslations("admin_notices");

  const changeStatus = (next: WorkflowStatus) => {
    const previous = status;
    setStatus(next);
    setRowError(null);
    startTransition(async () => {
      try {
        const r = await updateWorkflowStatus(lead.id, next);
        if (!r.ok) {
          setStatus(previous);
          setRowError(r.error);
        }
      } catch {
        setStatus(previous);
        setRowError(tn("err_network"));
      }
    });
  };

  const saveNotes = () => {
    setRowError(null);
    startTransition(async () => {
      try {
        const r = await updateLeadNotes(lead.id, notes);
        if (!r.ok) setRowError(r.error);
      } catch {
        setRowError(tn("err_network"));
      }
    });
  };

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");

  return (
    <>
      <tr className="cursor-pointer hover:bg-[#3D4F63]/5" onClick={onToggle}>
        <td className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70">
          <span className="block whitespace-nowrap">
            {lead.created_label ?? formatDateTimeShort(lead.created_at)}
          </span>
          {lead.updated_label && (
            <span className="block whitespace-nowrap normal-case tracking-normal opacity-60">
              {lead.updated_label}
            </span>
          )}
        </td>
        <td className="px-4 py-3 text-xs">
          {lead.subject ? (
            <span className="inline-flex items-center rounded-full bg-[#e0af6e]/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-[#9E7B2A]">
              {subjectLabel(t, lead.subject)}
            </span>
          ) : (
            <span className="text-[#3D4F63]/40">{tw("not_provided")}</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs">{typeLabel(t, lead.type) || tw("not_provided")}</td>
        <td className="px-4 py-3">
          <p className="font-medium text-[#1A1F2A]">{fullName || lead.email}</p>
          <p className="text-xs text-[#3D4F63]/60">
            {lead.email}
            {lead.phone && ` · ${lead.phone}`}
          </p>
        </td>
        <td className="px-4 py-3 text-xs text-[#3D4F63]/80">
          {[lead.country, lead.city].filter(Boolean).join(" · ") || tw("not_provided")}
        </td>
        <td className="px-4 py-3">
          <WorkflowBadge status={status} />
        </td>
        <td className="px-4 py-3 text-right font-mono text-xs text-[#3D4F63]/60">
          {open ? "▴" : "▾"}
        </td>
      </tr>
      {open && (
        <tr className="bg-[#F5EFE1]/40">
          <td colSpan={7} className="px-4 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                  {t("message")}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[#1A1F2A]">
                  {lead.message || t("no_message")}
                </p>
                {lead.property_ref && (
                  <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    {t("property_ref_label")} <span className="text-[#e0af6e]">{lead.property_ref}</span>
                  </p>
                )}
                {lead.source && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    {t("source_label")} <span className="text-[#3D4F63]">{sourceLabel(tw, lead.source)}</span>
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    {tw("select_title")}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {WORKFLOW_STATUSES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={busy || s === status}
                        onClick={() => changeStatus(s)}
                        className={`rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors disabled:opacity-50 ${
                          s === status
                            ? "bg-[#3D4F63] text-[#F5EFE1]"
                            : "border border-[#3D4F63]/20 text-[#3D4F63] hover:border-[#e0af6e]"
                        }`}
                      >
                        {tw(WORKFLOW_LABEL_KEYS[s])}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
                    {t("notes_label")}
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-[#3D4F63]/20 bg-white px-3 py-2 font-sans text-sm focus:border-[#e0af6e] focus:outline-none"
                  />
                  <button
                    onClick={saveNotes}
                    disabled={busy}
                    className="mt-2 rounded-full bg-[#3D4F63] px-4 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#F5EFE1] hover:bg-[#e0af6e] disabled:opacity-50"
                  >
                    {busy ? tw("busy") : t("notes_save")}
                  </button>
                  {rowError && (
                    <p role="alert" className="mt-2 text-sm text-red-700">
                      {rowError}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}


/**
 * Carte d'un lead sur telephone (oct. 2026). En grand : nom, sujet ou type,
 * statut, date et heure. Actions rapides : appeler et ecrire (liens tel: et
 * mailto: autorises, l'admin est prive et non indexe), changer le statut
 * (liste deroulante native), ajouter une note. Le reste (message, lieu,
 * origine) est replie.
 */
function LeadCard({ lead }: { lead: Lead }) {
  const t = useTranslations("admin_leads");
  const tn = useTranslations("admin_notices");
  const tw = useTranslations("admin_workflow");
  const [status, setStatus] = useState<WorkflowStatus>(
    lead.workflow_status && WORKFLOW_STATUSES.includes(lead.workflow_status as WorkflowStatus)
      ? (lead.workflow_status as WorkflowStatus)
      : "new",
  );
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, startTransition] = useTransition();

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ");
  const telHref = lead.phone ? `tel:${lead.phone.replace(/[^\d+]/g, "")}` : null;
  const headline = subjectLabel(t, lead.subject) || typeLabel(t, lead.type);

  const run = (action: () => Promise<unknown>, ok: string, after?: () => void) => {
    setFeedback(null);
    startTransition(async () => {
      try {
        const r = (await action()) as { ok?: boolean; error?: string } | undefined;
        if (r && r.ok === false) return setFeedback({ ok: false, text: r.error ?? "" });
        after?.();
        setFeedback({ ok: true, text: ok });
      } catch {
        setFeedback({ ok: false, text: tn("err_network") });
      }
    });
  };

  const changeStatus = (next: WorkflowStatus) => {
    const previous = status;
    setStatus(next);
    setFeedback(null);
    startTransition(async () => {
      try {
        const r = await updateWorkflowStatus(lead.id, next);
        if (!r.ok) {
          setStatus(previous);
          return setFeedback({ ok: false, text: r.error });
        }
        setFeedback({ ok: true, text: t("quick_status_saved") });
      } catch {
        setStatus(previous);
        setFeedback({ ok: false, text: tn("err_network") });
      }
    });
  };

  const actionCls =
    "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl border border-ink/20 bg-bg px-2 text-[14px] font-semibold text-ink";

  return (
    <li className="rounded-2xl border border-ink/15 bg-bg-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-semibold leading-snug text-ink">{fullName || lead.email}</p>
          {headline && <p className="mt-0.5 text-base text-ink-mid">{headline}</p>}
          {lead.property_ref && <p className="mt-0.5 text-[14px] text-ink-mid">{t("property_ref_label")} {lead.property_ref}</p>}
        </div>
        <WorkflowBadge status={status} />
      </div>
      <p className="mt-2 text-[14px] text-ink-mid">
        {lead.created_label ?? formatDateTimeShort(lead.created_at)}
        {lead.updated_label ? ` · ${lead.updated_label}` : ""}
      </p>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {telHref ? (
          <a href={telHref} className={actionCls}>
            <Phone className="size-5" aria-hidden />
            {t("quick_call")}
          </a>
        ) : (
          <span aria-disabled className={`${actionCls} opacity-40`}>
            <Phone className="size-5" aria-hidden />
            {t("quick_call")}
          </span>
        )}
        <a href={`mailto:${lead.email}`} className={actionCls}>
          <Mail className="size-5" aria-hidden />
          {t("quick_email")}
        </a>
        <label className={`${actionCls} relative`}>
          <span className="sr-only">{tw("select_title")}</span>
          <span aria-hidden>{t("quick_status")}</span>
          <select
            value={status}
            disabled={busy}
            onChange={(e) => changeStatus(e.target.value as WorkflowStatus)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          >
            {WORKFLOW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {tw(WORKFLOW_LABEL_KEYS[s])}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setNoteOpen((o) => !o)} aria-expanded={noteOpen} className={actionCls}>
          <MessageSquarePlus className="size-5" aria-hidden />
          {t("quick_note")}
        </button>
      </div>

      {noteOpen && (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!note.trim()) return;
            run(() => addAdminNote(lead.id, note), t("quick_note_saved"), () => {
              setNote("");
              setNoteOpen(false);
            });
          }}
        >
          <label className="block text-[14px] font-semibold text-ink-mid" htmlFor={`note-${lead.id}`}>
            {t("notes_label")}
          </label>
          <textarea
            id={`note-${lead.id}`}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="block w-full rounded-xl border border-ink/20 bg-bg px-3 py-2 text-base text-ink"
          />
          <button
            type="submit"
            disabled={busy || !note.trim()}
            className="w-full rounded-xl bg-ink px-4 py-3 text-base font-semibold text-bg disabled:opacity-50"
          >
            {busy ? tw("busy") : t("notes_save")}
          </button>
        </form>
      )}

      {feedback && (
        <p role="status" className={`mt-2 text-[14px] ${feedback.ok ? "text-emerald-800" : "text-red-700"}`}>
          {feedback.text}
        </p>
      )}

      <details className="mt-3 border-t border-ink/10 pt-2">
        <summary className="flex cursor-pointer items-center text-base font-semibold text-ink">{t("quick_details")}</summary>
        <div className="mt-2 space-y-2 text-base text-ink">
          <p className="break-words text-[14px] text-ink-mid">
            {lead.email}
            {lead.phone && ` · ${lead.phone}`}
          </p>
          <p className="whitespace-pre-wrap leading-relaxed">{lead.message || t("no_message")}</p>
          <p className="text-[14px] text-ink-mid">
            {[lead.country, lead.city].filter(Boolean).join(" · ") || tw("not_provided")}
          </p>
          {lead.source && (
            <p className="text-[14px] text-ink-mid">
              {t("source_label")} {sourceLabel(tw, lead.source)}
            </p>
          )}
          <Link
            href={`/admin/leads/${lead.id}`}
            className="mt-1 inline-flex min-h-11 items-center rounded-full border border-ink/25 px-4 text-base font-semibold text-ink"
          >
            {t("quick_open")}
          </Link>
        </div>
      </details>
    </li>
  );
}
