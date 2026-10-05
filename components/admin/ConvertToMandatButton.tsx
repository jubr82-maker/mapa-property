"use client";

// Bouton de conversion en mandat sur la fiche
// lead (/admin/leads/[id]). Toujours visible, manuel. Anti-doublon delegue
// a la server action convertLeadToMandat : si un mandat existe deja pour
// ce lead_id, on affiche un lien vers le mandat existant au lieu de creer
// un doublon.

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { convertLeadToMandat } from "@/app/admin/leads/actions";

type Status =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "success"; mandatId: string }
  | { kind: "already_existed"; mandatId: string }
  | { kind: "error"; message: string };

export function ConvertToMandatButton({ leadId }: { leadId: string }) {
  const t = useTranslations("admin_leads");
  const [isPending, startTransition] = useTransition();

  // Codes d'erreur renvoyes par convertLeadToMandat, traduits a l'ecran.
  const errorMessage = (code: string) =>
    code === "unauthorized"
      ? t("error_unauthorized")
      : code === "lead_not_found"
        ? t("error_lead_not_found")
        : t("error_generic");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const onClick = () => {
    setStatus({ kind: "pending" });
    startTransition(async () => {
      try {
        const res = await convertLeadToMandat(leadId);
        if (!res.ok) {
          setStatus({ kind: "error", message: errorMessage(res.error) });
          return;
        }
        setStatus(
          res.alreadyExisted
            ? { kind: "already_existed", mandatId: res.mandatId }
            : { kind: "success", mandatId: res.mandatId },
        );
      } catch (e) {
        console.error("[ConvertToMandatButton]", e);
        setStatus({ kind: "error", message: t("error_generic") });
      }
    });
  };

  return (
    <div className="space-y-3 rounded-xl border border-[#3D4F63]/15 bg-white p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[#3D4F63]/60">
        {t("convert_title")}
      </p>
      <button
        type="button"
        onClick={onClick}
        disabled={isPending || status.kind === "pending"}
        className="w-full rounded-full bg-[#9E7B2A] px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition-colors hover:bg-[#e0af6e] disabled:opacity-50"
      >
        {status.kind === "pending" ? t("converting") : t("convert_button")}
      </button>
      {status.kind === "success" && (
        <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {t("convert_success")}{" "}
          <Link
            href={`/admin/mandats/${status.mandatId}`}
            className="font-medium underline hover:text-emerald-700"
          >
            {t("view_mandat")}
          </Link>
        </p>
      )}
      {status.kind === "already_existed" && (
        <p className="rounded-md border border-[#e0af6e]/40 bg-[#e0af6e]/10 px-3 py-2 text-xs text-[#1A1F2A]">
          {t("convert_exists")}{" "}
          <Link
            href={`/admin/mandats/${status.mandatId}`}
            className="font-medium underline hover:text-[#9E7B2A]"
          >
            {t("view_mandat")}
          </Link>
        </p>
      )}
      {status.kind === "error" && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-900">
          {status.message}
        </p>
      )}
    </div>
  );
}
