// POL2-7 — Contenu de l'onglet "Conditions de vente" (→ "Processus
// d'accès au dossier" en off-market). Le plan de financement
// (AcquisitionSimulator) est DÉPLACÉ ici depuis la colonne droite.
//
// Server Component. Le simulateur (client) est injecté en `financing`
// (null en off-market / location / pays non couvert).

import { SignatureLine } from "@/components/ui/SignatureLine";
import type { ReactNode } from "react";

export function FicheConditions({
  variant,
  labels,
  financing,
}: {
  variant: "standard" | "offmarket";
  labels: {
    financing: string;
    fees: string;
    feesText: string;
    process: string;
    processText: string;
    offmarketText: string;
  };
  /** AcquisitionSimulator (client) — optionnel. */
  financing?: ReactNode;
}) {
  if (variant === "offmarket") {
    return (
      <div data-fiche-conditions className="space-y-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
            {labels.process}
          </p>
          <SignatureLine width="w-8" />
          <p className="text-sm leading-relaxed text-ink-mid">
            {labels.offmarketText}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div data-fiche-conditions className="space-y-8">
      {financing && (
        <div data-fiche-financing>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
            {labels.financing}
          </p>
          <SignatureLine width="w-8" />
          {financing}
        </div>
      )}

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          {labels.fees}
        </p>
        <SignatureLine width="w-8" />
        <p className="text-sm leading-relaxed text-ink-mid">
          {labels.feesText}
        </p>
      </div>

      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          {labels.process}
        </p>
        <SignatureLine width="w-8" />
        <p className="text-sm leading-relaxed text-ink-mid">
          {labels.processText}
        </p>
      </div>
    </div>
  );
}
