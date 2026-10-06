"use client";

// Export RGPD : bouton de telechargement JSON des donnees d'un
// mandat. Le mandat contient deja client_* : pas besoin d'embarquer le
// lead d'origine, juste lead_id pour reference. Action NON destructive.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { exportMandat } from "@/app/admin/mandats/actions";
import { downloadJson } from "@/lib/admin/download";

export function ExportMandatButton({ id }: { id: string }) {
  const t = useTranslations("admin_mandats");
  const tn = useTranslations("admin_notices");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await exportMandat(id);
        if (!res.ok) {
          setError(
            res.error === "not_found" ? t("export_not_found") : res.error === "unauthorized" ? tn("err_session") : res.error,
          );
          return;
        }
        downloadJson(res.filename, res.data);
      } catch {
        setError(tn("err_network"));
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={isPending}
        className="self-start rounded-full border border-[#3D4F63]/30 bg-white px-5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#3D4F63] transition-colors hover:border-[#e0af6e] hover:text-[#9E7B2A] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? t("export_preparing") : t("export_button")}
      </button>
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-900">
          {error}
        </p>
      )}
    </div>
  );
}
