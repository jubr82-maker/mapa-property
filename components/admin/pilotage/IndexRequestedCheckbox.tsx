"use client";

// Case « Indexation demandee » (nov. 2026). Cochee : la date du jour est
// memorisee et la ligne passe dans « Deja demandees » (page rafraichie par
// l'action). Decochable en cas d'erreur.
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { markIndexRequested } from "@/app/admin/controle-google/actions";

export function IndexRequestedCheckbox({ url, checked, disabled = false }: { url: string; checked: boolean; disabled?: boolean }) {
  const t = useTranslations("admin_controle");
  const [pending, start] = useTransition();
  const [value, setValue] = useState(checked);
  const [error, setError] = useState<string | null>(null);

  const onChange = (next: boolean) => {
    setValue(next);
    setError(null);
    start(async () => {
      const r = await markIndexRequested(url, next);
      if (!r.ok) {
        setValue(!next);
        setError(r.error);
      }
    });
  };

  return (
    <div className="min-w-0">
      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={value}
          disabled={disabled || pending}
          onChange={(e) => onChange(e.currentTarget.checked)}
          className="h-5 w-5 shrink-0 accent-gold"
        />
        <span>{t("requested_label")}</span>
        {pending ? <span className="text-xs text-ink-soft">{t("requested_saving")}</span> : null}
      </label>
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
