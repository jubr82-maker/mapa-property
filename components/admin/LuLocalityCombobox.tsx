"use client";

/**
 * Ville d'un bien au Luxembourg (oct. 2026) : liste FERMEE des localites
 * officielles (registre CACLR, lib/geo/lu-localities.ts) et des quartiers
 * de la Ville de Luxembourg. On tape quelques lettres, les correspondances
 * s'affichent avec leur commune ("Kleinbettingen, commune de Steinfort"),
 * sans accents, majuscules, espaces ni traits d'union. Seule une localite
 * choisie dans la liste est retenue : tant qu'aucune ne l'est, la valeur
 * envoyee est vide et l'enregistrement est refuse (ici et par le serveur).
 *
 * Champs envoyes (formulaire de creation) : `name` = nom officiel exact,
 * `communeName` = sa commune (distingue deux localites du meme nom).
 * Meme apparence que CitySuggestInput.
 */

import { useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { searchLuPlaces, type LuPlace } from "@/lib/geo/lu-place-match";

export function LuLocalityCombobox({
  places,
  value,
  onChange,
  name,
  communeName,
  className = "",
}: {
  places: LuPlace[];
  /** Localite choisie, ou null. */
  value: LuPlace | null;
  onChange: (place: LuPlace | null) => void;
  /** Noms des champs envoyes tels quels (creation). */
  name?: string;
  communeName?: string;
  className?: string;
}) {
  const t = useTranslations("admin_properties");
  const label = (p: LuPlace) =>
    p.communeOnly
      ? t("city_commune_option", { commune: p.commune })
      : p.quartier
        ? t("city_quartier_option", { name: p.name })
        : t("city_lu_option", { name: p.name, commune: p.commune });
  const [text, setText] = useState(value ? label(value) : "");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();

  const matches = useMemo(() => (value && text === label(value) ? [] : searchLuPlaces(places, text)), [text, places, value]); // eslint-disable-line react-hooks/exhaustive-deps

  function choose(p: LuPlace) {
    setText(label(p));
    onChange(p);
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        placeholder={t("city_lu_placeholder")}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (value) onChange(null);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delai pour laisser le onMouseDown d'une suggestion s'executer.
          blurTimeout.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
          if (!open || matches.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && matches[highlight]) {
            choose(matches[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={className}
        data-lu-locality-input
      />
      {name && <input type="hidden" name={name} value={value?.name ?? ""} />}
      {communeName && <input type="hidden" name={communeName} value={value?.commune ?? ""} />}
      {open && text.trim() && !value && matches.length === 0 && (
        <span className="mt-1 block text-xs text-[#3D4F63]/60">{t("city_lu_no_match")}</span>
      )}
      {open && matches.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-[#3D4F63]/20 bg-white shadow-lg"
        >
          {matches.map((p, i) => (
            <li key={`${p.name}|${p.commune}|${p.quartier ? "q" : "l"}`} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blurTimeout.current) clearTimeout(blurTimeout.current);
                  choose(p);
                }}
                className={`block w-full px-3 py-2 text-left font-mono text-sm ${
                  i === highlight ? "bg-[#F5EFE1] text-[#3D4F63]" : "text-[#1A1F2A] hover:bg-[#F5EFE1]"
                }`}
              >
                {label(p)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
