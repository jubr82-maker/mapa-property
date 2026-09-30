"use client";

/**
 * CitySuggestInput — mission "saisie et affichage des biens", point 3.
 *
 * Remplace le champ ville en texte libre par un champ a suggestions :
 * la liste se reduit au fil de la frappe, un clic (ou Entree/fleches)
 * choisit une valeur. La saisie libre reste possible et n'est jamais
 * bloquee (obligatoire pour les biens internationaux, hors liste LU).
 *
 * Reste un <input type="text" name={name}> classique cote DOM : la
 * soumission de formulaire native (FormData) n'est pas modifiee, seul
 * l'ajout d'une liste deroulante filtree est nouveau.
 *
 * Source des suggestions : voir le composant appelant (liste passee en
 * prop, jamais generee ici) — cf. rapport de mission pour la provenance.
 */

import { useId, useMemo, useRef, useState } from "react";

function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

const MAX_SUGGESTIONS = 8;

export function CitySuggestInput({
  name,
  defaultValue = "",
  suggestions,
  className = "",
  placeholder,
}: {
  name: string;
  defaultValue?: string;
  /** Liste de communes/localites proposees (deja deduplique, trie). */
  suggestions: string[];
  className?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const q = normalize(value);
    if (!q) return suggestions.slice(0, MAX_SUGGESTIONS);
    return suggestions
      .filter((s) => normalize(s).includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [value, suggestions]);

  function choose(v: string) {
    setValue(v);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        name={name}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delai pour laisser le onMouseDown d'une suggestion s'executer
          // avant la fermeture (sinon le blur ferme la liste en premier).
          blurTimeout.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && matches[highlight]) {
            e.preventDefault();
            choose(matches[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={className}
      />
      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[#3D4F63]/20 bg-white shadow-lg"
        >
          {matches.map((s, i) => (
            <li key={s} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // preventDefault : evite que le input perde le focus
                  // avant que onClick ne se declenche (comportement par
                  // defaut du mousedown sur un bouton hors du champ).
                  e.preventDefault();
                  if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  choose(s);
                }}
                className={`block w-full px-3 py-2 text-left font-mono text-sm ${
                  i === highlight
                    ? "bg-[#F5EFE1] text-[#3D4F63]"
                    : "text-[#1A1F2A] hover:bg-[#F5EFE1]"
                }`}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
