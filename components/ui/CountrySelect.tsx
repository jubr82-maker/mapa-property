"use client";

import { useLocale } from "next-intl";
import { COUNTRIES, DEFAULT_COUNTRY, countryName } from "@/lib/countries";

// Sélecteur pays unique réutilisable (BUG 4). value/onChange = code ISO
// alpha-2. Affiche drapeau + libellé localisé (fr/en/de). Style aligné
// sur les champs de formulaire du site (border-line / focus:border-gold).

export function CountrySelect({
  value,
  onChange,
  label,
  id,
  name,
  required = true,
  className = "",
}: {
  value: string;
  onChange: (code: string) => void;
  label: string;
  id?: string;
  name?: string;
  required?: boolean;
  className?: string;
}) {
  const locale = useLocale();

  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
        {required && <span className="ml-1 text-gold-deep">*</span>}
      </span>
      <select
        id={id}
        name={name}
        value={value || DEFAULT_COUNTRY}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm focus:border-gold focus:outline-none"
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} {countryName(c, locale)}
          </option>
        ))}
      </select>
    </label>
  );
}
