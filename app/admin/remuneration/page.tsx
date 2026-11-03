// Page admin : remuneration d'un agent (nov. 2026). Meme garde que les
// ventes realisees (requireSalesAdminPage : comptes de la liste, double
// authentification). Lit les commissions des ventes et les reglages
// (supabase/sql/33, repli sur les reglages par defaut) ; tous les calculs
// de salaire se font a l'ecran (lib/payroll), rien n'est enregistre ici.

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireSalesAdminPage } from "@/lib/admin/sales-auth";
import { ADMIN_LOCALE, formatDateOnly } from "@/lib/datetime";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { SALE_AGENT_KEYS, loadEmployerSettings, loadSalesAgents, saleAgentKey } from "@/lib/admin/remuneration-reglages";
import { luxembourgToday, monthsInPeriod, resolvePeriod, summaryByAgent, type PeriodKey } from "@/lib/admin/sales-summary";
import { RemunerationScreen } from "./RemunerationScreen";

export const dynamic = "force-dynamic";

const PERIOD_LABEL: Record<PeriodKey, string> = {
  mois: "filters.periodMonth",
  annee: "filters.periodYear",
  annee_precedente: "filters.periodPrevYear",
  tout: "filters.periodAll",
  dates: "filters.periodDates",
};

type SearchParams = { agent?: string; periode?: string; du?: string; au?: string };
type SaleRow = { agent: string; date_acte: string } & Record<string, unknown>;

export default async function RemunerationPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { supabase } = await requireSalesAdminPage("/admin/remuneration");
  const t = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_remuneration" });
  const ts = await getTranslations({ locale: ADMIN_LOCALE, namespace: "admin_sales" });

  const params = await searchParams;
  const today = luxembourgToday();
  const [{ agents: savedAgents, source: agentsSource }, { employer, source: employerSource }] = await Promise.all([
    loadSalesAgents(supabase),
    loadEmployerSettings(supabase),
  ]);
  const agents = savedAgents.filter((a) => SALE_AGENT_KEYS.includes(a.key));
  const agent = agents.find((a) => a.key === params.agent) ?? agents.find((a) => a.active) ?? agents[0];
  const agentName = (key: string) => {
    const a = agents.find((x) => x.key === key);
    return a?.displayName ?? (SALE_AGENT_KEYS.includes(key) ? ts(`agent.${key}`) : key);
  };
  // Periode : annee en cours par defaut.
  const period = resolvePeriod(params.periode ?? "annee", params.du, params.au, today);

  // Commissions : toutes les ventes (agent, date, commission), filtrees ici.
  const COLS = "agent, date_acte, commission_mode, commission_taux, commission_ht, tva_taux";
  let commissionMissing = false;
  const read = (select: string) => supabase.from("mapa_historical_sales").select(select).order("date_acte", { ascending: true }).limit(5000);
  let res = await read(COLS);
  if (res.error) {
    commissionMissing = true;
    res = await read("agent, date_acte");
  }
  const loadError = !!res.error;
  const keys = agents.map((a) => a.key);
  const mine = ((res.data ?? []) as unknown as SaleRow[]).filter((r) => saleAgentKey(r.agent, keys) === agent.key);
  const inRange = (from: string | null, to: string | null) => mine.filter((r) => (!from || r.date_acte >= from) && (!to || r.date_acte <= to));

  const periodSales = inRange(period.from, period.to);
  const [summary] = summaryByAgent(periodSales, [agent], agent.sharePct);
  // Mois de la periode ; bornes ouvertes : premiere vente de l'agent, aujourd'hui.
  const from = period.from ?? mine[0]?.date_acte ?? today;
  const to = period.to ?? today;
  const months = monthsInPeriod(from, to < from ? from : to);

  // Reserve : depuis le debut du suivi jusqu'a aujourd'hui.
  const reserve = agent.reserveStart && agent.reserveStart <= today
    ? (() => {
        const [r] = summaryByAgent(inRange(agent.reserveStart, today), [agent], agent.sharePct);
        return { start: agent.reserveStart, cumulAgentHt: r.agentHt, months: monthsInPeriod(agent.reserveStart, today), sales: r.count };
      })()
    : null;

  const inputCls = "w-full rounded border border-[#3D4F63]/30 bg-white px-3 py-1.5 text-sm focus:border-[#9E7B2A] focus:outline-none";
  const labelCls = "font-mono text-[10px] uppercase tracking-[0.15em] text-[#3D4F63]/70";

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold uppercase tracking-[0.05em]">{t("title")}</h1>
          <p className="mt-2 text-sm text-[#3D4F63]/80">{t("intro")}</p>
        </div>
        <Link
          href="/admin/remuneration/reglages"
          className="rounded border border-[#3D4F63]/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#3D4F63] hover:bg-[#3D4F63]/5"
        >
          {t("settingsLink")}
        </Link>
      </header>

      {loadError && <AdminNotice kind="read_error" />}
      {!loadError && commissionMissing && <AdminNotice kind="commission" />}
      {(agentsSource !== "saved" || employerSource !== "saved") && (
        <p className="text-xs text-[#3D4F63]/70">{t("defaultsNotice")}</p>
      )}

      <form method="get" className="grid grid-cols-1 gap-3 rounded-lg border border-[#3D4F63]/20 bg-white p-5 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1">
          <span className={labelCls}>{t("agent")}</span>
          <select name="agent" defaultValue={agent.key} className={inputCls}>
            {agents.map((a) => (
              <option key={a.key} value={a.key}>
                {agentName(a.key)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>{ts("filters.period")}</span>
          <select name="periode" defaultValue={period.key} className={inputCls}>
            {(["mois", "annee", "annee_precedente", "tout", "dates"] as const).map((k) => (
              <option key={k} value={k}>
                {ts(PERIOD_LABEL[k])}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>{ts("filters.from")}</span>
          <input type="date" name="du" defaultValue={period.key === "dates" ? (period.from ?? "") : ""} className={inputCls} />
        </label>
        <label className="flex flex-col gap-1">
          <span className={labelCls}>{ts("filters.to")}</span>
          <input type="date" name="au" defaultValue={period.key === "dates" ? (period.to ?? "") : ""} className={inputCls} />
        </label>
        <div className="flex items-end">
          <button type="submit" className="w-full rounded bg-[#3D4F63] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white">
            {ts("filters.apply")}
          </button>
        </div>
        <p className="text-xs text-[#3D4F63]/60 sm:col-span-2 lg:col-span-5">
          {t("periodText", { from: formatDateOnly(from), to: formatDateOnly(to), months })} {ts("filters.datesHint")}
        </p>
      </form>

      <RemunerationScreen
        agent={{
          name: agentName(agent.key),
          sharePct: agent.sharePct,
          paysEmployerCharges: agent.paysEmployerCharges,
          taxClass: agent.taxClass,
          travelDeduction: agent.travelDeduction,
          ssmLevel: agent.ssmLevel,
          currentNet: agent.currentNet,
        }}
        employer={employer}
        period={{ months, count: summary.count, notProvided: summary.notProvided, ht: summary.ht, agentHt: summary.agentHt, mapaHt: summary.mapaHt }}
        reserve={reserve ? { ...reserve, startLabel: formatDateOnly(reserve.start) } : null}
      />
    </div>
  );
}
