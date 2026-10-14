"use client";

// Sauvegarde a la demande (action admin, garde aal2, 5 minutes minimum
// entre deux sauvegardes). Jamais declenchee a l'ouverture de la page.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { runBackupNowAction } from "@/app/admin/pilotage-actions";
import { BACKUP_MANUAL_COOLDOWN_MINUTES } from "@/lib/pilotage/config";

export function RunBackupButton() {
  const t = useTranslations("admin_pilotage");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const run = () =>
    start(async () => {
      setMsg(null);
      const r = await runBackupNowAction();
      if (r.ok) setMsg({ ok: true, text: t("backup_run_done", { detail: r.detail }) });
      else if (r.error === "cooldown") setMsg({ ok: false, text: t("backup_run_cooldown", { minutes: BACKUP_MANUAL_COOLDOWN_MINUTES }) });
      else setMsg({ ok: false, text: t("backup_run_failed", { detail: r.detail ?? "" }) });
      router.refresh();
    });

  return (
    <div className="space-y-2" data-backup-run>
      <p className="text-sm text-ink-mid">{t("backup_run_intro")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="rounded-md bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-bg transition-opacity hover:opacity-90 disabled:opacity-75"
        >
          {pending ? t("backup_running") : t("backup_run")}
        </button>
        {msg ? (
          <p role="status" className={`break-all text-sm ${msg.ok ? "text-ink-mid" : "text-ink"}`}>
            {msg.text}
          </p>
        ) : null}
      </div>
    </div>
  );
}
