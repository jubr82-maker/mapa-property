"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { computeAcquisitionCost } from "@/lib/acquisition/country-rules";
import type {
  AcquisitionInput,
  AcquisitionResult,
} from "@/lib/acquisition/types";
import { computeMortgage, computeDebtRatio, fmtEur } from "@/lib/finance-sim";
import { ContactReveal } from "@/components/contact-reveal";

interface Props {
  price: number;
  /** Accepte n'importe quel string Apimo (ex. "Luxembourg", "LU", "Dubaï"). */
  country: string;
  /** Ville Apimo, utilisée pour déduire région / Land / département. */
  city?: string;
  variant?: "default" | "compact";
}

const DURATIONS = [10, 15, 20, 25, 30] as const;
const COPPER = "#B8865A";

const COUNTRY_LABEL: Record<string, string> = {
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

function mapCountry(raw: string): string {
  const c = (raw ?? "").toUpperCase().trim();
  const aliases: Record<string, string> = {
    LUXEMBOURG: "LU",
    LUXEMBURG: "LU",
    "GRAND-DUCHÉ DE LUXEMBOURG": "LU",
    "GRAND DUCHE DE LUXEMBOURG": "LU",
    LU: "LU",
    FRANCE: "FR",
    FR: "FR",
    BELGIQUE: "BE",
    BELGIUM: "BE",
    BELGIË: "BE",
    BELGIE: "BE",
    BE: "BE",
    ALLEMAGNE: "DE",
    GERMANY: "DE",
    DEUTSCHLAND: "DE",
    DE: "DE",
    MONACO: "MC",
    MC: "MC",
    SUISSE: "CH",
    SWITZERLAND: "CH",
    SCHWEIZ: "CH",
    CH: "CH",
    ITALIE: "IT",
    ITALY: "IT",
    ITALIA: "IT",
    IT: "IT",
    ESPAGNE: "ES",
    SPAIN: "ES",
    ESPAÑA: "ES",
    ES: "ES",
    PORTUGAL: "PT",
    PT: "PT",
  };
  return aliases[c] ?? c;
}

const SUPPORTED_CODES = ["LU", "FR", "BE", "DE", "MC", "CH", "IT", "ES", "PT"];

/** Disclaimer minimaliste affiché sous le résultat. */
function MinimalDisclaimer({ locale }: { locale: string }) {
  return (
    <p className="mt-4 text-xs italic leading-relaxed text-ink-soft">
      Estimation indicative basée sur la réglementation 2026.{" "}
      <Link
        href={`/${locale}/mentions-acquisition`}
        className="underline-offset-2 hover:underline"
      >
        Mentions légales
      </Link>
    </p>
  );
}

/** Boutons de contact : aucun numéro ni nom en SSR (anti-scraping ContactReveal). */
function ContactButtonsRow({ locale }: { locale: string }) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <ContactReveal variant="compact" align="center" />
      <Link
        href={`/${locale}/contact`}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-mid transition-colors hover:border-gold/40 hover:text-ink"
      >
        Contact
      </Link>
    </div>
  );
}

export function AcquisitionSimulator({
  price,
  country,
  city,
  variant = "default",
}: Props) {
  const locale = useLocale();
  const isCompact = variant === "compact";
  const code = mapCountry(country);
  const isSupported = SUPPORTED_CODES.includes(code);

  // Migration silencieuse — purge l'ancien flag localStorage du modal supprimé.
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("mp_disclaimer_acquisition_accepted_v1");
      } catch {
        /* noop */
      }
    }
  }, []);

  // Cas pays non normalisable : message clair, pas de calcul.
  if (!isSupported) {
    return (
      <section
        className={`rounded-2xl border border-line bg-bg-soft p-5 ${
          isCompact ? "" : "sm:p-7"
        }`}
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
          Le simulateur de coûts d&apos;acquisition n&apos;est pas encore
          disponible pour ce pays. MAPA Property vous propose une analyse
          personnalisée avec ses partenaires locaux.
        </p>
        <ContactButtonsRow locale={locale} />
        <MinimalDisclaimer locale={locale} />
      </section>
    );
  }

  return (
    <SimulatorActive
      price={price}
      country={code}
      city={city ?? ""}
      isCompact={isCompact}
      locale={locale}
    />
  );
}

function SimulatorActive({
  price,
  country,
  city,
  isCompact,
  locale,
}: {
  price: number;
  country: string;
  city: string;
  isCompact: boolean;
  locale: string;
}) {
  const [downPct, setDownPct] = useState(20);
  const [duration, setDuration] = useState<number>(25);
  const [isFirstTimeBuyer, setIsFirstTimeBuyer] = useState(false);
  const [isFamily, setIsFamily] = useState(false);
  const [propertyType, setPropertyType] = useState<"new" | "old">("old");
  const [usage, setUsage] = useState<AcquisitionInput["usage"]>("primary");
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
    [
      price,
      country,
      city,
      propertyType,
      usage,
      isResident,
      isFirstTimeBuyer,
      isFamily,
      downPct,
    ],
  );

  const downPayment = Math.round((price * downPct) / 100);
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

  // Cas notCovered (pays supporté côté UI mais non calculé — eg. Lex Koller CH)
  if (result.notCovered) {
    return (
      <section
        className={`rounded-2xl border border-line bg-bg-soft p-5 ${
          isCompact ? "" : "sm:p-7"
        }`}
      >
        <header className="mb-3">
          <p
            className="font-mono text-[10px] uppercase tracking-[0.3em]"
            style={{ color: COPPER }}
          >
            Plan de financement · {COUNTRY_LABEL[country] ?? country}
          </p>
          <h3 className="mt-1 font-display text-lg font-bold text-ink">
            Estimation personnalisée disponible sur demande
          </h3>
        </header>
        <p className="text-sm leading-relaxed text-ink-mid">
          {result.contactMessage}
        </p>
        <ContactButtonsRow locale={locale} />
        <MinimalDisclaimer locale={locale} />
      </section>
    );
  }

  const noteImportante = result.lineItems.find(
    (li) => li.amount === 0 && li.label === "Note importante",
  );
  const lineItemsToDisplay = result.lineItems.filter(
    (li) => !(li.amount === 0 && li.label === "Note importante"),
  );

  return (
    <section
      className={`rounded-2xl border border-line bg-bg-soft p-5 ${
        isCompact ? "" : "sm:p-7"
      }`}
      style={{ borderColor: `${COPPER}33` }}
    >
      <header className="mb-4">
        <p
          className="font-mono text-[10px] uppercase tracking-[0.3em]"
          style={{ color: COPPER }}
        >
          Plan de financement · {COUNTRY_LABEL[country] ?? country}
          {result.region ? ` · ${result.region}` : ""}
        </p>
        <h3 className="mt-1 font-display text-lg font-bold text-ink">
          Coût d&apos;acquisition, mensualité et aides applicables
        </h3>
      </header>

      <div className="space-y-4">
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
            min={0}
            max={50}
            step={5}
            value={downPct}
            onChange={(e) => setDownPct(Number(e.target.value))}
            className="mt-2 block w-full"
            style={{ accentColor: COPPER }}
          />
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            Durée
          </span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm text-ink"
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

      <div className="mt-6 rounded-xl border border-line bg-bg p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          Détail des frais d&apos;acquisition
        </p>
        <ul className="mt-3 space-y-2.5">
          {lineItemsToDisplay.map((li, i) => (
            <li key={i} className="text-sm text-ink-mid">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-ink">{li.label}</span>
                <span className="flex items-baseline gap-2">
                  {typeof li.rate === "number" && (
                    <span className="font-mono text-[10px] text-ink-soft">
                      {li.rate.toFixed(2).replace(/\.?0+$/, "")} %
                    </span>
                  )}
                  {li.amount !== 0 && (
                    <span
                      className={`font-mono text-xs font-semibold ${
                        li.amount < 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-ink"
                      }`}
                    >
                      {li.amount < 0 ? "− " : ""}
                      {fmtEur(Math.abs(li.amount))}
                    </span>
                  )}
                </span>
              </div>
              {li.notes && (
                <p className="mt-0.5 text-[11px] italic leading-snug text-ink-soft">
                  {li.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>

      {noteImportante?.notes && (
        <aside
          className="mt-4 rounded-xl border bg-bg-soft p-4"
          style={{ borderColor: `${COPPER}55` }}
        >
          <p
            className="font-mono text-[10px] uppercase tracking-[0.3em]"
            style={{ color: COPPER }}
          >
            {noteImportante.label}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-mid">
            {noteImportante.notes}
          </p>
        </aside>
      )}

      <div
        className="mt-5 rounded-xl border bg-bg p-5"
        style={{ borderColor: `${COPPER}55` }}
      >
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
            Total frais d&apos;acquisition
          </p>
          <p className="font-mono text-[10px] text-ink-soft">
            {result.totalCostPercent.toFixed(2).replace(".", ",")} % du prix
          </p>
        </div>
        <p
          className="mt-2 font-display text-3xl font-black tracking-tight"
          style={{ color: COPPER }}
        >
          {fmtEur(result.totalCost)}
        </p>
      </div>

      <dl className="mt-5 grid gap-3 text-sm">
        <Row label="Prix du bien" value={fmtEur(price)} />
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

      {result.warnings.length > 0 && (
        <ul className="mt-5 space-y-2 rounded-md border border-yellow-400 bg-yellow-50 p-3 dark:bg-yellow-900/10">
          {result.warnings.map((w, i) => (
            <li
              key={i}
              className="flex gap-2 text-[11px] leading-relaxed text-ink-mid"
            >
              <span aria-hidden className="select-none">⚠️</span>
              <span>{w}</span>
            </li>
          ))}
        </ul>
      )}

      <MinimalDisclaimer locale={locale} />
    </section>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </dt>
      <dd className="text-right">
        <span className="font-display text-base font-bold text-ink">{value}</span>
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
        className="h-3.5 w-3.5"
        style={{ accentColor: COPPER }}
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
        className="h-3.5 w-3.5"
        style={{ accentColor: COPPER }}
      />
      <span>{label}</span>
    </label>
  );
}