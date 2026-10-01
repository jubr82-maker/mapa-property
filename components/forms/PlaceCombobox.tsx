"use client";

// Champ unique de localisation (oct. 2026) : localites, communes et quartiers
// du Registre national des localites et des rues, melanges dans une seule
// liste. Remplace l'ancien trio recherche + commune de rattachement + code
// postal, et l'element <datalist> (rendu natif illisible en theme sombre).
//
// - Au clic, la liste complete s'ouvre et se fait defiler ; la saisie filtre.
// - Recherche insensible aux accents, a la casse et aux tirets ; accepte les
//   graphies luxembourgeoises et allemandes (cles fournies par le serveur).
// - Clavier : fleches, Entree, Echap, Debut/Fin. Pattern ARIA combobox.
// - Performance : liste FENETREE (seules les lignes visibles sont rendues,
//   environ 20 noeuds au lieu de 700) ; normalisation des cles faite une
//   seule fois (useMemo), filtrage en une passe lineaire par frappe.
// - Couleurs : variables du systeme de design uniquement (bg, ink, ink-mid,
//   bg-deep, line-strong) ; contrastes >= 6,4:1 dans les deux themes.

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface ComboboxPlace {
  name: string;
  commune: string;
  quartier?: string;
  attached: boolean;
  keys: string[];
}

/** Meme normalisation que le serveur (lib/estimation/coverage.ts). */
export function normalizePlace(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[-_'’./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Libelle affiche : une localite indique sa commune ("Hagen (Steinfort)"),
 * une commune s'affiche seule. Les homonymes portent deja leur commune dans
 * le nom ("Erpeldange (Wiltz)").
 */
export function placeLabel(p: ComboboxPlace): string {
  if (p.name.includes("(")) return p.name;
  if (p.name === p.commune) return p.name;
  return `${p.name} (${p.commune})`;
}

const ROW_HEIGHT = 44; // cible tactile minimale
const LIST_HEIGHT = 320;
const OVERSCAN = 6;

export interface PlaceEntry {
  place: ComboboxPlace;
  label: string;
  haystack: string[];
}

/** Entrees triees par libelle, cles normalisees une seule fois. */
export function buildPlaceEntries(places: ComboboxPlace[]): PlaceEntry[] {
  return places
    .map((place) => {
      const label = placeLabel(place);
      return { place, label, haystack: [...place.keys, normalizePlace(label)] };
    })
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

/**
 * Filtre (une passe lineaire) : texte vide = liste complete ; sinon les
 * entrees dont une graphie COMMENCE par la saisie, puis celles qui la
 * CONTIENNENT (ex. "steinfort" remonte aussi Hagen (Steinfort)).
 */
export function filterPlaceEntries(entries: PlaceEntry[], text: string): PlaceEntry[] {
  const q = normalizePlace(text);
  if (!q) return entries;
  const starts: PlaceEntry[] = [];
  const contains: PlaceEntry[] = [];
  for (const e of entries) {
    if (e.haystack.some((k) => k.startsWith(q))) starts.push(e);
    else if (e.haystack.some((k) => k.includes(q))) contains.push(e);
  }
  return starts.concat(contains);
}

export function PlaceCombobox({
  places,
  value,
  onSelect,
  label,
  placeholder,
  noResultText,
  listLabel,
  autoFocus = false,
}: {
  places: ComboboxPlace[];
  /** Lieu selectionne (null = aucune selection). */
  value: ComboboxPlace | null;
  onSelect: (place: ComboboxPlace | null) => void;
  label: string;
  placeholder: string;
  noResultText: string;
  listLabel: string;
  /** Focus et ouverture au montage (bouton "Modifier"). */
  autoFocus?: boolean;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value ? placeLabel(value) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  // Normalisation et tri une seule fois par liste de lieux.
  const entries = useMemo(() => buildPlaceEntries(places), [places]);

  // Texte affiche = libelle du lieu selectionne : pas de filtre actif.
  const filterText = value && query === placeLabel(value) ? "" : query;
  const results = useMemo(
    () => filterPlaceEntries(entries, filterText),
    [entries, filterText],
  );

  useEffect(() => {
    if (!autoFocus) return;
    inputRef.current?.focus();
    setOpen(true);
  }, [autoFocus]);

  // Fermeture au clic ou au toucher hors du composant.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const openList = () => {
    setOpen(true);
    setActive(0);
    setScrollTop(0);
    if (listRef.current) listRef.current.scrollTop = 0;
  };

  const ensureVisible = (index: number) => {
    const el = listRef.current;
    if (!el) return;
    const top = index * ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_HEIGHT > el.scrollTop + LIST_HEIGHT) {
      el.scrollTop = top + ROW_HEIGHT - LIST_HEIGHT;
    }
    setScrollTop(el.scrollTop);
  };

  const choose = (e: PlaceEntry) => {
    onSelect(e.place);
    setQuery(e.label);
    setOpen(false);
  };

  const onKeyDown = (ev: React.KeyboardEvent<HTMLInputElement>) => {
    if (ev.key === "Escape") {
      if (open) {
        ev.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (ev.key === "Tab") {
      setOpen(false);
      return;
    }
    const last = results.length - 1;
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      if (!open) {
        openList();
        return;
      }
      const next =
        ev.key === "ArrowDown" ? Math.min(active + 1, last) : Math.max(active - 1, 0);
      setActive(next);
      ensureVisible(next);
      return;
    }
    if (open && (ev.key === "Home" || ev.key === "End")) {
      ev.preventDefault();
      const next = ev.key === "Home" ? 0 : last;
      setActive(next);
      ensureVisible(next);
      return;
    }
    if (ev.key === "Enter" && open && results[active]) {
      ev.preventDefault();
      choose(results[active]);
    }
  };

  // Fenetrage : seules les lignes visibles (plus une marge) sont rendues.
  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const lastVisible = Math.min(
    results.length,
    Math.ceil((scrollTop + LIST_HEIGHT) / ROW_HEIGHT) + OVERSCAN,
  );
  const visible = results.slice(first, lastVisible);
  const optionId = (i: number) => `${id}-opt-${i}`;

  return (
    <div ref={wrapRef} className="relative">
      <label
        htmlFor={`${id}-input`}
        className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft"
      >
        {label}
      </label>
      <input
        ref={inputRef}
        id={`${id}-input`}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && results[active] ? optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value) onSelect(null);
          setOpen(true);
          setActive(0);
          setScrollTop(0);
          if (listRef.current) listRef.current.scrollTop = 0;
        }}
        onClick={() => {
          if (!open) openList();
        }}
        onKeyDown={onKeyDown}
        className="mt-1.5 w-full rounded-md border border-line-strong bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-mid focus:border-ink focus:outline-none"
      />
      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={listLabel}
          onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
          className="absolute left-0 right-0 z-30 mt-1 overflow-y-auto overscroll-contain rounded-md border border-line-strong bg-bg text-ink shadow-lg"
          style={{ maxHeight: LIST_HEIGHT }}
        >
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-mid">{noResultText}</p>
          ) : (
            <div style={{ height: results.length * ROW_HEIGHT, position: "relative" }}>
              {visible.map((e, i) => {
                const index = first + i;
                const isActive = index === active;
                const isSelected = value?.name === e.place.name;
                return (
                  <div
                    key={e.place.name}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    // mousedown : garde le focus dans le champ ; le choix se
                    // fait au click (un defilement au doigt ne selectionne pas).
                    onMouseDown={(ev) => ev.preventDefault()}
                    onClick={() => choose(e)}
                    onMouseMove={() => {
                      if (active !== index) setActive(index);
                    }}
                    className={`absolute left-0 right-0 flex cursor-pointer items-center px-4 text-sm ${
                      isActive ? "bg-ink text-bg" : "text-ink hover:bg-bg-deep"
                    }`}
                    style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                  >
                    <span className="truncate">{e.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
