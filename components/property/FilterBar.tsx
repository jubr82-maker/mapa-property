"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { DEFAULT_COUNTRY, sortedCountries } from "@/lib/geo/countries";
import { TypeFilterMultiSelect } from "@/components/property/TypeFilterMultiSelect";

const transactions = ["sale", "rent", "offmarket"] as const;

// Sprint C13-ter — URL param 'types' (comma-separated). Helpers de
// parse / stringify pour la rétro-compat avec l'ancien 'type' single.
function parseTypesParam(
  paramTypes: string | null,
  paramTypeLegacy: string | null,
): string[] {
  const src = paramTypes ?? paramTypeLegacy ?? "";
  return src
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function FilterBar() {
  const t = useTranslations("property_list");
  const tSearch = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  // Sprint UI-MAI : pays OPTIONNEL. Etat initial = ce qui est dans l'URL,
  // ou vide (= "Tous les pays"). L'utilisateur peut effacer le pays pour
  // voir tous les biens (option vide ajoutee en tete du select).
  const [country, setCountry] = useState(params.get("country") ?? "");
  const [city, setCity] = useState(params.get("city") ?? "");
  // Sprint C13-ter : multi-select (array). Lit ?types= (nouveau) ou
  // ?type= (legacy single, rétro-compat). Aucune case cochée par défaut.
  const [types, setTypes] = useState<string[]>(
    parseTypesParam(params.get("types"), params.get("type")),
  );
  const [transaction, setTransaction] = useState(params.get("transaction") ?? "");
  const [budget, setBudget] = useState(params.get("budget_max") ?? "");
  const [bedrooms, setBedrooms] = useState(params.get("min_bedrooms") ?? "");

  const countries = useMemo(() => sortedCountries(locale), [locale]);

  // Sync state when URL changes externally (e.g. user clicks suggested filter elsewhere)
  /* eslint-disable react-hooks/set-state-in-effect -- intentional: external URL → form state sync */
  useEffect(() => {
    setCountry(params.get("country") ?? "");
    setCity(params.get("city") ?? "");
    setTypes(parseTypesParam(params.get("types"), params.get("type")));
    setTransaction(params.get("transaction") ?? "");
    setBudget(params.get("budget_max") ?? "");
    setBedrooms(params.get("min_bedrooms") ?? "");
  }, [params]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const apply = () => {
    const sp = new URLSearchParams();
    // Sprint UI-MAI : country optionnel (vide -> pas de filtre pays).
    if (country) sp.set("country", country);
    if (city.trim()) sp.set("city", city.trim());
    // Sprint C13-ter : url types= seulement si au moins 1 case cochée.
    if (types.length > 0) sp.set("types", types.join(","));
    if (transaction) sp.set("transaction", transaction);
    if (budget) sp.set("budget_max", budget);
    if (bedrooms) sp.set("min_bedrooms", bedrooms);
    startTransition(() => {
      router.replace(`/biens?${sp.toString()}`);
    });
  };

  const reset = () => {
    // Sprint UI-MAI : reset = vide partout, redirige vers /biens sans filtre
    // (= tous les pays + tous les biens). L'utilisateur recommence a zero.
    setCountry("");
    setCity("");
    setTypes([]);
    setTransaction("");
    setBudget("");
    setBedrooms("");
    startTransition(() => router.replace("/biens"));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="rounded-xl border border-line bg-bg p-5"
    >
      <div className="grid gap-3 lg:grid-cols-[120px_minmax(180px,1fr)_140px_140px_160px_120px_auto_auto]">
        <Field label={tSearch("country")}>
          {/* Sprint UI-MAI : pays OPTIONNEL. Premiere option vide =
              "Tous les pays" (pas de filtre). Liste ISO 3166-1 complete
              (195 pays) via Intl.DisplayNames pour les labels localises. */}
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm focus:border-gold focus:outline-none"
          >
            <option value="">{tSearch("all_countries")}</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tSearch("city")}>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={tSearch("city_ph")}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm focus:border-gold focus:outline-none"
          />
        </Field>
        <Field label={t("transaction")}>
          <select
            value={transaction}
            onChange={(e) => setTransaction(e.target.value)}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm focus:border-gold focus:outline-none"
          >
            <option value="">{tSearch("any")}</option>
            {transactions.map((tr) => (
              <option key={tr} value={tr}>
                {t(`tx_${tr}`)}
              </option>
            ))}
          </select>
        </Field>
        {/* Sprint C13-ter + ELENA-NAV C1 : multi-select 2 niveaux Radix.
            Label externe via le pattern Field standard pour alignement
            vertical strict avec les autres inputs (px-3 py-2 text-sm). */}
        <Field label={tSearch("type")}>
          <TypeFilterMultiSelect value={types} onChange={setTypes} />
        </Field>
        <Field label={tSearch("budget_max")}>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="€"
            min="0"
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm focus:border-gold focus:outline-none"
          />
        </Field>
        <Field label={tSearch("min_bedrooms")}>
          <select
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm focus:border-gold focus:outline-none"
          >
            <option value="">{tSearch("any")}</option>
            {["1", "2", "3", "4", "5"].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </Field>
        <button
          type="submit"
          className="self-end rounded-full bg-ink px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-bg transition-colors hover:bg-gold-deep"
        >
          {tSearch("search")}
        </button>
        <button
          type="button"
          onClick={reset}
          className="self-end rounded-full border border-line px-5 py-2.5 font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink-mid transition-colors hover:border-gold hover:text-gold"
        >
          {t("reset")}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
