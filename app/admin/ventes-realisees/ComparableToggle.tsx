"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Case a cocher "prise en compte comme comparable". Bascule use_as_comparable
// via PATCH /api/admin/ventes-realisees/[id]. Optimiste : on met a jour l'UI
// immediatement, on rollback si l'API echoue.

export function ComparableToggle({ id, initial }: { id: string; initial: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState(initial);
  const [pending, setPending] = useState(false);

  const onToggle = async () => {
    const next = !checked;
    setChecked(next);
    setPending(true);
    try {
      const res = await fetch(`/api/admin/ventes-realisees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ use_as_comparable: next }),
      });
      if (!res.ok) {
        setChecked(!next); // rollback
        const txt = await res.text();
        window.alert(`Échec mise à jour comparable : HTTP ${res.status} — ${txt}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setChecked(!next); // rollback
      window.alert(`Échec mise à jour comparable : ${(e as Error).message}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <label className="inline-flex cursor-pointer items-center gap-1.5" title="Prise en compte comme comparable dans le moteur EVS">
      <input
        type="checkbox"
        checked={checked}
        disabled={pending}
        onChange={onToggle}
        className="h-3.5 w-3.5 accent-[#9E7B2A]"
      />
      <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#3D4F63]/60">
        {checked ? "Oui" : "Non"}
      </span>
    </label>
  );
}
