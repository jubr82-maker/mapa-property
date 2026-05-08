"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

const transactions = ["sale", "rent", "offmarket"] as const;
const types = [
  "appartement",
  "maison",
  "penthouse",
  "duplex",
  "villa",
  "immeuble",
  "terrain",
] as const;

export function FilterBar() {
  const t = useTranslations("property_list");
  const tSearch = useTranslations("search");
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [country, setCountry] = useState(params.get("country") ?? "");
  const [city, setCity] = useState(params.get("city") ?? "");
  const [type, setType] = useState(params.get("type") ?? "");
  const [transaction, setTransaction] = useState(params.get("transaction") ?? "");
  const [budget, setBudget] = useState(params.get("budget_max") ?? "");
  const [bedrooms, setBedrooms] = useState(params.get("min_bedrooms") ?? "");

  // Sync state when URL changes externally
  useEffect(() => {
    setCountry(params.get("country") ?? "");
    setCity(params.get("city") ?? "");
    setType(params.get("type") ?? "");
    setTransaction(params.get("transaction") ?? "");
    setBudget(params.get("budget_max") ?? "");
    setBedrooms(params.get("min_bedrooms") ?? "");
  }, [params]);

  const apply = () => {
    const sp = new URLSearchParams();
    if (country) sp.set("country", country);
    if (city.trim()) sp.set("city", city.trim());
    if (type) sp.set("type", type);
    if (transaction) sp.set("transaction", transaction);
    if (budget) sp.set("budget_max", budget);
    if (bedrooms) sp.set("min_bedrooms", bedrooms);
    startTransition(() => {
      router.replace(`/biens${sp.toString() ? `?${sp.toString()}` : ""}`);
    });
  };

  const reset = () => {
    setCountry("");
    setCity("");
    setType("");
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
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm focus:border-gold focus:outline-none"
          >
            <option value="">{tSearch("any")}</option>
            {["LU", "FR", "BE", "DE", "CH", "MC", "ES", "PT", "IT", "AE"].map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ),
            )}
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
        <Field label={tSearch("type")}>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full rounded-md border border-line bg-bg px-3 py-2 text-sm focus:border-gold focus:outline-none"
          >
            <option value="">{tSearch("all_types")}</option>
            {types.map((p) => (
              <option key={p} value={p}>
                {tSearch(`type_${p}`)}
              </option>
            ))}
          </select>
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
