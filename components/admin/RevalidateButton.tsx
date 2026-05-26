"use client";

// Sprint OPTIM-1A — Bouton 'Forcer le refresh' pour le BO admin.
//
// Consomme POST /api/admin/revalidate avec { path }. Affiche un feedback
// inline : idle -> running -> ok | err. Reset auto apres 4s sur ok pour
// permettre des refresh enchaines sans rechargement de page.

import { useState } from "react";

type Status = "idle" | "running" | "ok" | "err";

export function RevalidateButton({
  path,
  label = "Forcer le refresh",
}: {
  path: string;
  label?: string;
}) {
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
        setErrorMsg(j.error ?? `HTTP ${res.status}`);
        setStatus("err");
        return;
      }
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 4000);
    } catch (e) {
      setErrorMsg((e as Error).message);
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
        {status === "running" ? "Refresh en cours…" : label}
      </button>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">
        {path}
      </span>
      {status === "ok" && (
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-700">
          Refresh OK ✓
        </span>
      )}
      {status === "err" && (
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-red-700">
          {errorMsg ?? "Erreur"}
        </span>
      )}
    </div>
  );
}
