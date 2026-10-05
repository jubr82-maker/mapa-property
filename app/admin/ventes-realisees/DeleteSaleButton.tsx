"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// Bouton suppression d'une vente (avec confirmation). DELETE
// /api/admin/ventes-realisees/[id] puis refresh de la liste.

// Raison lisible à partir du code d'erreur renvoyé par l'API.
async function errorReason(
  res: Response,
  t: ReturnType<typeof useTranslations<"admin_sales">>,
): Promise<string> {
  const code = await res
    .json()
    .then((j: { error?: string }) => j?.error ?? "")
    .catch(() => "");
  if (res.status === 401 || res.status === 403) return t("errors.session");
  if (code === "missing_or_invalid_fields" || code === "invalid") return t("errors.invalidFields");
  return t("errors.server");
}

export function DeleteSaleButton({ id, label }: { id: string; label: string }) {
  const t = useTranslations("admin_sales");
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onDelete = async () => {
    if (!window.confirm(t("delete.confirm", { label }))) {
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/admin/ventes-realisees/${id}`, { method: "DELETE" });
      if (!res.ok) {
        window.alert(t("delete.failed", { reason: await errorReason(res, t) }));
        return;
      }
      router.refresh();
    } catch (e) {
      window.alert(t("delete.failed", { reason: t("errors.network") }));
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={pending}
      className="rounded border border-red-300 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "…" : t("delete.button")}
    </button>
  );
}
