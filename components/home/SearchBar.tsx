"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { DEFAULT_COUNTRY, sortedCountries } from "@/lib/geo/countries";

const propertyTypes = [
  "appartement",
  "maison",
  "penthouse",
  "duplex",
  "villa",
  "immeuble",
  "terrain",
] as const;

const budgetSteps = [
  500_000, 750_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000, 5_000_000, 10_000_000,
] as const;

export function SearchBar() {
  const t = useTranslations("search");
  const locale = useLocale();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [aiQuery, setAiQuery] = useState("");
  const [aiPending, setAiPending] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Sprint C13-bis C2 : pays obligatoire, defaut Luxembourg, liste ISO
  // complete via Intl.DisplayNames pour les labels localises.
  const [country, setCountry] = useState(DEFAULT_COUNTRY);
  const [city, setCity] = useState("");
  const [type, setType] = useState("");
  const [budget, setBudget] = useState("");
  const [bedrooms, setBedrooms] = useState("");

  const countries = useMemo(() => sortedCountries(locale), [locale]);

  // Pick default mode based on viewport on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: client-only viewport detection after hydration
    setMode(window.innerWidth >= 1024 ? "manual" : "ai");
  }, []);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    // Sprint C13-bis C2 : country toujours present (defaut LU).
    params.set("country", country || DEFAULT_COUNTRY);
    if (city.trim()) params.set("city", city.trim());
    if (type) params.set("type", type);
    if (budget) params.set("budget_max", budget);
    if (bedrooms) params.set("min_bedrooms", bedrooms);
    startTransition(() => {
      router.push(`/biens?${params.toString()}`);
    });
  };

  const submitAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiPending(true);
    setAiError(null);
    try {
      const res = await fetch("/api/search-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: aiQuery }),
      });
      if (!res.ok) throw new Error("ai-failed");
      const filters = (await res.json()) as Record<string, string | number>;
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== "") {
          params.set(k, String(v));
        }
      });
      router.push(`/biens?${params.toString()}`);
    } catch {
      setAiError(t("ai_error"));
    } finally {
      setAiPending(false);
    }
  };

  return (
    <section
      id="search"
      className="relative -mt-14 px-4 sm:px-6 lg:-mt-20 lg:px-10"
    >
      <div className="mx-auto max-w-[1280px]">
        <div className="overflow-hidden rounded-2xl border border-line bg-bg shadow-xl shadow-ink/5">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-line bg-bg-soft px-4 py-2 sm:px-6">
            <div className="flex gap-1">
              <ModeButton
                active={mode === "manual"}
                onClick={() => setMode("manual")}
              >
                {t("mode_manual")}
              </ModeButton>
              <ModeButton active={mode === "ai"} onClick={() => setMode("ai")}>
                {t("mode_ai")}
              </ModeButton>
            </div>
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft sm:block">
              {mode === "manual" ? t("hint_manual") : t("hint_ai")}
            </span>
          </div>

          {/* Body */}
          <div className="px-4 py-4 sm:px-6 sm:py-5">
            {mode === "manual" ? (
              <form
                onSubmit={submitManual}
                className="grid gap-3 lg:grid-cols-[120px_minmax(180px,1fr)_180px_180px_140px_auto]"
              >
                <Select
                  label={t("country")}
                  value={country}
                  onChange={setCountry}
                  options={countries.map((c) => ({
                    value: c.code,
                    label: c.label,
                  }))}
                />
                <Input
                  label={t("city")}
                  value={city}
                  onChange={setCity}
                  placeholder={t("city_ph")}
                />
                <Select
                  label={t("type")}
                  value={type}
                  onChange={setType}
                  options={[
                    { value: "", label: t("all_types") },
                    ...propertyTypes.map((p) => ({
                      value: p,
                      label: t(`type_${p}`),
                    })),
                  ]}
                />
                <Select
                  label={t("budget_max")}
                  value={budget}
                  onChange={setBudget}
                  options={[
                    { value: "", label: t("any") },
                    ...budgetSteps.map((b) => ({
                      value: String(b),
                      label: `${(b / 1000).toLocaleString("fr-LU")}k €`,
                    })),
                  ]}
                />
                <Select
                  label={t("min_bedrooms")}
                  value={bedrooms}
                  onChange={setBedrooms}
                  options={[
                    { value: "", label: t("any") },
                    ...["1", "2", "3", "4", "5"].map((n) => ({
                      value: n,
                      label: `${n}+`,
                    })),
                  ]}
                />
                <button
                  type="submit"
                  className="gold-shine-bg inline-flex items-center justify-center gap-2 self-end rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02]"
                >
                  {t("search")}
                  <span aria-hidden>→</span>
                </button>
              </form>
            ) : (
              <form onSubmit={submitAi} className="flex flex-col gap-3 lg:flex-row">
                <label className="sr-only" htmlFor="ai-query">
                  {t("ai_label")}
                </label>
                <input
                  id="ai-query"
                  type="text"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder={t("ai_placeholder")}
                  className="flex-1 rounded-full border border-line bg-bg px-5 py-3 font-sans text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={aiPending}
                  className="gold-shine-bg inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] disabled:scale-100 disabled:opacity-50"
                >
                  {aiPending ? t("ai_thinking") : t("ai_search")}
                  <span aria-hidden>✨</span>
                </button>
              </form>
            )}
            {aiError && mode === "ai" && (
              <p className="mt-3 font-mono text-xs text-accent-warm">{aiError}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] transition-colors ${
        active ? "bg-ink text-bg" : "text-ink-mid hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink focus:border-gold focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
