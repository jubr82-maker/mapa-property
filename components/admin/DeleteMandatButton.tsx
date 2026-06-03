"use client";

// Sprint MANDATS-A PARTIE 6 — bouton de suppression definitive RGPD.
// Confirmation native window.confirm() avant l'appel server action.
// La server action deleteMandat fait elle-meme le redirect /admin/mandats.

import { useTransition } from "react";
import { deleteMandat } from "@/app/admin/mandats/actions";

export function DeleteMandatButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    const ok = window.confirm(
      "Supprimer définitivement ce mandat ? Action irréversible.",
    );
    if (!ok) return;
    startTransition(async () => {
      // deleteMandat throw via redirect — pas de retour normal a traiter.
      await deleteMandat(id);
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
