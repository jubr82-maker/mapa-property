"use client";

// Bouton de mise a jour manuelle d'une fiche publique (admin).
//
// Consomme POST /api/admin/revalidate avec { path }. Affiche un feedback
// inline : idle -> running -> ok | err. Reset auto apres 4s sur ok pour
// permettre des refresh enchaines sans rechargement de page.

import { useState } from "react";
import { useTranslations } from "next-intl";

type Status = "idle" | "running" | "ok" | "err";

export function RevalidateButton({
  path,
  label,
}: {
  path: string;
  label?: string;
}) {
  const t = useTranslations("admin_properties");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const onClick = async () => {
    setStatus("running");
    setErrorMsg(null);
    try {
      const res = await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        // Codes d'erreur de la route traduits a l'affichage.
        setErrorMsg(
          j.error && t.has(`err_code_${j.error}`)
            ? t(`err_code_${j.error}`)
            : t("refresh_failed", { status: res.status }),
        );
        setStatus("err");
        return;
      }
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setErrorMsg(t("err_network_unknown"));
      setStatus("err");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onClick}
        disabled={status === "running"}
        className="rounded-full border border-[#3D4F63]/30 px-5 py-2 font-mono text-xs uppercase tracking-[0.2em] text-[#3D4F63] hover:border-[#e0af6e] hover:text-[#e0af6e] disabled:opacity-50"
      >
        {status === "running" ? t("refresh_running") : (label ?? t("refresh_label"))}
      </button>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        {path}
      </span>
      {status === "ok" && (
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-700">
          {t("refresh_ok")}
        </span>
      )}
      {status === "err" && (
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-red-700">
          {errorMsg}
        </span>
      )}
    </div>
  );
}
