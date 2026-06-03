"use client";

// Sprint MANDATS-A PARTIE 7 — bouton de suppression definitive RGPD pour
// les leads (miroir de DeleteMandatButton). Confirmation native
// window.confirm() avant l'appel server action. La server action deleteLead
// fait elle-meme le redirect /admin/leads.
//
// Effet de bord FK : si ce lead a deja ete converti en mandat, le mandat
// survit avec lead_id = NULL (ON DELETE SET NULL cote mandats_lead_id_fkey).

import { useTransition } from "react";
import { deleteLead } from "@/app/admin/leads/actions";

export function DeleteLeadButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    const ok = window.confirm(
      "Supprimer définitivement ce lead ? Action irréversible.",
    );
    if (!ok) return;
    startTransition(async () => {
      await deleteLead(id);
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="rounded-full border border-red-300 bg-red-50 px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
    >
      {isPending ? "Suppression…" : "Supprimer définitivement"}
    </button>
  );
}
