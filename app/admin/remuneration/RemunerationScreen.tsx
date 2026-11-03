"use client";

// Ecran "Remuneration" (nov. 2026) : calculs a l'ecran seulement
// (lib/payroll). Les montants saisis ici (net souhaite, brut, revenu et
// impot du partenaire) ne sont ni enregistres, ni envoyes : aucun
// formulaire soumis, aucun nom de champ, aucun stockage du navigateur.

import { useState } from "react";
import { useTranslations } from "next-intl";
import { parseDecimalInput } from "@/lib/admin/sale-commission";
import { PARAMS_2026_LIST } from "@/lib/payroll/lu-parametres-2026";
import { estimationAnnuelleClasse2, isTaxClassSupported } from "@/lib/payroll/lu-salaire";
import { possibilityFromShare, reserveAccount, salaryFromBrut, salaryFromNet, ssmFor, type SalaryView } from "@/lib/payroll/remuneration";

type Props = {
  agent: {
    name: string;
    sharePct: number;
    paysEmployerCharges: boolean;
    taxClass: 1 | 2;
    travelDeduction: number;
    ssmLevel: "non_qualifie" | "qualifie";
    currentNet: number | null;
  };
  employer: { mutualiteRate: number; accidentFactor: number };
  period: { months: number; count: number; notProvided: number; ht: number; agentHt: number; mapaHt: number };
  reserve: { start: string; startLabel: string; cumulAgentHt: number; months: number; sales: number } | null;
};

const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const pct = (n: number) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
const decimalText = (n: number) => n.toFixed(2).replace(".", ",");

const inputCls = "w-full rounded border border-[#3D4F63]/30 bg-white px-3 py-1.5 text-sm focus:border-[#9E7B2A] focus:outline-none";
const labelCls = "font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70";
const cardCls = "rounded-lg border border-[#3D4F63]/20 bg-white p-6";
const titleCls = "font-display text-xl font-bold uppercase tracking-[0.05em]";
const alertCls = "rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[#3D4F63]/10 py-1.5 last:border-b-0">
      <dt className="text-sm text-[#3D4F63]/80">{label}</dt>
      <dd className={`font-mono text-sm ${strong ? "font-bold" : ""}`}>{value}</dd>
    </div>
  );
}

function MoneyInput({ label, value, onChange, invalid, id }: { label: string; value: string; onChange: (v: string) => void; invalid: boolean; id: string }) {
  return (
    <label className="flex flex-col gap-1" htmlFor={id}>
      <span className={labelCls}>{label}</span>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        className={inputCls}
      />
    </label>
  );
}

export function RemunerationScreen({ agent, employer, period, reserve }: Props) {
  const t = useTranslations("admin_remuneration");
  const supported = isTaxClassSupported(agent.taxClass);
  const ssm = ssmFor(agent);

  // "Je choisis mon net" : le dernier champ modifie fixe l'autre.
  const [driver, setDriver] = useState<"net" | "brut">("net");
  const [raw, setRaw] = useState(agent.currentNet !== null ? decimalText(agent.currentNet) : "");
  const value = parseDecimalInput(raw);
  const valueInvalid = value !== null && Number.isNaN(value);
  const salary: SalaryView | null =
    supported && value !== null && !valueInvalid ? (driver === "net" ? salaryFromNet(value, agent, employer) : salaryFromBrut(value, agent, employer)) : null;
  const netField = driver === "net" ? raw : salary ? decimalText(salary.net.net) : "";
  const brutField = driver === "brut" ? raw : salary ? decimalText(salary.net.brut) : "";

  // Estimation annuelle en classe 2 : jamais enregistree.
  const [partnerIncome, setPartnerIncome] = useState("");
  const [partnerTax, setPartnerTax] = useState("");
  const income = parseDecimalInput(partnerIncome);
  const tax = parseDecimalInput(partnerTax);
  const incomeInvalid = income !== null && Number.isNaN(income);
  const taxInvalid = tax !== null && Number.isNaN(tax);
  const brutAnnuel = salary ? Math.round(salary.net.brut * 12 * 100) / 100 : null;
  const class2 =
    brutAnnuel !== null && income !== null && !incomeInvalid && !taxInvalid
      ? estimationAnnuelleClasse2(brutAnnuel, income, tax, { travelDeduction: agent.travelDeduction })
      : null;

  const possible = supported ? possibilityFromShare(period.agentHt, period.mapaHt, period.months, agent, employer) : null;
  const reserveView = supported && reserve && agent.currentNet !== null ? reserveAccount(reserve.cumulAgentHt, reserve.months, agent.currentNet, agent, employer) : null;

  return (
    <div className="space-y-6">
      {!supported && <p className={alertCls}>{t("class1aUnavailable")}</p>}

      {/* 1. Je choisis mon net */}
      <section className={cardCls} data-remuneration="net">
        <h2 className={titleCls}>{t("net.title")}</h2>
        <p className="mt-1 text-xs text-[#3D4F63]/70">{t("net.intro", { name: agent.name, taxClass: agent.taxClass })}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MoneyInput
            id="remuneration-net"
            label={t("net.netField")}
            value={netField}
            invalid={driver === "net" && valueInvalid}
            onChange={(v) => {
              setDriver("net");
              setRaw(v);
            }}
          />
          <MoneyInput
            id="remuneration-brut"
            label={t("net.brutField")}
            value={brutField}
            invalid={driver === "brut" && valueInvalid}
            onChange={(v) => {
              setDriver("brut");
              setRaw(v);
            }}
          />
        </div>
        <div aria-live="polite" className="mt-4">
          {valueInvalid ? (
            <p className={alertCls}>{t("amountInvalid")}</p>
          ) : salary ? (
            <>
              <dl>
                <Row label={t("net.brut")} value={eur(salary.net.brut)} strong />
                <Row label={t("net.employeeContributions")} value={`- ${eur(salary.net.cotisationsSalarie)}`} />
                <Row label={t("net.contributionsDetail")} value={`${eur(salary.net.pension)} · ${eur(salary.net.maladie)} · ${eur(salary.net.dependance)}`} />
                <Row label={t("net.tax", { taxClass: agent.taxClass })} value={`- ${eur(salary.net.impot)}`} />
                <Row label={t("net.credits")} value={`+ ${eur(Math.round((salary.net.creditCis + salary.net.creditCo2) * 100) / 100)}`} />
                <Row label={t("net.net")} value={eur(salary.net.net)} strong />
                <Row label={t("net.employerCharges")} value={eur(salary.employer.charges)} />
                <Row label={t("net.totalCost")} value={eur(salary.employer.coutTotal)} strong />
              </dl>
              {salary.belowSsm && <p className={`mt-3 ${alertCls}`}>{t("alerts.belowSsm", { ssm: eur(ssm) })}</p>}
            </>
          ) : (
            <p className="text-sm text-[#3D4F63]/70">{t("net.empty")}</p>
          )}
        </div>
      </section>

      {/* 2. Mes commissions et ce qu'elles permettent */}
      <section className={cardCls} data-remuneration="commissions">
        <h2 className={titleCls}>{t("commissions.title")}</h2>
        <p className="mt-1 text-xs text-[#3D4F63]/70">{t("commissions.count", { count: period.count, notProvided: period.notProvided })}</p>
        <dl className="mt-4">
          <Row label={t("commissions.ht")} value={eur(period.ht)} strong />
          <Row label={t("commissions.agentShare", { pct: pct(agent.sharePct) })} value={eur(period.agentHt)} />
          <Row label={t("commissions.mapaShare", { pct: pct(Math.round((100 - agent.sharePct) * 100) / 100) })} value={eur(period.mapaHt)} />
        </dl>
        <p className="mt-3 text-sm text-[#3D4F63]/80">{agent.paysEmployerCharges ? t("commissions.paysCharges") : t("commissions.mapaPaysCharges")}</p>
        {possible && (
          <>
            <h3 className="mt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">{t("possible.title", { months: possible.months })}</h3>
            <dl className="mt-2">
              <Row label={t("possible.totalCostPeriod")} value={eur(possible.totalCostPeriod)} strong />
              <Row label={t("possible.totalCostMonthly")} value={eur(possible.salary.employer.coutTotal)} />
              <Row label={t("possible.brut")} value={eur(possible.salary.net.brut)} />
              <Row label={t("possible.net")} value={eur(possible.salary.net.net)} strong />
              {!agent.paysEmployerCharges && (
                <>
                  <Row label={t("possible.chargesOnMapa")} value={`- ${eur(possible.chargesOnMapa)}`} />
                  <Row label={t("possible.mapaRemaining")} value={eur(possible.mapaRemaining)} strong />
                </>
              )}
            </dl>
            {possible.salary.belowSsm && <p className={`mt-3 ${alertCls}`}>{t("alerts.possibleBelowSsm", { ssm: eur(ssm) })}</p>}
            {!agent.paysEmployerCharges && possible.mapaRemaining < 0 && <p className={`mt-3 ${alertCls}`}>{t("alerts.mapaNegative")}</p>}
          </>
        )}
      </section>

      {/* 3. Compte de reserve */}
      <section className={cardCls} data-remuneration="reserve">
        <h2 className={titleCls}>{t("reserve.title")}</h2>
        {reserveView && reserve ? (
          <>
            <p className="mt-1 text-xs text-[#3D4F63]/70">{t("reserve.intro", { start: reserve.startLabel, months: reserveView.months, sales: reserve.sales })}</p>
            <dl className="mt-4">
              <Row label={t("reserve.cumul")} value={eur(reserveView.cumulAgentHt)} />
              <Row label={t(agent.paysEmployerCharges ? "reserve.monthlyCostTotal" : "reserve.monthlyCostBrut", { net: eur(agent.currentNet ?? 0) })} value={eur(reserveView.monthlyCost)} />
              <Row label={t("reserve.spent", { months: reserveView.months })} value={`- ${eur(Math.round(reserveView.monthlyCost * reserveView.months * 100) / 100)}`} />
              <Row label={t("reserve.balance")} value={eur(reserveView.balance)} strong />
              <Row
                label={t("reserve.monthsCovered")}
                value={reserveView.monthsCovered === null ? t("reserve.notApplicable") : t("reserve.monthsValue", { months: pct(Math.max(0, reserveView.monthsCovered)) })}
                strong
              />
            </dl>
            {reserveView.salary.belowSsm && <p className={`mt-3 ${alertCls}`}>{t("alerts.belowSsm", { ssm: eur(ssm) })}</p>}
            {reserveView.short && <p className={`mt-3 ${alertCls}`}>{t("alerts.reserveShort")}</p>}
          </>
        ) : (
          <p className="mt-2 text-sm text-[#3D4F63]/70">{t("reserve.missing")}</p>
        )}
      </section>

      {/* 4. Estimation annuelle en classe 2 */}
      <section className={cardCls} data-remuneration="classe2">
        <h2 className={titleCls}>{t("class2.title")}</h2>
        <p className="mt-1 text-xs text-[#3D4F63]/70">
          {brutAnnuel !== null ? t("class2.intro", { brut: eur(brutAnnuel) }) : t("class2.needsSalary")} {t("class2.neverSaved")}
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MoneyInput id="remuneration-partenaire-revenu" label={t("class2.partnerIncome")} value={partnerIncome} onChange={setPartnerIncome} invalid={incomeInvalid} />
          <MoneyInput id="remuneration-partenaire-impot" label={t("class2.partnerTax")} value={partnerTax} onChange={setPartnerTax} invalid={taxInvalid} />
        </div>
        <div aria-live="polite" className="mt-4">
          {incomeInvalid || taxInvalid ? (
            <p className={alertCls}>{t("amountInvalid")}</p>
          ) : class2 ? (
            <>
              <dl>
                <Row label={t("class2.household")} value={eur(class2.revenuImposableFoyer)} />
                <Row label={t("class2.taxClass2")} value={eur(class2.impotClasse2)} strong />
                <Row label={t("class2.agentWithheld")} value={eur(class2.impotRetenuClasse1)} />
                <Row label={t("class2.partnerWithheld")} value={class2.impotRetenuPartenaire === null ? t("class2.notEntered") : eur(class2.impotRetenuPartenaire)} />
                <Row
                  label={class2.difference > 0 ? t("class2.extra") : t("class2.refund")}
                  value={eur(Math.abs(class2.difference))}
                  strong
                />
              </dl>
              {!class2.differenceComplete && <p className="mt-3 text-sm text-amber-800">{t("class2.incomplete")}</p>}
            </>
          ) : (
            <p className="text-sm text-[#3D4F63]/70">{t("class2.empty")}</p>
          )}
        </div>
      </section>

      {/* Bandeau des parametres */}
      <footer className="border-t border-[#3D4F63]/15 pt-4 text-xs text-[#3D4F63]/70" data-remuneration="parametres">
        <p>{t("footer.notice")}</p>
        <details className="mt-2">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63]/60">{t("footer.details")}</summary>
          <ul className="mt-2 space-y-1">
            {PARAMS_2026_LIST.map((p) => (
              <li key={p.key} className="flex flex-wrap justify-between gap-2">
                <span>{t(`params.${p.key}`)}</span>
                <span className="font-mono">{t(`status.${p.status}`)}</span>
              </li>
            ))}
          </ul>
        </details>
      </footer>
    </div>
  );
}
