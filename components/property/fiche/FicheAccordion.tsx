"use client";

// POL2-7 — Accordéon 4 onglets IDENTIQUE partout (biens standards +
// off-market) : Aperçu ("Le brief"), Description, Localisation,
// Conditions de vente (→ "Processus d'accès au dossier" en off-market).
//
// Structure stable : 4 panneaux, le 1er ouvert par défaut, chevron
// cuivre, transitions sobres (pas d'animation tape-à-l'œil). Le contenu
// de chaque panneau est fourni par l'appelant (ReactNode) → la coquille
// reste strictement identique sur les deux types de fiche.

import { useState } from "react";

export interface FichePanel {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function FicheAccordion({ panels }: { panels: FichePanel[] }) {
  const [open, setOpen] = useState<string>(panels[0]?.id ?? "");

  return (
    <div data-fiche-accordion className="divide-y divide-line border-y border-line">
      {panels.map((p) => {
        const isOpen = open === p.id;
        return (
          <section key={p.id} data-fiche-panel data-panel-id={p.id}>
            <h2 className="m-0">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? "" : p.id)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="font-mono text-xs uppercase tracking-[0.3em] text-ink">
                  {p.label}
                </span>
                <span
                  aria-hidden
                  className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-[#B8865A]/40 text-[#B8865A] transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
            </h2>
            {isOpen && (
              <div
                data-fiche-panel-content
                className="pb-8 pt-1 text-base leading-relaxed text-ink-mid"
              >
                {p.content}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
