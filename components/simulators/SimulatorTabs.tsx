"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { formatEuro, monthlyPayment } from "@/lib/finance";
import { getRateForDuration } from "@/lib/finance-sim";
import type { InterestRates } from "@/lib/types";

type RateType = "fixed" | "variable";

// Convertit "2026-05" → "mai 2026" (FR) / "May 2026" (EN) / "Mai 2026" (DE).
// Renvoie la string brute si parsing impossible (defense + tolerance).
function formatMonthLong(monthIso: string, locale: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthIso);
  if (!match) return monthIso;
  const [, year, month] = match;
  const date = new Date(Number(year), Number(month) - 1, 1);
  try {
    return new Intl.DateTimeFormat(locale, {
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return monthIso;
  }
}

interface Props {
  rates: InterestRates | null;
}

const tabs = ["mortgage", "yield", "capacity"] as const;
type Tab = (typeof tabs)[number];

export function SimulatorTabs({ rates }: Props) {
  const [active, setActive] = useState<Tab>("mortgage");
  const t = useTranslations("simulators");
  const locale = useLocale();

  return (
    <div>
      <nav className="mb-8 flex gap-2 overflow-x-auto rounded-full border border-line bg-bg-soft p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActive(tab)}
            className={`rounded-full px-5 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${
              active === tab
                ? "bg-ink text-bg"
                : "text-ink-soft hover:text-gold"
            }`}
          >
            {t(`tab_${tab}`)}
          </button>
        ))}
      </nav>

      {active === "mortgage" && <MortgageSim rates={rates} locale={locale} />}
      {active === "yield" && <YieldSim />}
      {active === "capacity" && <CapacitySim rates={rates} locale={locale} />}
    </div>
  );
}

/* --- Mortgage simulator --- */
function MortgageSim({ rates, locale }: { rates: InterestRates | null; locale: string }) {
  const t = useTranslations("simulators");
  const [capital, setCapital] = useState(500_000);
  const [years, setYears] = useState(25);
  const [rateType, setRateType] = useState<RateType>("fixed");
  const [isCustomRate, setIsCustomRate] = useState(false);
  const [customRateValue, setCustomRateValue] = useState<number | null>(null);

  // Taux auto suit la duree via le helper. Si personnalisation activee,
  // on utilise customRateValue (snapshot pris au moment du toggle).
  const autoRate = getRateForDuration(years, rateType, rates);
  const displayRate =
    isCustomRate && customRateValue !== null ? customRateValue : autoRate;
  const sliderDisabled = !isCustomRate || rateType === "variable";

  const handleToggleCustom = (checked: boolean) => {
    setIsCustomRate(checked);
    // Snapshot du taux auto courant pour eviter un saut visuel.
    if (checked && customRateValue === null) setCustomRateValue(autoRate);
    if (!checked) setCustomRateValue(null);
  };

  const handleTypeChange = (newType: RateType) => {
    setRateType(newType);
    // Variable → personnalisation forcement off (taux unique 2.85%).
    if (newType === "variable") {
      setIsCustomRate(false);
      setCustomRateValue(null);
    }
  };

  const monthly = monthlyPayment(capital, displayRate, years);
  const total = monthly * years * 12;
  const interest = total - capital;

  return (
    <section className="rounded-2xl border border-line bg-bg p-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <RateTypeRadio value={rateType} onChange={handleTypeChange} t={t} />
          <Slider
            label={t("capital")}
            value={capital}
            min={50_000}
            max={5_000_000}
            step={10_000}
            onChange={setCapital}
            format={formatEuro}
          />
          <Slider
            label={t("duration")}
            value={years}
            min={5}
            max={30}
            step={1}
            onChange={setYears}
            format={(v) => `${v} ${t("years")}`}
          />
          <div>
            <Slider
              label={t("rate_label")}
              value={displayRate}
              min={0.5}
              max={8}
              step={0.05}
              onChange={setCustomRateValue}
              format={(v) => `${v.toFixed(2).replace(".", ",")} %`}
              disabled={sliderDisabled}
            />
            <CustomRateToggle
              checked={isCustomRate}
              onChange={handleToggleCustom}
              disabled={rateType === "variable"}
              t={t}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gold/40 bg-bg-soft p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
            {t("monthly_label")}
          </p>
          <p className="mt-2 font-display text-5xl font-black gold-text">
            {formatEuro(Math.round(monthly))}
          </p>
          <dl className="mt-6 grid gap-3 border-t border-line pt-5">
            <Stat label={t("total_paid")} value={formatEuro(Math.round(total))} />
            <Stat
              label={t("total_interest")}
              value={formatEuro(Math.round(interest))}
            />
            {rates?.reference_month && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                {t("source_label", {
                  month: formatMonthLong(rates.reference_month, locale),
                })}
              </p>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
}

/* --- Yield simulator --- */
function YieldSim() {
  const t = useTranslations("simulators");
  const [purchase, setPurchase] = useState(500_000);
  const [rentMonthly, setRentMonthly] = useState(2_500);
  const [chargesYear, setChargesYear] = useState(3_000);
  const [mgmtRate, setMgmtRate] = useState(8); // %

  const grossYield = ((rentMonthly * 12) / purchase) * 100;
  const netCharges =
    ((rentMonthly * 12 - chargesYear - rentMonthly * 12 * (mgmtRate / 100)) /
      purchase) *
    100;
  // Note : suppression de la ligne "Net apres abattement fiscal 35% LU"
  // (calcul taxFactor = 0.65). L'abattement 35% des revenus locatifs est
  // plafonne a 2700€/an et exclu pour les biens > 650€/mois de loyer
  // (~99% des cas LU). Affichage trompeur → remplace par disclaimer
  // fiscalite renvoyant au conseil fiscal personnel.
  const overCap = grossYield > 5;

  return (
    <section className="rounded-2xl border border-line bg-bg p-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <Slider
            label={t("purchase_price")}
            value={purchase}
            min={50_000}
            max={5_000_000}
            step={10_000}
            onChange={setPurchase}
            format={formatEuro}
          />
          <Slider
            label={t("rent_monthly")}
            value={rentMonthly}
            min={500}
            max={20_000}
            step={50}
            onChange={setRentMonthly}
            format={formatEuro}
          />
          <Slider
            label={t("charges_year")}
            value={chargesYear}
            min={0}
            max={20_000}
            step={100}
            onChange={setChargesYear}
            format={formatEuro}
          />
          <Slider
            label={t("management_rate")}
            value={mgmtRate}
            min={0}
            max={15}
            step={0.5}
            onChange={setMgmtRate}
            format={(v) => `${v.toFixed(1).replace(".", ",")} %`}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-gold/40 bg-bg-soft p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
              {t("gross_yield")}
            </p>
            <p className="mt-2 font-display text-5xl font-black gold-text">
              {grossYield.toFixed(2).replace(".", ",")} %
            </p>
          </div>
          <Stat
            label={t("net_charges")}
            value={`${netCharges.toFixed(2).replace(".", ",")} %`}
          />

          {overCap && (
            <p className="rounded-md border border-accent-warm/40 bg-accent-warm/10 p-4 text-sm text-accent-warm">
              ⚠ {t("alert_5pct")}
            </p>
          )}

          <p className="rounded-md border border-line bg-bg-soft/60 p-4 text-xs leading-relaxed text-ink-soft">
            {t("tax_disclaimer")}
          </p>
        </div>
      </div>
    </section>
  );
}

/* --- Capacity simulator --- */
function CapacitySim({ rates, locale }: { rates: InterestRates | null; locale: string }) {
  const t = useTranslations("simulators");
  const [income, setIncome] = useState(8_000);
  const [charges, setCharges] = useState(500);
  const [down, setDown] = useState(150_000);
  const [years, setYears] = useState(25);
  const [rateType, setRateType] = useState<RateType>("fixed");
  const [isCustomRate, setIsCustomRate] = useState(false);
  const [customRateValue, setCustomRateValue] = useState<number | null>(null);

  // Meme logique que MortgageSim : auto par defaut, custom optionnel.
  const autoRate = getRateForDuration(years, rateType, rates);
  const displayRate =
    isCustomRate && customRateValue !== null ? customRateValue : autoRate;
  const sliderDisabled = !isCustomRate || rateType === "variable";

  const handleToggleCustom = (checked: boolean) => {
    setIsCustomRate(checked);
    if (checked && customRateValue === null) setCustomRateValue(autoRate);
    if (!checked) setCustomRateValue(null);
  };

  const handleTypeChange = (newType: RateType) => {
    setRateType(newType);
    if (newType === "variable") {
      setIsCustomRate(false);
      setCustomRateValue(null);
    }
  };

  const dispo = Math.max(0, (income - charges) * 0.35);
  const r = displayRate / 100 / 12;
  const n = years * 12;
  const maxBorrow = r === 0 ? dispo * n : (dispo * (1 - Math.pow(1 + r, -n))) / r;
  const totalBudget = maxBorrow + down;
  const indicativeAcquisition = totalBudget / 1.07; // moins frais notaire

  return (
    <section className="rounded-2xl border border-line bg-bg p-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-5">
          <RateTypeRadio value={rateType} onChange={handleTypeChange} t={t} />
          <Slider
            label={t("monthly_income")}
            value={income}
            min={2_000}
            max={50_000}
            step={100}
            onChange={setIncome}
            format={formatEuro}
          />
          <Slider
            label={t("monthly_charges")}
            value={charges}
            min={0}
            max={10_000}
            step={50}
            onChange={setCharges}
            format={formatEuro}
          />
          <Slider
            label={t("down")}
            value={down}
            min={0}
            max={2_000_000}
            step={5_000}
            onChange={setDown}
            format={formatEuro}
          />
          <Slider
            label={t("duration")}
            value={years}
            min={5}
            max={30}
            step={1}
            onChange={setYears}
            format={(v) => `${v} ${t("years")}`}
          />
          <div>
            <Slider
              label={t("rate_label")}
              value={displayRate}
              min={0.5}
              max={8}
              step={0.05}
              onChange={setCustomRateValue}
              format={(v) => `${v.toFixed(2).replace(".", ",")} %`}
              disabled={sliderDisabled}
            />
            <CustomRateToggle
              checked={isCustomRate}
              onChange={handleToggleCustom}
              disabled={rateType === "variable"}
              t={t}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gold/40 bg-bg-soft p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
            {t("max_acquisition")}
          </p>
          <p className="mt-2 font-display text-4xl font-black gold-text">
            {formatEuro(Math.round(indicativeAcquisition))}
          </p>
          <dl className="mt-5 grid gap-3 border-t border-line pt-4">
            <Stat label={t("monthly_max")} value={formatEuro(Math.round(dispo))} />
            <Stat label={t("max_borrow")} value={formatEuro(Math.round(maxBorrow))} />
            <Stat
              label={t("rate_used")}
              value={`${displayRate.toFixed(2).replace(".", ",")} %`}
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              {t("limit_35pct")}
            </p>
            {rates?.reference_month && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                {t("source_label", {
                  month: formatMonthLong(rates.reference_month, locale),
                })}
              </p>
            )}
          </dl>
        </div>
      </div>
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  disabled = false,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  disabled?: boolean;
}) {
  return (
    <label className={`block ${disabled ? "opacity-60" : ""}`}>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
          {label}
        </span>
        <span className="font-display text-base font-bold text-ink">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className={`w-full accent-gold ${disabled ? "cursor-not-allowed" : ""}`}
      />
    </label>
  );
}

// Radio Fixe / Variable — au-dessus des sliders. Mode 'variable' verrouille
// le taux a la valeur unique Supabase (2.85% mai 2026) et grise la
// personnalisation.
function RateTypeRadio({
  value,
  onChange,
  t,
}: {
  value: RateType;
  onChange: (v: RateType) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const opts: { value: RateType; key: string }[] = [
    { value: "fixed", key: "rate_type_fixed" },
    { value: "variable", key: "rate_type_variable" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t("rate_type_label")}
      className="flex gap-2 rounded-full border border-line bg-bg-soft p-1"
    >
      {opts.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`flex-1 rounded-full px-4 py-2 font-mono text-[10px] font-medium uppercase tracking-[0.2em] transition-colors ${
              active ? "bg-ink text-bg" : "text-ink-soft hover:text-gold"
            }`}
          >
            {t(opt.key)}
          </button>
        );
      })}
    </div>
  );
}

// Checkbox "Personnaliser le taux" sous le slider taux. Decochee par defaut :
// le taux suit la duree via getRateForDuration. Cochee : slider editable.
// Grisee si rateType='variable' (un seul taux possible).
function CustomRateToggle({
  checked,
  onChange,
  disabled,
  t,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <label
      className={`mt-2 flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-ink-soft ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="mt-0.5 accent-gold"
      />
      <span>
        <span className="font-mono uppercase tracking-[0.15em]">
          {t("customize_rate")}
        </span>
        <span className="mt-0.5 block text-ink-soft/80">
          {t("rate_auto_tooltip")}
        </span>
      </span>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </dt>
      <dd className="font-display text-base font-bold text-ink">{value}</dd>
    </div>
  );
}
