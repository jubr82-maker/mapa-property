"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  computeAcquisition,
  normalizeCountry,
  type BuyerProfile,
} from "@/lib/acquisition";
import { computeMortgage, computeDebtRatio, fmtEur } from "@/lib/finance-sim";

interface Props {
  price: number;
  /** Accepte n'importe quel string Apimo (ex. "Luxembourg", "LU", "Dubaï"). */
  country: string;
  variant?: "default" | "compact";
}

const DURATIONS = [10, 15, 20, 25, 30] as const;

export function AcquisitionSimulator({ price, country, variant = "default" }: Props) {
  const isCompact = variant === "compact";
  const normalized = normalizeCountry(country);

  // ── Cas pays non supporté : message clair, pas de calcul ──
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
      isCompact={isCompact}
    />
  );
}

function SimulatorActive({
  price,
  country,
  isCompact,
}: {
  price: number;
  country: NonNullable<ReturnType<typeof normalizeCountry>>;
  isCompact: boolean;
}) {
  // ── Profil acquéreur ──
  const [downPct, setDownPct] = useState(20);
  const [duration, setDuration] = useState<number>(25);
  const [primoAccedant, setPrimoAccedant] = useState(false);
  const [couple, setCouple] = useState(false);
  const [usage, setUsage] = useState<BuyerProfile["usage"]>("residence");
  const [residentStatus, setResidentStatus] =
    useState<BuyerProfile["residentStatus"]>("resident");
  const [isNeuf, setIsNeuf] = useState(false);

  const profile: BuyerProfile = {
    country,
    primoAccedant,
    couple,
    usage,
    residentStatus,
    isNeuf,
  };

  const result = useMemo(
    () => computeAcquisition(profile, price),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [price, country, primoAccedant, couple, usage, residentStatus, isNeuf],
  );

  const downPayment = Math.round((price * downPct) / 100);
  const rate = result.financing.typicalRateAnnual * 100;

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

  const isHorsUE = country === "AE";

  return (
    <section
      className={`rounded-2xl border border-gold/30 bg-bg-soft p-5 ${isCompact ? "" : "sm:p-7"}`}
    >
      <header className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
          Plan de financement · {COUNTRY_LABEL[country]}
        </p>
        <h3 className="mt-1 font-display text-lg font-bold text-ink">
          Mensualité, frais et aides applicables
        </h3>
      </header>

      {/* Banners contextuels */}
      {isHorsUE && (
        <Banner tone="info">
          L&apos;acquisition d&apos;un bien hors Union européenne est
          généralement financée par les banques locales du pays concerné
          (ici Émirats arabes unis). Les aides d&apos;État européennes ne
          s&apos;appliquent pas.
        </Banner>
      )}
      {residentStatus === "non_resident" && (
        <Banner tone="warn">
          Conditions de financement non-résident : LTV plafonné, taux
          généralement +1 à +2 points par rapport à un résident.
        </Banner>
      )}

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
            {DURATIONS.filter(
              (d) => d <= result.financing.maxDurationYears,
            ).map((d) => (
              <option key={d} value={d}>
                {d} ans
              </option>
            ))}
          </select>
        </label>

        <fieldset className="grid grid-cols-2 gap-2">
          <CheckboxField
            checked={primoAccedant}
            onChange={setPrimoAccedant}
            label="Primo-accédant"
          />
          <CheckboxField
            checked={couple}
            onChange={setCouple}
            label="Couple acquéreur"
          />
          <CheckboxField
            checked={isNeuf}
            onChange={setIsNeuf}
            label="Bien neuf / VEFA"
          />
        </fieldset>

        <fieldset className="space-y-2 text-sm">
          <legend className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            Usage du bien
          </legend>
          <div className="flex flex-wrap gap-4">
            <RadioField
              name="acq-usage"
              value="residence"
              current={usage}
              onChange={setUsage}
              label="Résidence principale"
            />
            <RadioField
              name="acq-usage"
              value="locatif"
              current={usage}
              onChange={setUsage}
              label="Locatif"
            />
            <RadioField
              name="acq-usage"
              value="secondaire"
              current={usage}
              onChange={setUsage}
              label="Secondaire"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-2 text-sm">
          <legend className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            Statut fiscal
          </legend>
          <div className="flex flex-wrap gap-4">
            <RadioField
              name="acq-resident"
              value="resident"
              current={residentStatus}
              onChange={setResidentStatus}
              label={`Résident ${COUNTRY_LABEL[country]}`}
            />
            <RadioField
              name="acq-resident"
              value="non_resident"
              current={residentStatus}
              onChange={setResidentStatus}
              label="Non-résident"
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
        <Row
          label="Frais d'acquisition bruts"
          value={fmtEur(result.grossFees.total)}
          hint={[
            result.grossFees.registrationOrTransferTax > 0
              ? `droits ${fmtEur(result.grossFees.registrationOrTransferTax)}`
              : null,
            result.grossFees.notary > 0
              ? `notaire/trustee ${fmtEur(result.grossFees.notary)}`
              : null,
            result.grossFees.mortgage > 0
              ? `hypothèque ${fmtEur(result.grossFees.mortgage)}`
              : null,
            result.grossFees.other
              ? `autres ${fmtEur(result.grossFees.other)}`
              : null,
          ]
            .filter(Boolean)
            .join(" + ")}
        />

        {result.aids.length > 0 && (
          <div className="rounded-lg border border-gold/30 bg-bg p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-deep">
              Aides d&apos;État applicables
            </p>
            <ul className="mt-2 space-y-2">
              {result.aids.map((a) => (
                <li key={a.id} className="text-xs text-ink-mid">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-ink">{a.name}</span>
                    {a.amount > 0 && (
                      <span className="font-mono text-xs font-semibold text-gold-deep">
                        − {fmtEur(a.amount)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-ink-soft">
                    {a.description}
                  </p>
                  <p className="mt-1 text-[10px] text-ink-soft">
                    Conditions remplies : {a.conditionsMet.join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Row
          label="Frais d'acquisition nets"
          value={fmtEur(result.netFees)}
          hint={
            result.netFees < result.grossFees.total
              ? `Économie · ${fmtEur(result.grossFees.total - result.netFees)}`
              : undefined
          }
          hintAccent={result.netFees < result.grossFees.total}
        />
        <Row
          label="Capital emprunté (estimé)"
          value={fmtEur(mortgage.borrowedAmount)}
          hint={`LTV max ${Math.round(result.financing.maxLTV * 100)}%`}
        />
        <Row
          label="Mensualité estimée"
          value={fmtEur(mortgage.monthlyPayment)}
          hint={`taux indicatif ${rate.toFixed(2)} % · ${duration} ans`}
          accent
        />
        <Row
          label="Coût total acquisition (net)"
          value={fmtEur(result.totalAcquisitionNet)}
        />
        <Row
          label="Revenu mensuel requis (35%)"
          value={fmtEur(incomeRequired)}
          hint={`taux d'endettement cible ${debtRatio.toFixed(0)} %`}
        />
      </dl>

      {/* Sources & disclaimer */}
      <div className="mt-5 space-y-2 border-t border-line pt-4">
        <p className="text-[11px] leading-relaxed text-ink-soft">
          {result.disclaimer}
        </p>
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
                    {s.name}
                  </a>
                  <span className="ml-1 text-ink-soft/70">
                    · vérifié {s.lastVerified}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}

// ─── Labels ────────────────────────────────────────────────────────────────

const COUNTRY_LABEL: Record<
  NonNullable<ReturnType<typeof normalizeCountry>>,
  string
> = {
  LU: "Luxembourg",
  FR: "France",
  BE: "Belgique",
  DE: "Allemagne",
  PT: "Portugal",
  AE: "Émirats arabes unis",
};

// ─── Sous-composants ──────────────────────────────────────────────────────

function Banner({
  tone,
  children,
}: {
  tone: "info" | "warn";
  children: React.ReactNode;
}) {
  const cls =
    tone === "warn"
      ? "border-gold/40 bg-gold/5 text-ink"
      : "border-line bg-bg text-ink-mid";
  return (
    <div
      className={`mb-2 rounded-md border px-3 py-2 text-[11px] leading-snug ${cls}`}
    >
      {children}
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  hintAccent,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  hintAccent?: boolean;
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
          <span
            className={`block text-[10px] ${hintAccent ? "text-emerald-600 dark:text-emerald-400" : "text-ink-soft/80"}`}
          >
            {hint}
          </span>
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
