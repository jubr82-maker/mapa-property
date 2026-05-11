"use client";

import { useMemo, useState } from "react";
import {
  computeMortgage,
  computeDebtRatio,
  fmtEur,
  DEFAULT_RATES_BY_COUNTRY,
} from "@/lib/finance-sim";
import {
  LEGAL_FEES,
  computeAcquisitionCosts,
  computeMaxAidsDeduction,
  type CountryCode,
} from "@/lib/legal-fees";

interface Props {
  initial: {
    price: number;
    country: CountryCode;
    down: number;
    duration: number;
  };
}

export function FinancingSimulator({ initial }: Props) {
  const [price, setPrice] = useState(initial.price);
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [downPayment, setDownPayment] = useState(initial.down);
  const [duration, setDuration] = useState(initial.duration);
  const [income, setIncome] = useState(8000);
  const [persons, setPersons] = useState(1);

  const fees = LEGAL_FEES[country];
  const rate = DEFAULT_RATES_BY_COUNTRY[country] ?? 3.85;

  const mortgage = useMemo(
    () => computeMortgage({ price, downPayment, rateAnnual: rate, durationYears: duration }),
    [price, downPayment, rate, duration],
  );
  const acquisition = useMemo(() => computeAcquisitionCosts(price, country), [price, country]);
  const totalCash = downPayment + acquisition.total;
  const aidsTotal = computeMaxAidsDeduction(country, persons);
  const debtRatio = computeDebtRatio(mortgage.monthlyPayment, income);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      {/* Form */}
      <section className="rounded-2xl border border-line bg-bg-soft p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-ink">Paramètres</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Pays du bien">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as CountryCode)}
              className={inputCls}
            >
              {(Object.keys(LEGAL_FEES) as CountryCode[]).map((c) => (
                <option key={c} value={c}>
                  {LEGAL_FEES[c].name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prix du bien (€)">
            <input
              type="number"
              min="0"
              step="10000"
              value={price}
              onChange={(e) => setPrice(Math.max(0, Number(e.target.value) || 0))}
              className={inputCls}
            />
          </Field>
          <Field label="Apport (€)">
            <input
              type="number"
              min="0"
              step="10000"
              value={downPayment}
              onChange={(e) => setDownPayment(Math.max(0, Number(e.target.value) || 0))}
              className={inputCls}
            />
          </Field>
          <Field label="Durée (années)">
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={inputCls}
            >
              {[10, 15, 20, 25, 30].map((d) => (
                <option key={d} value={d}>
                  {d} ans
                </option>
              ))}
            </select>
          </Field>
          <Field label="Revenu mensuel (€)">
            <input
              type="number"
              min="0"
              step="500"
              value={income}
              onChange={(e) => setIncome(Math.max(0, Number(e.target.value) || 0))}
              className={inputCls}
            />
          </Field>
          <Field label="Nombre d'acquéreurs">
            <input
              type="number"
              min="1"
              max="4"
              value={persons}
              onChange={(e) => setPersons(Math.max(1, Number(e.target.value) || 1))}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* Results */}
      <section className="rounded-2xl border border-gold/40 bg-bg p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-ink">Résultats</h2>

        <dl className="mt-5 space-y-4">
          <Big label="Mensualité estimée" value={fmtEur(mortgage.monthlyPayment)} />
          <Row label={`Taux indicatif ${fees.name}`} value={`${rate.toFixed(2)} %`} />
          <Row label="Capital emprunté" value={fmtEur(mortgage.borrowedAmount)} />
          <Row label="Coût total intérêts" value={fmtEur(mortgage.totalInterest)} />
          <Row
            label="Taux d'endettement"
            value={`${debtRatio.toFixed(1)} %`}
            warn={debtRatio > 35}
          />
          <hr className="border-line/60" />
          <Row label="Droits d'enregistrement" value={fmtEur(acquisition.registration)} />
          <Row label="Honoraires notaire" value={fmtEur(acquisition.notary)} />
          <Row label="Frais hypothécaires + dossier" value={fmtEur(acquisition.mortgage)} />
          <Row label="Coût total acquisition" value={fmtEur(totalCash)} bold />
          {aidsTotal > 0 && (
            <Row
              label={`Aides applicables (max, ${persons} acquéreur${persons > 1 ? "s" : ""})`}
              value={`−${fmtEur(aidsTotal)}`}
              accent
            />
          )}
        </dl>

        {fees.notes && (
          <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {fees.notes}
          </p>
        )}
      </section>

      {/* Aides */}
      <section className="lg:col-span-2 rounded-2xl border border-line bg-bg p-6 sm:p-8">
        <h2 className="font-display text-xl font-bold text-ink">
          Aides applicables — {fees.name}
        </h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {fees.aids.map((aid) => (
            <li
              key={aid.name}
              className="rounded-xl border border-line bg-bg-soft p-4"
            >
              <p className="font-display text-base font-bold text-ink">{aid.name}</p>
              {(aid.amount_per_person || aid.amount || aid.max_amount) && (
                <p className="mt-1 font-mono text-xs text-gold-deep">
                  {aid.amount_per_person
                    ? `${fmtEur(aid.amount_per_person)} / acquéreur`
                    : aid.amount
                      ? fmtEur(aid.amount)
                      : aid.max_amount
                        ? `jusqu'à ${fmtEur(aid.max_amount)}`
                        : ""}
                </p>
              )}
              {aid.conditions && (
                <p className="mt-2 text-xs leading-relaxed text-ink-mid">
                  {aid.conditions}
                </p>
              )}
              {aid.legal_ref && (
                <p className="mt-1 text-[10px] text-ink-soft">{aid.legal_ref}</p>
              )}
              {aid.source_url && (
                <a
                  href={aid.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.2em] text-gold-deep hover:underline"
                >
                  Source officielle ↗
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* Amortissement */}
      {mortgage.schedule.length > 0 && (
        <section className="lg:col-span-2 rounded-2xl border border-line bg-bg p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold text-ink">
            Schéma d&apos;amortissement (échantillon)
          </h2>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-bg-soft text-left font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                <tr>
                  <th className="px-3 py-2">Mois</th>
                  <th className="px-3 py-2 text-right">Capital</th>
                  <th className="px-3 py-2 text-right">Intérêts</th>
                  <th className="px-3 py-2 text-right">Restant dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {mortgage.schedule.map((line) => (
                  <tr key={line.month}>
                    <td className="px-3 py-2 font-mono">{line.month}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmtEur(line.principal)}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-soft">
                      {fmtEur(line.interest)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmtEur(line.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="lg:col-span-2 text-[11px] leading-relaxed text-ink-soft">
        Disclaimer : simulation indicative à titre d&apos;information. Les
        montants ne constituent pas une offre de prêt. Les taux pratiqués par
        les banques varient selon le profil emprunteur, l&apos;apport, la
        garantie, le type de bien et la conjoncture. Pour une étude
        personnalisée, contactez MAPA Property pour un rendez-vous avec un
        partenaire bancaire qualifié.
      </p>
    </div>
  );
}

const inputCls =
  "block w-full rounded-md border border-line bg-bg px-3 py-2 font-mono text-sm text-ink focus:border-gold focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Row({
  label,
  value,
  bold,
  warn,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  warn?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </dt>
      <dd
        className={`font-mono text-sm ${
          accent
            ? "text-gold-deep font-bold"
            : warn
              ? "text-amber-700 font-bold"
              : bold
                ? "text-ink font-bold"
                : "text-ink"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
        {label}
      </p>
      <p className="mt-1 font-display text-4xl font-black gold-text sm:text-5xl">
        {value}
      </p>
    </div>
  );
}
