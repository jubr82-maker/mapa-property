"use client";

// Bouton de suppression definitive RGPD pour
// les leads (miroir de DeleteMandatButton). Confirmation native
// window.confirm() avant l'appel server action. La server action deleteLead
// fait elle-meme le redirect /admin/leads.
//
// Effet de bord FK : si ce lead a deja ete converti en mandat, le mandat
// survit avec lead_id = NULL (ON DELETE SET NULL cote mandats_lead_id_fkey).

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteLead } from "@/app/admin/leads/actions";

export function DeleteLeadButton({ id }: { id: string }) {
  const t = useTranslations("admin_leads");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const tn = useTranslations("admin_notices");

  const onClick = () => {
    const ok = window.confirm(t("delete_confirm"));
    if (!ok) return;
    setError(null);
    // Succes : redirection vers la liste ; echec : motif reel affiche.
    startTransition(async () => {
      try {
        const r = await deleteLead(id);
        if (!r.ok) setError(r.error);
      } catch (e) {
        if ((e as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) throw e;
        setError(tn("err_network"));
      }
    });
  };

  return (
    <div>
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      className="rounded-full border border-red-300 bg-red-50 px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50"
    >
      {isPending ? t("deleting") : t("delete_button")}
    </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
