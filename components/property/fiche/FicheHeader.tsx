// POL2-7 — En-tête de fiche UNIFIÉ (biens standards + off-market).
// Référence éditoriale sobre (magrey.com) : ← Retour à gauche, actions
// (favoris / cœur) à droite, eyebrow "LU · VILLE" ou "OFF-MARKET · REF …",
// H1, prix cuivre OU "Prix sur demande" (POL2-9), méta
// TYPE · NEUF/ANCIEN · VENTE/LOCATION, boutons CTA, puis SignatureLine
// cuivre 32px sous le H1.
//
// Server Component : aucun hook. Les éléments interactifs (BackButton,
// actions favoris, CTA scroll) sont passés en `back` / `actions` /
// `ctas` (déjà rendus par l'appelant — client components).

import { SignatureLine } from "@/components/ui/SignatureLine";
import type { ReactNode } from "react";

export function FicheHeader({
  back,
  actions,
  eyebrow,
  title,
  price,
  meta,
  ctas,
}: {
  /** Élément "← Retour" (client). */
  back: ReactNode;
  /** Favoris / actions (client). */
  actions: ReactNode;
  /** Segments d'eyebrow déjà résolus (ex: ["LU","Steinfort"] ou
   *  ["OFF-MARKET","REF MAPA-…"]). Le premier après le pays est mis en
   *  cuivre. */
  eyebrow: { lead: string[]; accent?: string | null };
  title: string;
  /** Prix déjà rendu (formaté ou composant PropertyPrice). */
  price: ReactNode;
  /** Méta secondaires (TYPE · NEUF/ANCIEN · VENTE/LOCATION) déjà jointes. */
  meta?: string | null;
  /** Boutons CTA (client) — optionnel (off-market n'en a pas en header). */
  ctas?: ReactNode;
}) {
  return (
    <>
      <div
        data-fiche-topbar
        className="mb-6 flex items-center justify-between gap-4 print:hidden"
      >
        {back}
        {actions}
      </div>

      <header data-fiche-header className="mb-10">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
          {eyebrow.lead.filter(Boolean).map((seg, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden>·</span>}
              {seg}
            </span>
          ))}
          {eyebrow.accent && (
            <span className="flex items-center gap-2">
              <span aria-hidden>·</span>
              <span className="text-gold-deep">{eyebrow.accent}</span>
            </span>
          )}
        </p>

        <h1 className="mt-3 t-h1">{title || "—"}</h1>

        <SignatureLine width="w-8" />

        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <span
            data-fiche-price
            className="font-display text-3xl font-black tracking-tight text-[#e0af6e] sm:text-4xl"
          >
            {price}
          </span>
          {meta && (
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
              {meta}
            </span>
          )}
        </div>

        {ctas && (
          <div className="mt-6 flex flex-wrap gap-3 print:hidden">{ctas}</div>
        )}
      </header>
    </>
  );
}
