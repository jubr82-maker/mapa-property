// POL2-7 — Grille de caractéristiques UNIFIÉE.
// SignatureLine cuivre avant ET après la grille. Valeurs absentes
// affichées en "—" (jamais d'omission silencieuse qui casserait
// l'alignement, jamais de crash).
//
// Server Component.

import { SignatureLine } from "@/components/ui/SignatureLine";

export interface SpecItem {
  label: string;
  value: string;
}

export function FicheSpecs({
  heading,
  items,
}: {
  heading: string;
  items: SpecItem[];
}) {
  return (
    <section data-fiche-specs>
      <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
        {heading}
      </h2>
      <SignatureLine width="w-8" />
      <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((s, i) => (
          <div key={i} data-fiche-spec>
            <dt className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
              {s.label}
            </dt>
            <dd className="mt-1 font-display text-2xl font-bold text-ink">
              {s.value || "—"}
            </dd>
          </div>
        ))}
      </dl>
      <SignatureLine width="w-8" className="mt-8" />
    </section>
  );
}
