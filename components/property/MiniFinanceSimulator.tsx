"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  computeMortgage,
  computeDebtRatio,
  fmtEur,
  DEFAULT_RATES_BY_COUNTRY,
} from "@/lib/finance-sim";
import { LEGAL_FEES, type CountryCode, computeAcquisitionCosts } from "@/lib/legal-fees";

interface Props {
  price: number;
  country: CountryCode;
  variant?: "default" | "compact";
}

export function MiniFinanceSimulator({ price, country, variant = "default" }: Props) {
  // Apimo peut envoyer "Luxembourg" ou un code non listé : fallback LU pour
  // éviter le crash si la clé n'est pas dans LEGAL_FEES.
  const safeCountry: CountryCode = LEGAL_FEES[country] ? country : "LU";
  const [downPayment, setDownPayment] = useState(Math.round(price * 0.2));
  const [duration, setDuration] = useState(25);
  const rate = DEFAULT_RATES_BY_COUNTRY[safeCountry] ?? 3.85;
  const fees = LEGAL_FEES[safeCountry];

  const mortgage = useMemo(
    () => computeMortgage({ price, downPayment, rateAnnual: rate, durationYears: duration }),
    [price, downPayment, rate, duration],
  );

  const acquisition = useMemo(() => computeAcquisitionCosts(price, safeCountry), [price, safeCountry]);

  // Hypothèse revenu : taux d'endettement 35% max → revenu mensuel requis
  const incomeRequired = mortgage.monthlyPayment / 0.35;
  const debtRatio = computeDebtRatio(mortgage.monthlyPayment, incomeRequired);

  return (
    <section
      className={`rounded-2xl border border-gold/30 bg-bg-soft p-5 ${variant === "compact" ? "" : "sm:p-7"}`}
    >
      <header className="mb-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
          Mini-simulation · {fees.name}
        </p>
        <h3 className="mt-1 font-display text-lg font-bold text-ink">
          Estimer votre mensualité
        </h3>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            Apport (€)
          </span>
          <input
            type="number"
            min="0"
            step="10000"
            value={downPayment}
            onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value) || 0))}
            className="mt-1 block w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            Durée (années)
          </span>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm"
          >
            {[15, 20, 25, 30].map((d) => (
              <option key={d} value={d}>
                {d} ans
              </option>
            ))}
          </select>
        </label>
      </div>

      <dl className="mt-5 grid gap-3 text-sm">
        <Row label="Mensualité estimée" value={fmtEur(mortgage.monthlyPayment)} accent />
        <Row label={`Taux indicatif ${fees.name}`} value={`${rate.toFixed(2)} %`} />
        <Row label="Capital emprunté" value={fmtEur(mortgage.borrowedAmount)} />
        <Row
          label="Coût d'acquisition (frais)"
          value={fmtEur(acquisition.total)}
          hint={`dont notaire ${fmtEur(acquisition.notary)} + droits ${fmtEur(acquisition.registration)}`}
        />
        <Row
          label="Revenu mensuel requis (35%)"
          value={fmtEur(incomeRequired)}
          hint={`taux d'endettement cible ${debtRatio.toFixed(0)} %`}
        />
      </dl>

      <Link
        href={`/services/simulateurs/financement?price=${price}&country=${country}&down=${downPayment}&duration=${duration}`}
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-gold-deep px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.2em] text-bg transition-colors hover:bg-gold"
      >
        Simuler en détail →
      </Link>

      <p className="mt-3 text-[11px] leading-relaxed text-ink-soft">
        Simulation indicative — taux indicatif {fees.name}, ne constitue pas une offre
        de prêt. Détail complet avec aides applicables sur la page financement.
      </p>
    </section>
  );
}

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
        {hint && <span className="block text-[10px] text-ink-soft/80">{hint}</span>}
      </dd>
    </div>
  );
}
