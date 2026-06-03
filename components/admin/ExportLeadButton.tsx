"use client";

// Sprint Export RGPD — bouton de telechargement JSON des donnees d'un
// lead (et de son mandat associe eventuel). Action NON destructive,
// pas de feedback de longue duree : on declenche le download navigateur
// et c'est tout. Erreur silencieuse + message discret si l'action server
// remonte un probleme.

import { useState, useTransition } from "react";
import { exportLead } from "@/app/admin/leads/actions";
import { downloadJson } from "@/lib/admin/download";

export function ExportLeadButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onClick = () => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await exportLead(id);
        if (!res.ok) {
          setError(
            res.error === "not_found"
              ? "Lead introuvable."
              : "Erreur d'export. Réessaie.",
          );
          return;
        }
        downloadJson(res.filename, res.data);
      } catch (e) {
        setError((e as Error).message || "Erreur inattendue.");
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
        {isPending ? "Préparation…" : "Exporter les données (RGPD)"}
      </button>
      {error && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs text-red-900">
          {error}
        </p>
      )}
    </div>
  );
}
