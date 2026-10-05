"use client";

// Bouton de suppression definitive RGPD.
// Confirmation native window.confirm() avant l'appel server action.
// La server action deleteMandat fait elle-meme le redirect /admin/mandats.

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteMandat } from "@/app/admin/mandats/actions";

export function DeleteMandatButton({ id }: { id: string }) {
  const t = useTranslations("admin_mandats");
  const [isPending, startTransition] = useTransition();

  const onClick = () => {
    const ok = window.confirm(t("delete_confirm"));
    if (!ok) return;
    startTransition(async () => {
      // deleteMandat termine par un redirect : pas de retour normal a traiter.
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
      {isPending ? t("deleting") : t("delete_button")}
    </button>
  );
}
