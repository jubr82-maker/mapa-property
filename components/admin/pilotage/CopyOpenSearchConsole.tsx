"use client";

// Bouton « Copier et ouvrir Search Console » (nov. 2026). Search Console n'a
// pas d'adresse directe vers l'inspection d'une page : le clic copie
// l'adresse complete de la page et ouvre l'accueil de la propriete dans un
// nouvel onglet, ou il suffit de la coller dans la barre du haut.
// C'est un vrai lien (target _blank) : l'ouverture n'est pas bloquee sur
// telephone. Si la copie est refusee, l'adresse s'affiche selectionnee.
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { SEARCH_CONSOLE_HOME } from "@/lib/pilotage/config";
import { copyText, legacyCopyInDocument } from "@/lib/pilotage/copy-address";

export function CopyOpenSearchConsole({ url }: { url: string }) {
  const t = useTranslations("admin_controle");
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const field = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state === "failed") field.current?.select();
  }, [state]);

  const onClick = () => {
    // La copie se fait pendant le clic (geste de l'utilisateur), avant que
    // le lien ouvre le nouvel onglet.
    void copyText(url, {
      clipboard: typeof navigator !== "undefined" ? navigator.clipboard : null,
      legacyCopy: legacyCopyInDocument,
    }).then((ok) => setState(ok ? "copied" : "failed"));
  };

  return (
    <div className="flex min-w-0 flex-col gap-2 sm:items-end">
      <a
        href={SEARCH_CONSOLE_HOME}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-ink/30 px-4 font-mono text-[11px] uppercase tracking-[0.15em] text-ink transition-colors hover:border-gold hover:text-gold"
      >
        {t("submit_button")}
      </a>
      <p role="status" aria-live="polite" className="text-xs text-ink-mid sm:text-right">
        {state === "copied" ? t("submit_copied") : state === "failed" ? t("submit_copy_failed") : null}
      </p>
      {state === "failed" ? (
        <input
          ref={field}
          type="text"
          readOnly
          value={url}
          aria-label={t("submit_copy_field")}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full min-w-0 rounded-md border border-gold bg-bg px-3 py-2 font-mono text-xs text-ink sm:w-80"
        />
      ) : null}
    </div>
  );
}
