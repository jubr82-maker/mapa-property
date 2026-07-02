"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Controle 3 etats de la comparabilite d'une vente (pilote comparable_override,
// la colonne que le moteur EVS lit) :
//   - Auto (comparable_override = NULL) : suit la regle des 12 mois glissants.
//   - Oui  (comparable_override = TRUE)  : forcee comparable (override manuel).
//   - Non  (comparable_override = FALSE) : forcee exclue (override manuel).
// Affiche aussi la comparabilite EFFECTIVE (compte / ignorée) + le mode
// (auto / forcé), pour que Julien voie d'un coup d'oeil l'etat reel.

type Override = boolean | null;

export function ComparableControl({
  id,
  override,
  autoEffective,
}: {
  id: string;
  /** Valeur brute de comparable_override en base (null = auto). */
  override: Override;
  /** Comparabilite auto (date_acte <= 12 mois) — utilisee quand override = null. */
  autoEffective: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState<Override>(override);
  const [pending, setPending] = useState(false);

  const effective = current === null ? autoEffective : current;
  const mode = current === null ? "auto" : "forcé";

  const setOverride = async (value: Override) => {
    if (value === current) return;
    const prev = current;
    setCurrent(value);
    setPending(true);
    try {
      const res = await fetch(`/api/admin/ventes-realisees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comparable_override: value }),
      });
      if (!res.ok) {
        setCurrent(prev);
        const txt = await res.text();
        window.alert(`Échec mise à jour : HTTP ${res.status} — ${txt}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setCurrent(prev);
      window.alert(`Échec mise à jour : ${(e as Error).message}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="inline-flex overflow-hidden rounded border border-[#3D4F63]/30">
        <Seg label="Auto" active={current === null} onClick={() => setOverride(null)} disabled={pending} />
        <Seg label="Oui" active={current === true} onClick={() => setOverride(true)} disabled={pending} />
        <Seg label="Non" active={current === false} onClick={() => setOverride(false)} disabled={pending} />
      </div>
      <span className="font-mono text-[9px] uppercase tracking-[0.1em]">
        {effective ? (
          <span className="text-emerald-700">● Compte</span>
        ) : (
          <span className="text-[#3D4F63]/50">○ Ignorée</span>
        )}
        <span className="text-[#3D4F63]/50"> · {mode}</span>
      </span>
    </div>
  );
}

function Seg({
  label,
  active,
  onClick,
  disabled,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] transition-colors disabled:opacity-50 ${
        active ? "bg-[#3D4F63] text-white" : "bg-white text-[#3D4F63] hover:bg-[#3D4F63]/10"
      }`}
    >
      {label}
    </button>
  );
}
