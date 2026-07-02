"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Bouton suppression d'une vente (avec confirmation). DELETE
// /api/admin/ventes-realisees/[id] puis refresh de la liste.

export function DeleteSaleButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const onDelete = async () => {
    if (!window.confirm(`Supprimer définitivement la vente « ${label} » ? Cette action est irréversible.`)) {
      return;
    }
    setPending(true);
    try {
      const res = await fetch(`/api/admin/ventes-realisees/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const txt = await res.text();
        window.alert(`Échec suppression : HTTP ${res.status} — ${txt}`);
        return;
      }
      router.refresh();
    } catch (e) {
      window.alert(`Échec suppression : ${(e as Error).message}`);
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
      {pending ? "…" : "Suppr."}
    </button>
  );
}
