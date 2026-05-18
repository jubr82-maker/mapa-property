"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  getCountry,
  phoneMinDigits,
} from "@/lib/countries";

// Champ téléphone unique réutilisable (BUG 3). Aucune dépendance
// externe (pas de libphonenumber-js). Deux champs côte à côte :
//   - gauche : <select> compact drapeau + indicatif (source COUNTRIES)
//   - droite : <input type="tel"> numéro national
// Valeur combinée émise au format "+352 691 620 127".
//
// Modes :
//   - non controlé : passer `name` → un <input type="hidden" name>
//     porte la valeur combinée (forms FormData type ContactForm).
//   - controlé : passer `onChange` (reçoit la chaîne combinée).
//
// Validation cliente légère : longueur min de chiffres par pays
// (phoneMinDigits). La validation serveur reste faite côté API.

export function PhoneInput({
  label,
  name,
  required = false,
  defaultCountry = DEFAULT_COUNTRY,
  onChange,
  id,
}: {
  label: string;
  name?: string;
  required?: boolean;
  defaultCountry?: string;
  onChange?: (combined: string) => void;
  id?: string;
}) {
  const tc = useTranslations("common");
  const [code, setCode] = useState(defaultCountry);
  const [national, setNational] = useState("");

  const country = getCountry(code) ?? getCountry(DEFAULT_COUNTRY)!;
  const digits = national.replace(/\D/g, "");
  const combined = digits ? `${country.phone_prefix} ${national.trim()}` : "";
  const tooShort = digits.length > 0 && digits.length < phoneMinDigits(code);

  const emit = (nextCode: string, nextNational: string) => {
    const cc = getCountry(nextCode) ?? country;
    const d = nextNational.replace(/\D/g, "");
    onChange?.(d ? `${cc.phone_prefix} ${nextNational.trim()}` : "");
  };

  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
        {required && <span className="ml-1 text-gold-deep">*</span>}
      </span>
      <div className="flex gap-2">
        <select
          aria-label={`${label} — indicatif`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            emit(e.target.value, national);
          }}
          className="w-[120px] shrink-0 rounded-md border border-line bg-bg px-2 py-2.5 text-sm focus:border-gold focus:outline-none"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.phone_prefix}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          required={required}
          value={national}
          placeholder="691 620 127"
          onChange={(e) => {
            setNational(e.target.value);
            emit(code, e.target.value);
          }}
          className="min-w-0 flex-1 rounded-md border border-line bg-bg px-4 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
        />
      </div>
      {tooShort && (
        <span className="font-mono text-[10px] text-accent-warm">
          {tc("phone_too_short")}
        </span>
      )}
      {name && <input type="hidden" name={name} value={combined} />}
    </label>
  );
}
