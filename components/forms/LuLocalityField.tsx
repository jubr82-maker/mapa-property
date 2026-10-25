"use client";

/**
 * Localite du bien au Luxembourg, formulaires de mandat (oct. 2026) : liste
 * FERMEE des localites officielles (registre CACLR) et des quartiers de la
 * Ville, recue en prop de la page (jamais dans le JavaScript commun). Meme
 * champ que le texte libre (classes identiques) ; la liste ne s'ouvre qu'a
 * la saisie, avec la commune ("Kleinbettingen, commune de Steinfort").
 * Charge a la demande par ContactForm (next/dynamic) : seules les pages de
 * mandat le telechargent.
 */
import { useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { searchLuPlaces, type LuPlace } from "@/lib/geo/lu-place-match";

export function LuLocalityField({
  places,
  value,
  onChange,
  placeholder,
  className,
}: {
  places: LuPlace[];
  value: LuPlace | null;
  onChange: (place: LuPlace | null) => void;
  placeholder: string;
  className: string;
}) {
  const t = useTranslations("form");
  const label = (p: LuPlace) => (p.quartier ? t("city_quartier_option", { name: p.name }) : t("city_lu_option", { name: p.name, commune: p.commune }));
  const [text, setText] = useState(value ? label(value) : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const blur = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listId = useId();
  const results = useMemo(() => (value && text === label(value) ? [] : searchLuPlaces(places, text)), [text, places, value]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (p: LuPlace) => {
    setText(label(p));
    onChange(p);
    setOpen(false);
  };

  return (
    <span className="relative flex flex-col">
      <input
        name="city"
        type="text"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={text}
        placeholder={placeholder}
        required
        onChange={(e) => {
          setText(e.target.value);
          if (value) onChange(null);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blur.current = setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && open && results[active]) {
            e.preventDefault();
            choose(results[active]);
          } else if (e.key === "ArrowDown" && results.length) {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp" && results.length) {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={className}
      />
      {open && text.trim() && !value && (
        <span
          id={listId}
          role="listbox"
          aria-label={t("city_lu_list")}
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-md border border-line-strong bg-bg text-ink shadow-lg"
        >
          {results.length === 0 ? (
            <span className="block px-4 py-3 text-sm text-ink-mid">{t("city_lu_no_match")}</span>
          ) : (
            results.map((p, i) => (
              <span
                key={`${p.name}|${p.commune}|${p.quartier ? "q" : "l"}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (blur.current) clearTimeout(blur.current);
                  choose(p);
                }}
                onMouseMove={() => setActive(i)}
                className={`block cursor-pointer px-4 py-2.5 text-sm ${i === active ? "bg-ink text-bg" : "text-ink hover:bg-bg-deep"}`}
              >
                {label(p)}
              </span>
            ))
          )}
        </span>
      )}
    </span>
  );
}
