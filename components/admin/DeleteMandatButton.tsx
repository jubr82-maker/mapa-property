"use client";

// Bouton de suppression definitive RGPD.
// Confirmation native window.confirm() avant l'appel server action.
// La server action deleteMandat fait elle-meme le redirect /admin/mandats.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteMandat } from "@/app/admin/mandats/actions";

export function DeleteMandatButton({ id }: { id: string }) {
  const t = useTranslations("admin_mandats");
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
        const r = await deleteMandat(id);
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
