"use client";

// Controle du site puis de Google a la demande (nov. 2026). Chaque appel
// avance le passage d'environ 45 secondes ; le bouton relance jusqu'a la
// fin et affiche la progression. Message clair si un controle tourne deja.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { runControleStepAction, type ControleActionResult } from "@/app/admin/pilotage-actions";

const MAX_CALLS = 60;

export function RunControleButton() {
  const t = useTranslations("admin_controle");
  const router = useRouter();
  const [pending, start] = useTransition();
  const [progress, setProgress] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const run = () =>
    start(async () => {
      setMsg(null);
      let last: ControleActionResult = { ok: false, detail: "failed" };
      for (const kind of ["site", "google"] as const) {
        for (let n = 0; n < MAX_CALLS; n++) {
          // Un passage en pause (tache de la nuit ou clic precedent) est
          // repris, jamais recommence ; sinon un nouveau passage demarre.
          last = await runControleStepAction(kind, n === 0);
          if (last.progress) setProgress(t(kind === "site" ? "progress_site" : "progress_google", last.progress));
          if (last.detail !== "paused") break;
        }
        if (last.detail !== "done") break;
      }
      setProgress(null);
      setMsg(t(`result_${["done", "busy", "db_not_ready", "no_key", "quota"].includes(last.detail) ? last.detail : "failed"}`));
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="min-h-11 rounded-md bg-ink px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? t("running") : t("run_button")}
      </button>
      <p role="status" aria-live="polite" className="text-sm text-ink-mid">
        {pending ? progress : msg}
      </p>
    </div>
  );
}
