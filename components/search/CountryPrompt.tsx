"use client";

// "Dans quel pays souhaitez-vous chercher ?" (nov. 2026, regle 7) : petite
// fenetre non bloquante, affichee UNIQUEMENT quand une recherche ne donne
// aucun lieu. Les biens du Luxembourg restent affiches dessous ; la fenetre
// se ferme d'un clic (sans choix : on reste sur le Luxembourg d'abord).
// Libelles et adresses prepares par le serveur (aucun texte en dur ici).
import { useState } from "react";
import { Link } from "@/i18n/navigation";

export function CountryPrompt({
  title,
  closeLabel,
  choices,
}: {
  title: string;
  closeLabel: string;
  choices: { label: string; href: string }[];
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="country-prompt-title"
      data-country-prompt
      className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-2xl border border-gold/40 bg-bg p-5 shadow-xl shadow-ink/10 sm:inset-x-auto sm:right-6 sm:bottom-6"
      style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="flex items-start justify-between gap-4">
        <p id="country-prompt-title" className="font-display text-lg font-bold leading-snug text-ink">
          {title}
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={closeLabel}
          className="-mr-1 -mt-1 inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-mid transition-colors hover:border-gold hover:text-gold-text"
        >
          <span aria-hidden>×</span>
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {choices.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 py-2 text-center font-mono text-[11px] uppercase tracking-[0.15em] text-ink transition-colors hover:border-gold hover:text-gold-text"
          >
            {c.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
