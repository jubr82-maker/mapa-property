"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/tracking/track";

/**
 * Calcule la capacité d'emprunt à partir d'une mensualité max et d'un taux annuel.
 *
 * Formule PMT inverse : Principal = Mensualité × ((1 - (1 + r)^-n) / r)
 * où r = taux mensuel, n = nombre de mensualités.
 *
 * Returns 0 si taux ou durée invalides.
 */
function borrowingCapacity(
  maxMonthlyPayment: number,
  annualRatePct: number,
  durationYears: number,
): number {
  if (maxMonthlyPayment <= 0 || annualRatePct <= 0 || durationYears <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  const n = durationYears * 12;
  return maxMonthlyPayment * ((1 - Math.pow(1 + r, -n)) / r);
}

const MAX_DEBT_RATIO = 0.4; // Recommandation BCL Luxembourg : 40% max
const SAFE_DEBT_RATIO = 0.33; // Zone confort : 33%

function fmtEur(n: number) {
  if (!isFinite(n) || isNaN(n)) return "—";
  return (
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
      Math.round(n),
    ) + " €"
  );
}

export function BorrowingCapacitySimulator() {
  const t = useTranslations("borrowing_capacity");

  const [income, setIncome] = useState<string>("");
  const [charges, setCharges] = useState<string>("");
  const [downPayment, setDownPayment] = useState<string>("");
  const [duration, setDuration] = useState<string>("25");
  const [rate, setRate] = useState<string>("");

  const computed = useMemo(() => {
    const I = Number(income) || 0;
    const C = Number(charges) || 0;
    const D = Number(downPayment) || 0;
    const N = Number(duration) || 0;
    const R = Number(rate) || 0;
    if (I <= 0 || N <= 0 || R <= 0) return null;

    const maxMonthly = Math.max(0, I * MAX_DEBT_RATIO - C);
    const capacity = borrowingCapacity(maxMonthly, R, N);
    const totalPaid = maxMonthly * N * 12;
    const interests = Math.max(0, totalPaid - capacity);
    const totalBudget = capacity + D;

    // Ratio effectif charges+mensualité / revenus
    const debtRatio = (maxMonthly + C) / I;

    // Fourchette ±10% (sensibilité taux + caprice marché)
    const lowCapacity = capacity * 0.9;
    const highCapacity = capacity * 1.1;

    return {
      maxMonthly,
      capacity,
      lowCapacity,
      highCapacity,
      totalPaid,
      interests,
      totalBudget,
      debtRatio,
    };
  }, [income, charges, downPayment, duration, rate]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!computed) return;
    track("emprunt_simulate", {
      income_monthly: Number(income) || undefined,
      charges_monthly: Number(charges) || undefined,
      down_payment: Number(downPayment) || undefined,
      duration_years: Number(duration) || undefined,
      rate_pct: Number(rate) || undefined,
      capacity_estimated: Math.round(computed.capacity),
      debt_ratio_pct: Math.round(computed.debtRatio * 100),
    });
  }

  const debtClass =
    !computed || computed.debtRatio === 0
      ? "text-ink-soft"
      : computed.debtRatio <= SAFE_DEBT_RATIO
        ? "text-emerald-700"
        : computed.debtRatio <= MAX_DEBT_RATIO
          ? "text-gold-deep"
          : "text-red-700";

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-8 lg:grid-cols-[1.1fr_1fr]"
    >
      {/* INPUTS */}
      <section className="rounded-2xl border border-line bg-bg-soft p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("inputs_title")}
        </h2>
        <p className="mt-1 text-sm text-ink-mid">{t("inputs_subtitle")}</p>

        <div className="mt-6 space-y-5">
          <Field
            label={t("income_label")}
            hint={t("income_hint")}
            type="number"
            inputMode="numeric"
            min={0}
            value={income}
            onChange={setIncome}
            unit="€ / mois"
            placeholder="6000"
          />
          <Field
            label={t("charges_label")}
            hint={t("charges_hint")}
            type="number"
            inputMode="numeric"
            min={0}
            value={charges}
            onChange={setCharges}
            unit="€ / mois"
            placeholder="0"
          />
          <Field
            label={t("down_payment_label")}
            hint={t("down_payment_hint")}
            type="number"
            inputMode="numeric"
            min={0}
            value={downPayment}
            onChange={setDownPayment}
            unit="€"
            placeholder="50000"
          />
          <Field
            label={t("duration_label")}
            hint={t("duration_hint")}
            type="number"
            inputMode="numeric"
            min={5}
            max={35}
            value={duration}
            onChange={setDuration}
            unit={t("years_unit")}
            placeholder="25"
          />
          <Field
            label={t("rate_label")}
            hint={t("rate_hint")}
            type="number"
            inputMode="decimal"
            min={0}
            step={0.05}
            value={rate}
            onChange={setRate}
            unit="%"
            placeholder={t("rate_placeholder")}
          />
        </div>

        <button
          type="submit"
          className="mt-6 rounded-full bg-gold px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-bg transition-colors hover:bg-gold-deep"
        >
          {t("submit")}
        </button>
      </section>

      {/* OUTPUTS */}
      <section className="rounded-2xl border border-gold/30 bg-bg p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-ink">
          {t("results_title")}
        </h2>

        {!computed ? (
          <p className="mt-4 text-sm text-ink-mid">{t("fill_inputs")}</p>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                {t("capacity_range")}
              </p>
              <p className="mt-1 font-display text-3xl font-black text-gold-deep">
                {fmtEur(computed.capacity)}
              </p>
              <p className="font-mono text-[11px] text-ink-soft">
                {fmtEur(computed.lowCapacity)} – {fmtEur(computed.highCapacity)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-line pt-4">
              <Stat label={t("max_monthly")} value={fmtEur(computed.maxMonthly)} />
              <Stat label={t("interests_total")} value={fmtEur(computed.interests)} />
              <Stat label={t("total_paid")} value={fmtEur(computed.totalPaid)} />
              <Stat
                label={t("total_budget")}
                value={fmtEur(computed.totalBudget)}
                hint={t("total_budget_hint")}
              />
            </div>

            <div className="border-t border-line pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                {t("debt_ratio")}
              </p>
              <p className={`mt-1 font-display text-2xl font-bold ${debtClass}`}>
                {Math.round(computed.debtRatio * 100)} %
              </p>
              <p className="text-xs text-ink-mid">
                {computed.debtRatio <= SAFE_DEBT_RATIO
                  ? t("debt_safe")
                  : computed.debtRatio <= MAX_DEBT_RATIO
                    ? t("debt_acceptable")
                    : t("debt_high")}
              </p>
            </div>
          </div>
        )}

        <p className="mt-6 rounded-lg border border-gold/40 bg-gold/5 p-4 text-xs leading-relaxed text-ink-mid">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-deep">
            {t("disclaimer_eyebrow")}
          </span>
          <br />
          {t("disclaimer_text")}
        </p>
      </section>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  unit,
  value,
  onChange,
  ...rest
}: {
  label: string;
  hint?: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-mid">
        {label}
      </span>
      <div className="mt-1 flex items-stretch overflow-hidden rounded-md border border-line bg-bg focus-within:border-gold-deep">
        <input
          {...rest}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:outline-none"
        />
        {unit && (
          <span className="border-l border-line bg-bg-soft px-3 py-2 font-mono text-[10px] uppercase tracking-widest text-ink-soft">
            {unit}
          </span>
        )}
      </div>
      {hint && <p className="mt-1 text-[11px] text-ink-soft">{hint}</p>}
    </label>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </p>
      <p className="mt-0.5 font-display text-lg font-bold text-ink">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-ink-soft">{hint}</p>}
    </div>
  );
}
