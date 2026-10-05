"use client";

// Mesure PageSpeed a la demande (action admin, garde aal2, 10 minutes
// minimum entre deux mesures). Jamais declenchee a l'ouverture de la page.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { runPerformanceNowAction } from "@/app/admin/pilotage-actions";

export function RunPerformanceButton() {
  const t = useTranslations("admin_pilotage");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = () =>
    start(async () => {
      setMsg(null);
      const r = await runPerformanceNowAction();
      setMsg(r.ok ? t("psi_run_done", { detail: r.detail }) : t(`psi_run_${r.error}`));
      router.refresh();
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="rounded-md bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? t("psi_running") : t("psi_run")}
      </button>
      {msg ? <p role="status" className="text-sm text-ink-mid">{msg}</p> : null}
    </div>
  );
}
