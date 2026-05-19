"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { formatEuro } from "@/lib/finance";
import type { EstimateResult } from "@/lib/estimate";
import {
  LUXEMBOURG_COMMUNES_PRICES,
  VDL_QUARTIERS_PRICES,
} from "@/lib/data/luxembourg-prices";
import { track } from "@/lib/tracking/track";
import { CountrySelect } from "@/components/ui/CountrySelect";
import { DisclaimerLegal } from "@/components/ui/DisclaimerLegal";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { Link } from "@/i18n/navigation";
import { DEFAULT_COUNTRY } from "@/lib/countries";

const PROPERTY_TYPES = [
  "appartement",
  "maison",
  "penthouse",
  "duplex",
  "villa",
  "immeuble",
  "terrain",
] as const;
const STATES = ["to_renovate", "good", "renovated", "new"] as const;
const ENERGIES = ["A", "B", "C", "D", "E", "F", "G", "H", "I"] as const;

interface FormState {
  country: string;
  commune: string;
  quartier: string; // si commune = Luxembourg (25 quartiers VDL)
  postal: string;
  type: string;
  state: (typeof STATES)[number];
  energy: string;
  livingSurface: string;
  landSurface: string;
  terraceSurface: string;
  bedrooms: string;
  year: string;
  // Step 3 — coordonnées client (pour livraison résultat + suivi)
  contactEmail: string;
  contactPhone: string;
  contactConsent: boolean;
  rgpdConsent: boolean;
}

const initial: FormState = {
  country: DEFAULT_COUNTRY,
  commune: "",
  quartier: "",
  postal: "",
  type: "appartement",
  state: "good",
  energy: "C",
  livingSurface: "",
  landSurface: "",
  terraceSurface: "",
  bedrooms: "",
  year: "",
  contactEmail: "",
  contactPhone: "",
  contactConsent: false,
  rgpdConsent: false,
};

export function EstimateForm() {
  const t = useTranslations("estimate_form");
  const tSearch = useTranslations("search");
  const tRgpd = useTranslations("rgpd");
  const [step, setStep] = useState(1);
  const [data, setData] = useState<FormState>(initial);
  const [result, setResult] = useState<EstimateResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setData((d) => ({ ...d, [key]: value }));
  };

  const submit = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country: data.country,
          commune: data.commune || undefined,
          quartier: data.quartier || undefined,
          type: data.type,
          state: data.state,
          energy: data.energy,
          livingSurface: Number(data.livingSurface),
          landSurface: data.landSurface ? Number(data.landSurface) : undefined,
          terraceSurface: data.terraceSurface
            ? Number(data.terraceSurface)
            : undefined,
          bedrooms: data.bedrooms ? Number(data.bedrooms) : undefined,
          year: data.year ? Number(data.year) : undefined,
          // Coordonnées : on les passe pour qu'un lead soit créé côté serveur si présent
          contactEmail: data.contactEmail || undefined,
          contactPhone: data.contactPhone || undefined,
          rgpdConsent: data.rgpdConsent,
        }),
      });
      if (!res.ok) throw new Error();
      const json = (await res.json()) as {
        result: EstimateResult;
        engine?: string;
        confidence?: string;
      };
      setResult(json.result);
      setStep(4);
      track("estimation_compute", {
        country: data.country,
        type: data.type,
        commune: data.commune || undefined,
        quartier: data.quartier || undefined,
        living_surface: Number(data.livingSurface) || undefined,
        engine: json.engine,
        confidence: json.confidence,
        price_mid: json.result?.range?.mid,
        has_contact: Boolean(data.contactEmail || data.contactPhone),
      });
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  };

  const reset = () => {
    setData(initial);
    setResult(null);
    setStep(1);
  };

  if (result) {
    return <ResultView result={result} onReset={reset} />;
  }

  return (
    <div className="space-y-5">
      {/* POL2-6 : mention légale obligatoire en TÊTE du formulaire EVS. */}
      <DisclaimerLegal />
      <div className="rounded-2xl border border-line bg-bg p-8 shadow-sm">
      <Stepper current={step} t={t} />

      {step === 1 && (
        <StepWrap title={t("step1_title")} subtitle={t("step1_subtitle")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldSelect
              label={t("type")}
              value={data.type}
              onChange={(v) => set("type", v)}
              options={PROPERTY_TYPES.map((p) => ({
                value: p,
                label: tSearch(`type_${p}`),
              }))}
            />
            <FieldSelect
              label={t("state")}
              value={data.state}
              onChange={(v) => set("state", v as FormState["state"])}
              options={STATES.map((s) => ({ value: s, label: t(`state_${s}`) }))}
            />
            {/* BUG T4 : pour un terrain, la surface utile est la
                surface de terrain (pas d'habitable). */}
            <FieldNumber
              label={t("living_surface")}
              value={data.livingSurface}
              onChange={(v) => set("livingSurface", v)}
              suffix="m²"
              required={data.type !== "terrain"}
            />
            <FieldNumber
              label={t("land_surface")}
              value={data.landSurface}
              onChange={(v) => set("landSurface", v)}
              suffix="m²"
              required={data.type === "terrain"}
            />
            <FieldNumber
              label={t("terrace_surface")}
              value={data.terraceSurface}
              onChange={(v) => set("terraceSurface", v)}
              suffix="m²"
            />
            <FieldNumber
              label={t("year")}
              value={data.year}
              onChange={(v) => set("year", v)}
            />
            <FieldNumber
              label={t("bedrooms")}
              value={data.bedrooms}
              onChange={(v) => set("bedrooms", v)}
            />
            <FieldSelect
              label={t("energy")}
              value={data.energy}
              onChange={(v) => set("energy", v)}
              options={ENERGIES.map((e) => ({ value: e, label: e }))}
            />
          </div>
          <NextBtn
            onClick={() => setStep(2)}
            disabled={
              data.type === "terrain"
                ? !data.landSurface || Number(data.landSurface) <= 0
                : !data.livingSurface || Number(data.livingSurface) <= 0
            }
            t={t}
          />
        </StepWrap>
      )}

      {step === 2 && (
        <StepWrap title={t("step2_title")} subtitle={t("step2_subtitle")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <CountrySelect
              label={tSearch("country")}
              value={data.country}
              onChange={(v) => {
                set("country", v);
                if (v !== "LU") set("quartier", "");
              }}
            />
            {data.country === "LU" ? (
              <>
                <FieldSelect
                  label={t("commune")}
                  value={data.commune}
                  onChange={(v) => {
                    set("commune", v);
                    // reset quartier si on quitte Luxembourg
                    if (v !== "Luxembourg") set("quartier", "");
                  }}
                  options={[
                    { value: "", label: tSearch("any") },
                    ...LUXEMBOURG_COMMUNES_PRICES.map((r) => ({
                      value: r.commune,
                      label: r.commune,
                    })),
                  ]}
                />
                {data.commune === "Luxembourg" && (
                  <FieldSelect
                    label={t("quartier") || "Quartier (Luxembourg-Ville)"}
                    value={data.quartier}
                    onChange={(v) => set("quartier", v)}
                    options={[
                      { value: "", label: tSearch("any") },
                      ...VDL_QUARTIERS_PRICES.map((q) => ({
                        value: q.quartier,
                        label: q.quartier,
                      })),
                    ]}
                  />
                )}
              </>
            ) : (
              <FieldText
                label={tSearch("city")}
                value={data.commune}
                onChange={(v) => set("commune", v)}
                placeholder={tSearch("city_ph")}
              />
            )}
            <FieldText
              label={t("postal")}
              value={data.postal}
              onChange={(v) => set("postal", v)}
            />
          </div>
          <BackNextBtn
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
            t={t}
          />
        </StepWrap>
      )}

      {step === 3 && (
        <StepWrap title={t("step3_title")} subtitle={t("step3_subtitle")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldText
              type="email"
              label={t("contact_email")}
              value={data.contactEmail}
              onChange={(v) => set("contactEmail", v)}
              placeholder="vous@exemple.com"
              autoComplete="email"
            />
            <PhoneInput
              label={t("contact_phone")}
              onChange={(v) => set("contactPhone", v)}
            />
          </div>
          <div className="mt-4">
            <CheckboxField
              checked={data.contactConsent}
              onChange={(v) => set("contactConsent", v)}
              label={t("contact_consent")}
            />
          </div>
          <div className="mt-3">
            <label className="flex items-start gap-3 text-sm leading-snug text-ink-mid">
              <input
                type="checkbox"
                checked={data.rgpdConsent}
                onChange={(e) => set("rgpdConsent", e.target.checked)}
                className="mt-0.5 size-4 accent-gold-deep"
              />
              <span>
                {tRgpd("consent_label")}{" "}
                <Link
                  href="/legal/rgpd"
                  target="_blank"
                  className="underline hover:text-gold-deep"
                >
                  {tRgpd("policy_link")}
                </Link>
              </span>
            </label>
          </div>
          {error && (
            <p className="mt-3 rounded-md border border-accent-warm/40 bg-accent-warm/10 px-4 py-2 font-mono text-xs text-accent-warm">
              {error}
            </p>
          )}
          <BackSubmitBtn
            onBack={() => setStep(2)}
            onSubmit={submit}
            pending={pending}
            t={t}
            disabled={
              !data.contactConsent || !data.rgpdConsent || !data.contactEmail
            }
          />
        </StepWrap>
      )}
      </div>
    </div>
  );
}

function Stepper({
  current,
  t,
}: {
  current: number;
  t: ReturnType<typeof useTranslations>;
}) {
  const steps = [t("step1_label"), t("step2_label"), t("step3_label")];
  return (
    <ol className="mb-8 flex items-center gap-3 overflow-x-auto pb-2">
      {steps.map((label, i) => {
        const num = i + 1;
        const active = num === current;
        const done = num < current;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`inline-flex size-7 items-center justify-center rounded-full text-xs font-mono ${
                active
                  ? "bg-ink text-bg"
                  : done
                    ? "bg-gold text-ink"
                    : "border border-line text-ink-soft"
              }`}
            >
              {done ? "✓" : num}
            </span>
            <span
              className={`whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.25em] ${
                active ? "text-ink" : "text-ink-soft"
              }`}
            >
              {label}
            </span>
            {num < steps.length && (
              <span aria-hidden className="h-px w-8 bg-line" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function StepWrap({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
      <p className="mt-1 mb-6 text-sm text-ink-mid">{subtitle}</p>
      {children}
    </section>
  );
}

function FieldText({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm focus:border-gold focus:outline-none"
      />
    </label>
  );
}

function FieldNumber({
  label,
  value,
  onChange,
  suffix,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
        {required && <span className="ml-1 text-gold-deep">*</span>}
        {suffix && <span className="ml-2 text-ink-mid">{suffix}</span>}
      </span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm focus:border-gold focus:outline-none"
      />
    </label>
  );
}

function FieldSelect({
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
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-line bg-bg px-4 py-2.5 text-sm focus:border-gold focus:outline-none"
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

function CheckboxField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-3 text-sm leading-snug text-ink-mid">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 accent-gold-deep"
      />
      <span>{label}</span>
    </label>
  );
}

function NextBtn({
  onClick,
  disabled,
  t,
}: {
  onClick: () => void;
  disabled?: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mt-8 flex justify-end">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="gold-shine-bg rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
      >
        {t("next")} →
      </button>
    </div>
  );
}

function BackNextBtn({
  onBack,
  onNext,
  t,
}: {
  onBack: () => void;
  onNext: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-mid hover:border-gold hover:text-gold"
      >
        ← {t("back")}
      </button>
      <button
        type="button"
        onClick={onNext}
        className="gold-shine-bg rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02]"
      >
        {t("next")} →
      </button>
    </div>
  );
}

function BackSubmitBtn({
  onBack,
  onSubmit,
  pending,
  t,
  disabled = false,
}: {
  onBack: () => void;
  onSubmit: () => void;
  pending: boolean;
  t: ReturnType<typeof useTranslations>;
  disabled?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="rounded-full border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-mid hover:border-gold hover:text-gold"
      >
        ← {t("back")}
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={pending || disabled}
        className="gold-shine-bg rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? t("computing") : t("compute")}
      </button>
    </div>
  );
}

function ResultView({
  result,
  onReset,
}: {
  result: EstimateResult;
  onReset: () => void;
}) {
  const t = useTranslations("estimate_form");
  return (
    <div className="space-y-8">
      {/* Range */}
      <section className="rounded-2xl border border-gold bg-gradient-to-br from-bg-soft via-bg to-bg-soft p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
          {t("range_label")}
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              {t("range_low")}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">
              {formatEuro(result.range.low)}
            </p>
          </div>
          <div className="border-x border-line px-4 sm:px-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-deep">
              {t("range_mid")}
            </p>
            <p className="mt-1 font-display text-4xl font-black gold-text">
              {formatEuro(result.range.mid)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              {t("range_high")}
            </p>
            <p className="mt-1 font-display text-2xl font-bold text-ink">
              {formatEuro(result.range.high)}
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs text-ink-soft">
          {t("price_per_sqm", {
            value: formatEuro(result.pricePerSqm).replace(/\s/g, " "),
          })}
        </p>
      </section>

      {/* Financing */}
      {result.financing && (
        <section className="rounded-2xl border border-line bg-bg p-8">
          <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
            {t("financing_title")}
          </h3>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label={t("max_borrowable")}
              value={formatEuro(result.financing.maxBorrowable)}
            />
            <Stat
              label={t("monthly_max")}
              value={formatEuro(result.financing.monthlyPaymentMax)}
            />
            <Stat
              label={t("duration")}
              value={`${result.financing.suggestedDuration} ans`}
            />
            <Stat
              label={t("rate_used")}
              value={`${result.financing.rateUsed.toFixed(2).replace(".", ",")} %`}
            />
            <Stat
              label={t("notary_fees")}
              value={`~ ${formatEuro(result.financing.notaryFees)}`}
            />
          </dl>
        </section>
      )}

      {/* Helps */}
      {result.helps.length > 0 && (
        <section className="rounded-2xl border border-line bg-bg-soft p-8">
          <h3 className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("helps_title")}
          </h3>
          <ul className="mt-5 space-y-4">
            {result.helps.map((h) => (
              <li
                key={h.key}
                className="rounded-xl border border-gold/30 bg-bg p-5"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <h4 className="font-display text-base font-bold text-ink">
                    {t(`help_${h.key}_title`)}
                  </h4>
                  {h.amount && (
                    <span className="font-display text-lg font-black gold-text">
                      {formatEuro(h.amount)}
                    </span>
                  )}
                </div>
                <ul className="mt-3 space-y-1 text-sm text-ink-mid">
                  {h.conditions.map((c, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span aria-hidden className="text-gold-deep">›</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-line px-5 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-mid hover:border-gold hover:text-gold"
        >
          {t("restart")}
        </button>
      </div>

      {/* POL2-6 : mention légale obligatoire en BAS du résultat d'estimation. */}
      <DisclaimerLegal />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </dt>
      <dd className="mt-1 font-display text-xl font-bold text-ink">{value}</dd>
    </div>
  );
}
