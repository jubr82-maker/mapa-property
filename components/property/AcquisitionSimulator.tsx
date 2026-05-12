"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  computeAcquisitionCost,
} from "@/lib/acquisition/country-rules";
import type {
  AcquisitionInput,
  AcquisitionResult,
  CountryCode,
} from "@/lib/acquisition/types";
import { computeMortgage, computeDebtRatio, fmtEur } from "@/lib/finance-sim";

interface Props {
  price: number;
  /** Accepte n'importe quel string Apimo (ex. "Luxembourg", "LU", "Dubaï"). */
  country: string;
  /** Ville Apimo, utilisée pour déduire région / Land / département. */
  city?: string;
  variant?: "default" | "compact";
}

const DURATIONS = [10, 15, 20, 25, 30] as const;

const SUPPORTED_CODES: CountryCode[] = [
  "LU", "FR", "BE", "DE", "MC", "CH", "IT", "ES", "PT",
];

const COUNTRY_LABEL: Record<CountryCode, string> = {
  LU: "Luxembourg",
  FR: "France",
  BE: "Belgique",
  DE: "Allemagne",
  MC: "Monaco",
  CH: "Suisse",
  IT: "Italie",
  ES: "Espagne",
  PT: "Portugal",
};

/** Normalise un string Apimo / saisie libre vers un CountryCode. */
function normalizeCountry(input: string | null | undefined): CountryCode | null {
  if (!input) return null;
  const k = input.trim().toUpperCase();
  if ((SUPPORTED_CODES as string[]).includes(k)) return k as CountryCode;

  const NAMES: Record<string, CountryCode> = {
    LUXEMBOURG: "LU",
    LUXEMBURG: "LU",
    "GRAND-DUCHÉ DE LUXEMBOURG": "LU",
    "GRAND DUCHE DE LUXEMBOURG": "LU",
    FRANCE: "FR",
    BELGIQUE: "BE",
    BELGIUM: "BE",
    BELGIË: "BE",
    BELGIE: "BE",
    ALLEMAGNE: "DE",
    GERMANY: "DE",
    DEUTSCHLAND: "DE",
    MONACO: "MC",
    SUISSE: "CH",
    SCHWEIZ: "CH",
    SWITZERLAND: "CH",
    ITALIE: "IT",
    ITALY: "IT",
    ITALIA: "IT",
    ESPAGNE: "ES",
    SPAIN: "ES",
    ESPAÑA: "ES",
    PORTUGAL: "PT",
  };
  return NAMES[k] ?? null;
}

export function AcquisitionSimulator({
  price,
  country,
  city,
  variant = "default",
}: Props) {
  const isCompact = variant === "compact";
  const normalized = normalizeCountry(country);

  // ── Cas pays non normalisable : message clair, pas de calcul ──
  if (!normalized) {
    return (
      <section
        className={`rounded-2xl border border-line bg-bg-soft p-5 ${isCompact ? "" : "sm:p-7"}`}
      >
        <header className="mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
            Plan de financement
          </p>
          <h3 className="mt-1 font-display text-lg font-bold text-ink">
            Pays non couvert
          </h3>
        </header>
        <p className="text-sm leading-relaxed text-ink-mid">
          Le simulateur de financement n&apos;est pas encore disponible pour ce
          pays. Contactez-nous pour une estimation personnalisée.
        </p>
        <Link
          href="/contact"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold-deep px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bg transition-colors hover:bg-gold"
        >
          Nous contacter →
        </Link>
      </section>
    );
  }

  return (
    <SimulatorActive
      price={price}
      country={normalized}
      city={city ?? ""}
      isCompact={isCompact}
    />
  );
}

function SimulatorActive({
  price,
  country,
  city,
  isCompact,
}: {
  price: number;
  country: CountryCode;
  city: string;
  isCompact: boolean;
}) {
  // ── Profil acquéreur ──
  const [downPct, setDownPct] = useState(20);
  const [duration, setDuration] = useState<number>(25);
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(false);
  const [isFamily, setIsFamily] = useState(false);
  const [propertyType, setPropertyType] = useState<"new" | "old">("old");
  const [usage, setUsage] =
    useState<AcquisitionInput["usage"]>("primary");
  const [isResident, setIsResident] = useState<boolean>(true);

  const input: AcquisitionInput = {
    countryCode: country,
    city,
    price,
    propertyType,
    usage,
    buyerProfile: {
      isResident,
      isFirstTimeBuyer,
      isFamily,
    },
    downPaymentPercent: downPct,
  };

  const result: AcquisitionResult = useMemo(
    () => computeAcquisitionCost(input),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [price, country, city, propertyType, usage, isResident, isFirstTimeBuyer, isFamily, downPct],
  );

  const downPayment = Math.round((price * downPct) / 100);
  // Taux indicatif simplifié (l'ancien moteur le portait — on garde un défaut neutre).
  const rate = 3.5;

  const mortgage = useMemo(
    () =>
      computeMortgage({
        price,
        downPayment,
        rateAnnual: rate,
        durationYears: duration,
      }),
    [price, downPayment, rate, duration],
  );

  const incomeRequired = mortgage.monthlyPayment / 0.35;
  const debtRatio = computeDebtRatio(mortgage.monthlyPayment, incomeRequired);

  // ── Cas notCovered : pays supporté côté UI mais pas encore implémenté (CH/IT/ES/PT)
  if (result.notCovered) {
    return (
      <section
        className={`rounded-2xl border border-line bg-bg-soft p-5 ${isCompact ? "" : "sm:p-7"}`}
      >
        <header className="mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
            Plan de financement · {COUNTRY_LABEL[country]}
          </p>
          <h3 className="mt-1 font-display text-lg font-bold text-ink">
            Estimation personnalisée disponible sur demande
          </h3>
        </header>
        <p className="text-sm leading-relaxed text-ink-mid">
          {result.contactMessage}
        </p>
        <Link
          href="/contact"
          className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold-deep px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bg transition-colors hover:bg-gold"
        >
          Nous contacter →
        </Link>
        <p className="mt-5 rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-[11px] leading-snug text-ink-mid">
          {result.legalNotice.shortDisclaimer}
        </p>
      </section>
    );
  }

  return (
    <section
      className={`rounded-2xl border border-gold/30 bg-bg-soft p-5 ${isCompact ? "" : "sm:p-7"}`}
    >
      <header className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
          Plan de financement · {COUNTRY_LABEL[country]}
          {result.region ? ` · ${result.region}` : ""}
        </p>
        <h3 className="mt-1 font-display text-lg font-bold text-ink">
          Mensualité, frais et aides applicables
        </h3>
      </header>

      {/* Sliders & paramètres */}
      <div className="mt-4 space-y-4">
        <label className="block">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              Apport
            </span>
            <span className="font-mono text-xs font-semibold text-ink">
              {downPct}% · {fmtEur(downPayment)}
            </span>
          </div>
          <input
            type="range"
            min={10}
            max={50}
            step={5}
            value={downPct}
            onChange={(e) => setDownPct(Number(e.target.value))}
            className="mt-2 block w-full accent-gold-deep"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            Durée
          </span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm"
          >
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d} ans
              </option>
            ))}
          </select>
        </label>

        <fieldset className="grid grid-cols-2 gap-2">
          <CheckboxField
            checked={isFirstTimeBuyer}
            onChange={setIsFirstTimeBuyer}
            label="Primo-accédant"
          />
          <CheckboxField
            checked={isFamily}
            onChange={setIsFamily}
            label="Couple / famille"
          />
          <CheckboxField
            checked={propertyType === "new"}
            onChange={(v) => setPropertyType(v ? "new" : "old")}
            label="Bien neuf / VEFA"
          />
          <CheckboxField
            checked={isResident}
            onChange={setIsResident}
            label="Résident fiscal"
          />
        </fieldset>

        <fieldset className="space-y-2 text-sm">
          <legend className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            Usage du bien
          </legend>
          <div className="flex flex-wrap gap-4">
            <RadioField
              name="acq-usage"
              value="primary"
              current={usage}
              onChange={setUsage}
              label="Résidence principale"
            />
            <RadioField
              name="acq-usage"
              value="secondary"
              current={usage}
              onChange={setUsage}
              label="Résidence secondaire"
            />
            <RadioField
              name="acq-usage"
              value="investment"
              current={usage}
              onChange={setUsage}
              label="Investissement locatif"
            />
          </div>
        </fieldset>
      </div>

      {/* Avertissements moteur */}
      {result.warnings.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {result.warnings.map((w, i) => (
            <li
              key={i}
              className="rounded-md border border-line bg-bg/50 px-3 py-2 text-[11px] leading-snug text-ink-soft"
            >
              {w}
            </li>
          ))}
        </ul>
      )}

      {/* Récapitulatif */}
      <dl className="mt-6 grid gap-3 text-sm">
        <Row label="Prix du bien" value={fmtEur(price)} />

        {/* Line items détaillés du moteur */}
        <div className="rounded-lg border border-line bg-bg p-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            Détail des frais d&apos;acquisition
          </p>
          <ul className="mt-2 space-y-2">
            {result.lineItems.map((li, i) => (
              <li key={i} className="text-xs text-ink-mid">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-ink">{li.label}</span>
                  {li.amount !== 0 && (
                    <span
                      className={`font-mono text-xs font-semibold ${li.amount < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-ink"}`}
                    >
                      {li.amount < 0 ? "− " : ""}
                      {fmtEur(Math.abs(li.amount))}
                    </span>
                  )}
                </div>
                {li.notes && (
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">
                    {li.notes}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>

        <Row
          label="Total frais d'acquisition"
          value={fmtEur(result.totalCost)}
          hint={`${result.totalCostPercent.toFixed(2).replace(".", ",")} % du prix`}
          accent
        />
        <Row
          label="Capital emprunté (estimé)"
          value={fmtEur(mortgage.borrowedAmount)}
        />
        <Row
          label="Mensualité estimée"
          value={fmtEur(mortgage.monthlyPayment)}
          hint={`taux indicatif ${rate.toFixed(2)} % · ${duration} ans`}
        />
        <Row
          label="Coût total acquisition"
          value={fmtEur(price + result.totalCost)}
        />
        <Row
          label="Revenu mensuel requis (35%)"
          value={fmtEur(incomeRequired)}
          hint={`taux d'endettement cible ${debtRatio.toFixed(0)} %`}
        />
      </dl>

      {/* Sources & disclaimer */}
      <div className="mt-5 space-y-3 border-t border-line pt-4">
        {result.sources.length > 0 && (
          <details className="text-[11px] text-ink-soft">
            <summary className="cursor-pointer font-mono uppercase tracking-[0.15em] text-ink-soft hover:text-ink">
              Sources officielles ({result.sources.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {result.sources.map((s) => (
                <li key={s.url}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gold-deep underline-offset-2 hover:underline"
                  >
                    {s.label}
                  </a>
                  <span className="ml-1 text-ink-soft/70">
                    · vérifié {s.verifiedDate}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <p className="rounded-md border border-yellow-400 bg-yellow-50 px-3 py-2 text-[11px] leading-relaxed text-ink-mid">
          {result.legalNotice.shortDisclaimer}
        </p>
      </div>
    </section>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────

function Row({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </dt>
      <dd className="text-right">
        <span
          className={
            accent
              ? "font-display text-xl font-bold gold-text"
              : "font-display text-base font-bold text-ink"
          }
        >
          {value}
        </span>
        {hint && (
          <span className="block text-[10px] text-ink-soft/80">{hint}</span>
        )}
      </dd>
    </div>
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
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-line bg-bg px-2.5 py-2 text-xs text-ink-mid hover:border-gold/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 accent-gold-deep"
      />
      <span>{label}</span>
    </label>
  );
}

function RadioField<T extends string>({
  name,
  value,
  current,
  onChange,
  label,
}: {
  name: string;
  value: T;
  current: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-mid">
      <input
        type="radio"
        name={name}
        value={value}
        checked={current === value}
        onChange={() => onChange(value)}
        className="h-3.5 w-3.5 accent-gold-deep"
      />
      <span>{label}</span>
    </label>
  );
}
