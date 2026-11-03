"use client";

/**
 * Champ ville du Luxembourg (nov. 2026), partage par l'admin (biens,
 * ventes realisees : LuLocalityCombobox) et les 5 formulaires de mandat
 * (LuLocalityField). Liste FERMEE des localites officielles (registre
 * CACLR) et des quartiers de la Ville, recue en prop.
 *
 * - Le champ affiche est un BOUTON (localite choisie, ou "Choisir une
 *   localite") : aucun champ texte a remplir, donc rien que Safari puisse
 *   prendre pour une adresse a completer automatiquement.
 * - Au clic ou au toucher, un panneau s'ouvre : case de recherche (nom et
 *   identifiant neutres, sans saisie automatique) et liste COMPLETE par
 *   ordre alphabetique, filtree a la frappe sans accents ni majuscules.
 * - Clavier : fleches, Entree, Echap. Clic en dehors : fermeture.
 * - Aucun champ envoye par ce composant : chaque formulaire envoie la
 *   localite choisie comme avant (onChange).
 */

import { useEffect, useId, useMemo, useReducer, useRef } from "react";
import { filterLuPlaces, sameLuPlace, type LuPlace } from "@/lib/geo/lu-place-match";
import { initialPicker, pickerReducer } from "@/lib/geo/lu-locality-picker";

/** Nom de la case de recherche : ni city, ville, locality, address ni adresse. */
export const LU_PICKER_SEARCH_NAME = "mapa-recherche-lieu";

export type LuPickerTexts = {
  /** Bouton sans localite choisie. */
  choose: string;
  /** Case de recherche (indication et nom accessible). */
  search: string;
  /** Nom accessible de la liste. */
  list: string;
  noMatch: string;
};

const TONES = {
  admin: {
    placeholder: "text-[#3D4F63]/50",
    panel: "rounded-md border border-[#3D4F63]/20 bg-white shadow-lg",
    search: "w-full rounded border border-[#3D4F63]/30 bg-white px-3 py-1.5 text-sm focus:border-[#9E7B2A] focus:outline-none",
    option: "cursor-pointer px-3 py-2 font-mono text-sm",
    active: "bg-[#F5EFE1] text-[#3D4F63]",
    idle: "text-[#1A1F2A]",
    noMatch: "px-3 py-2 text-xs text-[#3D4F63]/60",
  },
  site: {
    placeholder: "text-ink-soft",
    panel: "rounded-md border border-line-strong bg-bg text-ink shadow-lg",
    search: "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none",
    option: "cursor-pointer px-4 py-2.5 text-sm",
    active: "bg-ink text-bg",
    idle: "text-ink",
    noMatch: "px-4 py-3 text-sm text-ink-mid",
  },
} as const;

export type LuPickerTone = keyof typeof TONES;

export function LuLocalityPicker({
  places,
  value,
  onChange,
  optionLabel,
  texts,
  tone,
  triggerClassName,
  required = false,
}: {
  places: LuPlace[];
  /** Localite choisie, ou null. */
  value: LuPlace | null;
  onChange: (place: LuPlace) => void;
  optionLabel: (place: LuPlace) => string;
  texts: LuPickerTexts;
  tone: LuPickerTone;
  /** Classes du bouton : celles des autres champs du formulaire. */
  triggerClassName: string;
  required?: boolean;
}) {
  const [state, dispatch] = useReducer(pickerReducer, initialPicker);
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const listId = `mapa-liste-lieux-${uid}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // Ouverture au doigt : pas de focus sur la case (le clavier du telephone
  // masquerait la liste) ; on peut taper apres avoir touche la case.
  const touchRef = useRef(false);

  const items = useMemo(() => (state.open ? filterLuPlaces(places, state.query) : []), [state.open, state.query, places]);

  const openPanel = () => {
    const index = value ? filterLuPlaces(places, "").findIndex((p) => sameLuPlace(p, value)) : 0;
    dispatch({ type: "open", active: index });
  };
  const close = (focusTrigger: boolean) => {
    dispatch({ type: "close" });
    if (focusTrigger) triggerRef.current?.focus();
  };
  const choose = (p: LuPlace) => {
    onChange(p);
    close(true);
  };

  useEffect(() => {
    if (state.open && !touchRef.current) searchRef.current?.focus();
  }, [state.open]);

  // Option active toujours visible dans la liste (sans faire defiler la page).
  useEffect(() => {
    const list = listRef.current;
    const el = list?.children[state.active] as HTMLElement | undefined;
    if (!list || !el) return;
    if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop;
    else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight;
  }, [state.open, state.active, items]);

  useEffect(() => {
    if (!state.open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) dispatch({ type: "close" });
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [state.open]);

  const t = TONES[tone];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={state.open}
        aria-controls={listId}
        aria-required={required || undefined}
        onPointerDown={(e) => {
          touchRef.current = e.pointerType === "touch";
        }}
        onClick={() => (state.open ? close(false) : openPanel())}
        onKeyDown={(e) => {
          if (!state.open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            touchRef.current = false;
            openPanel();
          } else if (state.open && e.key === "Escape") {
            e.preventDefault();
            close(true);
          }
        }}
        className={`${triggerClassName} flex items-center justify-between gap-2 text-left`}
        data-lu-locality-trigger
      >
        <span className={`truncate ${value ? "" : t.placeholder}`}>{value ? optionLabel(value) : texts.choose}</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={`h-4 w-4 shrink-0 transition-transform ${state.open ? "rotate-180" : ""}`}>
          <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {state.open && (
        <LuLocalityPanel
          listId={listId}
          searchId={`${LU_PICKER_SEARCH_NAME}-${uid}`}
          items={items}
          value={value}
          active={state.active}
          query={state.query}
          optionLabel={optionLabel}
          texts={texts}
          tone={tone}
          searchRef={searchRef}
          listRef={listRef}
          onQuery={(query) => dispatch({ type: "query", query })}
          onActive={(index) => dispatch({ type: "set_active", index })}
          onChoose={choose}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              dispatch({ type: "move", delta: e.key === "ArrowDown" ? 1 : -1, count: items.length });
            } else if (e.key === "Enter") {
              // Jamais d'envoi du formulaire depuis la case de recherche.
              e.preventDefault();
              if (items[state.active]) choose(items[state.active]);
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              close(true);
            } else if (e.key === "Tab") {
              close(false);
            }
          }}
        />
      )}
    </div>
  );
}

/** Panneau ouvert : case de recherche et liste (rendu seul, sans etat). */
export function LuLocalityPanel({
  listId,
  searchId,
  items,
  value,
  active,
  query,
  optionLabel,
  texts,
  tone,
  searchRef,
  listRef,
  onQuery,
  onActive,
  onChoose,
  onKeyDown,
}: {
  listId: string;
  searchId: string;
  items: LuPlace[];
  value: LuPlace | null;
  active: number;
  query: string;
  optionLabel: (place: LuPlace) => string;
  texts: LuPickerTexts;
  tone: LuPickerTone;
  searchRef?: React.Ref<HTMLInputElement>;
  listRef?: React.Ref<HTMLUListElement>;
  onQuery: (query: string) => void;
  onActive: (index: number) => void;
  onChoose: (place: LuPlace) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const t = TONES[tone];
  const optionId = (i: number) => `${listId}-${i}`;
  // Le champ est place dans un <label> : un clic dans le panneau (hors case
  // de recherche) ne doit ni deplacer le focus ni "cliquer" le bouton.
  const keepFocus = (e: React.SyntheticEvent) => {
    if (e.target !== e.currentTarget.querySelector("input")) e.preventDefault();
  };
  return (
    <div onMouseDown={keepFocus} onClick={keepFocus} className={`absolute left-0 right-0 top-full z-30 mt-1 p-2 ${t.panel}`}>
      <input
        ref={searchRef}
        type="search"
        id={searchId}
        name={LU_PICKER_SEARCH_NAME}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="search"
        aria-label={texts.search}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={items[active] ? optionId(active) : undefined}
        placeholder={texts.search}
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={onKeyDown}
        className={t.search}
      />
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={texts.list}
        className="relative mt-2 max-h-[min(20rem,50vh)] overflow-y-auto overscroll-contain"
      >
        {items.map((p, i) => (
          <li
            key={`${p.name}|${p.commune}|${p.quartier ? "q" : "l"}`}
            id={optionId(i)}
            role="option"
            aria-selected={sameLuPlace(p, value)}
            onMouseMove={() => {
              if (i !== active) onActive(i);
            }}
            onClick={() => onChoose(p)}
            className={`${t.option} ${i === active ? t.active : t.idle}`}
          >
            {optionLabel(p)}
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p role="status" className={t.noMatch}>
          {texts.noMatch}
        </p>
      )}
    </div>
  );
}
