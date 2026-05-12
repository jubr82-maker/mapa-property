"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  computeMortgage,
  computeDebtRatio,
  fmtEur,
  DEFAULT_RATES_BY_COUNTRY,
} from "@/lib/finance-sim";
import {
  LEGAL_FEES,
  type CountryCode,
  computeAcquisitionCosts,
} from "@/lib/legal-fees";
import {
  getApplicableAids,
  totalAidsAmount,
  aidAmountFor,
} from "@/lib/state-aids";

interface Props {
  price: number;
  country: CountryCode;
  variant?: "default" | "compact";
}

const DURATIONS = [10, 15, 20, 25, 30] as const;

export function MiniFinanceSimulator({ price, country, variant = "default" }: Props) {
  // Apimo peut envoyer "Luxembourg" ou un code non listé : fallback LU pour
  // éviter le crash si la clé n'est pas dans LEGAL_FEES.
  const safeCountry: CountryCode = LEGAL_FEES[country] ? country : "LU";

  // Apport en pourcentage (10-50%, step 5%) — converti en EUR au calcul.
  const [downPct, setDownPct] = useState(20);
  const [duration, setDuration] = useState<number>(25);
  const [primoAccedant, setPrimoAccedant] = useState(false);
  const [couple, setCouple] = useState(false);
  const [usage, setUsage] = useState<"residence" | "locatif">("residence");
  const [isNeuf, setIsNeuf] = useState(false);

  const rate = DEFAULT_RATES_BY_COUNTRY[safeCountry] ?? 3.85;
  const fees = LEGAL_FEES[safeCountry];

  const downPayment = Math.round((price * downPct) / 100);

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

  const acquisition = useMemo(
    () => computeAcquisitionCosts(price, safeCountry),
    [price, safeCountry],
  );

  const applicableAids = useMemo(
    () =>
      getApplicableAids({
        country: safeCountry,
        primoAccedant,
        couple,
        usage,
        isNeuf,
      }),
    [safeCountry, primoAccedant, couple, usage, isNeuf],
  );

  const aidsTotal = useMemo(
    () => totalAidsAmount(applicableAids, couple),
    [applicableAids, couple],
  );

  // Les aides s'appliquent en priorité sur les droits/frais d'acquisition,
  // jamais en deçà de zéro. Tout excédent reste théorique (à terme : appliquer
  // sur capital emprunté côté page financement détaillée).
  const grossFees = acquisition.total;
  const netFees = Math.max(0, grossFees - aidsTotal);
  const totalAcquisitionNet = price + netFees;

  // Hypothèse revenu : taux d'endettement 35% max → revenu mensuel requis
  const incomeRequired = mortgage.monthlyPayment / 0.35;
  const debtRatio = computeDebtRatio(mortgage.monthlyPayment, incomeRequired);

  const isCompact = variant === "compact";

  return (
    <section
      className={`rounded-2xl border border-gold/30 bg-bg-soft p-5 ${isCompact ? "" : "sm:p-7"}`}
    >
      <header className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
          Plan de financement · {fees.name}
        </p>
        <h3 className="mt-1 font-display text-lg font-bold text-ink">
          Mensualité, frais et aides applicables
        </h3>
      </header>

      {/* Sliders & paramètres */}
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

        <fieldset className="flex gap-4 text-sm">
          <legend className="sr-only">Usage du bien</legend>
          <RadioField
            name="mfs-usage"
            value="residence"
            current={usage}
            onChange={setUsage}
            label="Résidence principale"
          />
          <RadioField
            name="mfs-usage"
            value="locatif"
            current={usage}
            onChange={setUsage}
            label="Investissement locatif"
          />
        </fieldset>
      </div>

      {/* Récapitulatif */}
      <dl className="mt-6 grid gap-3 text-sm">
        <Row label="Prix du bien" value={fmtEur(price)} />
        <Row
          label="Frais d'acquisition bruts"
          value={fmtEur(grossFees)}
          hint={`notaire ${fmtEur(acquisition.notary)} + droits ${fmtEur(acquisition.registration)} + hypothèque ${fmtEur(acquisition.mortgage)}`}
        />

        {applicableAids.length > 0 && (
          <div className="rounded-lg border border-gold/30 bg-bg p-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-deep">
              Aides d'État applicables
            </p>
            <ul className="mt-2 space-y-1.5">
              {applicableAids.map((a) => (
                <li
                  key={a.id}
                  className="flex items-baseline justify-between gap-3"
                >
                  <span className="text-xs text-ink-mid">
                    {a.name}
                    {a.stackable.length > 0 && (
                      <span className="ml-1.5 inline-block rounded bg-gold/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-gold-deep">
                        Cumulable
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-xs font-semibold text-gold-deep">
                    − {fmtEur(aidAmountFor(a, couple))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-line pt-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                Total aides
              </span>
              <span className="font-display text-sm font-bold text-gold-deep">
                − {fmtEur(aidsTotal)}
              </span>
            </div>
          </div>
        )}

        <Row
          label="Frais d'acquisition nets"
          value={fmtEur(netFees)}
          hint={
            aidsTotal > 0
              ? `Économie · ${fmtEur(grossFees - netFees)}`
              : undefined
          }
          hintAccent={aidsTotal > 0}
        />
        <Row label="Capital emprunté" value={fmtEur(mortgage.borrowedAmount)} />
        <Row
          label="Mensualité estimée"
          value={fmtEur(mortgage.monthlyPayment)}
          hint={`taux indicatif ${rate.toFixed(2)} % · ${duration} ans`}
          accent
        />
        <Row
          label="Coût total acquisition (net)"
          value={fmtEur(totalAcquisitionNet)}
        />
        <Row
          label="Revenu mensuel requis (35%)"
          value={fmtEur(incomeRequired)}
          hint={`taux d'endettement cible ${debtRatio.toFixed(0)} %`}
        />
      </dl>

      <Link
        href={`/services/simulateurs/financement?price=${price}&country=${safeCountry}&down=${downPayment}&duration=${duration}&primo=${primoAccedant ? 1 : 0}&couple=${couple ? 1 : 0}&usage=${usage}&neuf=${isNeuf ? 1 : 0}`}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold-deep px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bg transition-colors hover:bg-gold"
      >
        Simuler en détail →
      </Link>

      <p className="mt-3 text-xs leading-relaxed text-ink-soft">
        Information indicative — consulter un notaire pour confirmation.
      </p>
    </section>
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
