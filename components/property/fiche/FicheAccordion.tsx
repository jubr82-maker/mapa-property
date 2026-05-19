"use client";

// POL2-7 / POL3-1 — Accordéon 4 onglets IDENTIQUE partout (biens
// standards + off-market) : Aperçu ("Le brief"), Description,
// Localisation, Conditions de vente (→ "Processus d'accès au dossier" en
// off-market).
//
// POL3-1 : les 4 panneaux sont OUVERTS par défaut. Chaque en-tête est un
// toggle INDÉPENDANT (clic → ferme ce panneau ; re-clic → ré-ouvre).
// L'ouverture/fermeture est animée par un slide max-height 300ms ease
// (le contenu reste monté pour que la transition fonctionne dans les
// deux sens). aria-expanded + aria-controls conservés/ajoutés.

import { useEffect, useRef, useState } from "react";

export interface FichePanel {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function FicheAccordion({ panels }: { panels: FichePanel[] }) {
  // POL3-1 : tous ouverts au premier rendu.
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(panels.map((p) => p.id)),
  );

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div data-fiche-accordion className="divide-y divide-line border-y border-line">
      {panels.map((p) => {
        const isOpen = openIds.has(p.id);
        const panelId = `fiche-panel-${p.id}`;
        const headerId = `fiche-header-${p.id}`;
        return (
          <section key={p.id} data-fiche-panel data-panel-id={p.id}>
            <h2 className="m-0">
              <button
                type="button"
                id={headerId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(p.id)}
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
            <AccordionPanel id={panelId} labelledBy={headerId} open={isOpen}>
              {p.content}
            </AccordionPanel>
          </section>
        );
      })}
    </div>
  );
}

// Conteneur animé : slide max-height 300ms ease. Le contenu reste TOUJOURS
// monté (sinon pas de transition de fermeture). On mesure la hauteur réelle
// du contenu pour animer vers/depuis une max-height précise puis on repasse
// en "none" une fois ouvert (contenu dynamique : pas de clipping).
function AccordionPanel({
  id,
  labelledBy,
  open,
  children,
}: {
  id: string;
  labelledBy: string;
  open: boolean;
  children: React.ReactNode;
}) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  // maxHeight contrôlé : "" (= auto via inline non posé) géré via state.
  const [maxHeight, setMaxHeight] = useState<string>(open ? "none" : "0px");

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const full = el.scrollHeight;
    if (open) {
      // Ouverture : 0 → hauteur réelle, puis "none" en fin de transition
      // pour absorber un contenu dynamique sans clipping.
      setMaxHeight(`${full}px`);
      const t = setTimeout(() => setMaxHeight("none"), 320);
      return () => clearTimeout(t);
    } else {
      // Fermeture : on fige d'abord la hauteur courante puis on tombe à 0.
      setMaxHeight(`${full}px`);
      const r = requestAnimationFrame(() => {
        requestAnimationFrame(() => setMaxHeight("0px"));
      });
      return () => cancelAnimationFrame(r);
    }
  }, [open]);

  return (
    <div
      id={id}
      role="region"
      aria-labelledby={labelledBy}
      aria-hidden={!open}
      data-fiche-panel-shell
      data-open={open}
      style={{
        maxHeight,
        overflow: maxHeight === "none" ? "visible" : "hidden",
        transition: "max-height 300ms ease",
      }}
    >
      <div
        ref={innerRef}
        data-fiche-panel-content
        className="pb-8 pt-1 text-base leading-relaxed text-ink-mid"
      >
        {children}
      </div>
    </div>
  );
}
