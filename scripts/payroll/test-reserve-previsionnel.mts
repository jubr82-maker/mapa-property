// Correctifs de la remuneration (nov. 2026) : periodes en mois entiers,
// salaire verse le dernier jour du mois, solde de depart de la reserve,
// ventes a venir (jamais refusees, hors realise, dans le previsionnel),
// net d'equilibre. Valeurs de la consigne de Julien. Sans reseau.
// Lancement : node --import tsx scripts/payroll/test-reserve-previsionnel.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { commissionTotals, isUpcomingSale, periodMonths, reserveData, resolvePeriod, splitBySaleDate, summaryByAgent } from "../../lib/admin/sales-summary";
import { DEFAULT_AGENT, agentFromRow, parseAgentInput, parseSignedDecimal, isStartBalanceColumnMissing } from "../../lib/admin/remuneration-reglages";
import { parseSaleInput } from "../../lib/admin/sales-auth";
import { parseSaleCommission } from "../../lib/admin/sale-commission";
import { brutDepuisCoutTotal, brutVersNet, netVersBrut } from "../../lib/payroll/lu-salaire";
import { lastDayOfMonth, possibilityFromShare, reserveAccount, salariesPaid, salariesThroughMonthOf, salaryFromNet } from "../../lib/payroll/remuneration";
import { RemunerationScreen } from "../../app/admin/remuneration/RemunerationScreen";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

// Consigne : 3 720 net, classe 1, frais 1 881, mutualite 0,23 %, facteur 1.
const AGENT = { sharePct: 80, paysEmployerCharges: true, taxClass: 1 as const, travelDeduction: 1881, ssmLevel: "non_qualifie" as const };
const EMP = { mutualiteRate: 0.23, accidentFactor: 1 };
const S = { taxClass: 1 as const, travelDeduction: 1881, mutualiteRate: 0.23, accidentFactor: 1 };
const JULIEN = { ...DEFAULT_AGENT, sharePct: 80, reserveStart: "2026-11-01", startBalance: 19000, currentNet: 3720, travelDeduction: 1881 };
const sale = (date_acte: string, ht: number | null) => ({
  agent: "julien",
  date_acte,
  commission_mode: ht === null ? null : "montant_fixe",
  commission_taux: null,
  commission_ht: ht,
  tva_taux: 17,
});
// Vente anterieure au debut (comprise dans le solde de depart) et vente a
// venir du 11/12/2026 (Mondorf-les-Bains), 16 750 euros HT de commission.
const SALES = [sale("2026-10-15", 10000), sale("2026-12-11", 16750)];

test("cout mensuel du salaire actuel : 5 592,75 euros pour 3 720 euros net", () => {
  assert.equal(salaryFromNet(3720, AGENT, EMP).employer.coutTotal, 5592.75);
});

test("periodes en mois entiers : mois 1, annee 12, annee precedente 12, de date a date, tout", () => {
  const today = "2026-11-03";
  const p = (k: string, du?: string, au?: string) => periodMonths(resolvePeriod(k, du, au, today), "2025-03-20", today);
  assert.equal(p("mois"), 1);
  assert.equal(p("annee"), 12);
  assert.equal(p("annee_precedente"), 12);
  assert.equal(p("dates", "2026-01-01", "2026-12-31"), 12);
  assert.equal(p("dates", "2026-01-15", "2026-03-02"), 3);
  assert.equal(p("dates", "2026-05-10", "2026-05-20"), 1);
  assert.equal(p("dates", "2026-01-01", undefined), 11, "borne de fin absente : mois en cours");
  // Tout : du mois de la premiere vente (mars 2025) au mois en cours (novembre 2026) inclus.
  assert.equal(p("tout"), 21);
  assert.equal(periodMonths(resolvePeriod("tout", undefined, undefined, today), null, today), 1);
  // Entier dans tous les cas.
  for (const k of ["mois", "annee", "annee_precedente", "tout"]) assert.ok(Number.isInteger(p(k)));
  // Les calculs par mois divisent par ce nombre entier.
  assert.equal(possibilityFromShare(67113, 0, p("annee"), AGENT, EMP).monthlyBudget, 5592.75);
});

test("salaire verse le dernier jour du mois : 0, 1 puis 2 salaires deduits", () => {
  assert.equal(lastDayOfMonth("2025-12"), "2025-12-31");
  assert.equal(lastDayOfMonth("2026-02-10"), "2026-02-28");
  assert.equal(lastDayOfMonth("2028-02"), "2028-02-29");
  assert.deepEqual(salariesPaid("2026-11-01", "2026-11-03"), { count: 0, firstMonth: null, lastMonth: null, nextPaymentDate: "2026-11-30" });
  assert.deepEqual(salariesPaid("2026-11-01", "2026-11-29"), { count: 0, firstMonth: null, lastMonth: null, nextPaymentDate: "2026-11-30" });
  assert.deepEqual(salariesPaid("2026-11-01", "2026-11-30"), { count: 1, firstMonth: "2026-11", lastMonth: "2026-11", nextPaymentDate: "2026-12-31" });
  assert.deepEqual(salariesPaid("2026-11-01", "2026-12-30"), { count: 1, firstMonth: "2026-11", lastMonth: "2026-11", nextPaymentDate: "2026-12-31" });
  assert.deepEqual(salariesPaid("2026-11-01", "2026-12-31"), { count: 2, firstMonth: "2026-11", lastMonth: "2026-12", nextPaymentDate: "2027-01-31" });
  // Debut en cours de mois : le salaire de ce mois compte.
  assert.equal(salariesPaid("2026-11-15", "2026-11-30").count, 1);
  // Debut dans le futur : rien.
  assert.equal(salariesPaid("2027-01-01", "2026-11-03").count, 0);
  assert.equal(salariesThroughMonthOf("2026-11-01", "2026-12-11"), 2);
});

test("le 03/11/2026 : reserve 19 000 euros, 0 salaire, 3,4 mois couverts ; vente anterieure non ajoutee", () => {
  const rd = reserveData(SALES, JULIEN, "2026-11-03")!;
  assert.equal(rd.startBalance, 19000);
  assert.equal(rd.cumulAgentHt, 0, "vente du 15/10/2026 deja comprise dans le solde de depart");
  assert.equal(rd.sales, 0);
  assert.equal(rd.paid.count, 0);
  const r = reserveAccount({ startBalance: rd.startBalance, cumulAgentHt: rd.cumulAgentHt, salaries: rd.paid.count, currentNet: 3720 }, AGENT, EMP);
  assert.equal(r.balance, 19000);
  assert.equal(r.monthsCovered, 3.4);
  // 30/11 : 1 salaire ; 31/12 : 2 salaires, et la vente du 11/12 est realisee.
  const nov = reserveData(SALES, JULIEN, "2026-11-30")!;
  assert.equal(nov.paid.count, 1);
  const dec = reserveData(SALES, JULIEN, "2026-12-31")!;
  assert.deepEqual([dec.paid.count, dec.cumulAgentHt, dec.forecast], [2, 13400, null]);
  // Une vente le jour meme de la date de debut s'ajoute.
  assert.equal(reserveData([sale("2026-11-01", 1000)], JULIEN, "2026-11-03")!.cumulAgentHt, 800);
});

test("previsionnel au 31/12/2026 : 19 000 - 2 x 5 592,75 + 13 400 = 21 214,50 euros", () => {
  const rd = reserveData(SALES, JULIEN, "2026-11-03")!;
  assert.deepEqual(rd.forecast, { cumulAgentHt: 13400, sales: 1, lastDate: "2026-12-11", endDate: "2026-12-31", salaries: 2 });
  const f = reserveAccount({ startBalance: rd.startBalance, cumulAgentHt: rd.cumulAgentHt + rd.forecast!.cumulAgentHt, salaries: rd.forecast!.salaries, currentNet: 3720 }, AGENT, EMP);
  assert.equal(f.balance, 21214.5);
  assert.equal(f.balance, Math.round((19000 - 2 * 5592.75 + 13400) * 100) / 100);
});

test("vente du 11/12/2026 : enregistrable, exclue du realise, comptee dans le previsionnel", () => {
  // Enregistrable : aucun controle de date future cote serveur.
  const { insert, error } = parseSaleInput({ property_type: "appartement", surface_habitable: 80, adresse: "Avenue des Bains", commune: "Mondorf-les-Bains", prix_vente: 670000, date_acte: "2026-12-11", agent: "julien" });
  assert.equal(error, undefined);
  assert.equal(insert?.date_acte, "2026-12-11");
  assert.deepEqual(parseSaleCommission({ commission_mode: "montant_fixe", commission_ht: 16750, tva_taux: 17 }, 670000).commission, { commission_mode: "montant_fixe", commission_taux: null, commission_ht: 16750, tva_taux: 17 });
  const form = read("app/admin/ventes-realisees/SaleForm.tsx");
  const dateInput = form.slice(form.indexOf('label={t("form.deedDate")}'), form.indexOf('label={t("form.agent")}'));
  assert.ok(!/\bmax=/.test(dateInput), "aucune date maximale dans le formulaire");
  assert.equal(isUpcomingSale("2026-12-11", "2026-11-03"), true);
  assert.equal(isUpcomingSale("2026-11-03", "2026-11-03"), false);
  // Hors realise : totaux et recapitulatif.
  const { realized, upcoming } = splitBySaleDate(SALES, "2026-11-03");
  assert.deepEqual([realized.length, upcoming.length], [1, 1]);
  assert.equal(commissionTotals(realized).ht, 10000);
  assert.equal(commissionTotals(upcoming).ht, 16750);
  const [r] = summaryByAgent(realized, [JULIEN], 80);
  assert.equal(r.ht, 10000);
  // Annee en cours : 16 750 a venir, pas dans "Mes commissions".
  const yearSales = splitBySaleDate(SALES.filter((s) => s.date_acte >= "2026-01-01" && s.date_acte <= "2026-12-31"), "2026-11-03");
  assert.equal(summaryByAgent(yearSales.realized, [JULIEN], 80)[0].agentHt, 8000);
  assert.equal(summaryByAgent(yearSales.upcoming, [JULIEN], 80)[0].agentHt, 13400);
  // Liste : badge, ligne "A venir" sous les totaux, totaux sur le realise.
  const page = read("app/admin/ventes-realisees/page.tsx");
  assert.ok(page.includes("const saleRecords = split.realized;") && page.includes('t("upcoming.badge")') && page.includes('t("upcoming.total"'));
  const fr = JSON.parse(read("messages/fr.json")).admin_sales;
  assert.equal(fr.upcoming.badge, "À venir");
  assert.ok(fr.upcoming.total.startsWith("À venir : {count, plural, one {# vente} other {# ventes}}, {ht} HT"));
});

test("net d'equilibre : coherent avec netVersBrut et brutDepuisCoutTotal, realise et previsionnel", () => {
  for (const [agentHt, months] of [[8000, 12], [8000 + 13400, 12], [67113, 12], [13400, 2]] as const) {
    const p = possibilityFromShare(agentHt, 0, months, AGENT, EMP);
    const budget = Math.round((agentHt / months) * 100) / 100;
    const viaCost = brutDepuisCoutTotal(budget, S);
    assert.equal(p.salary.net.brut, viaCost.brut);
    assert.equal(p.salary.net.net, brutVersNet(viaCost.brut, S).net);
    // netVersBrut retrouve le meme net, avec le plus petit brut qui le donne
    // (deux bruts voisins peuvent donner le meme net au centime).
    const back = netVersBrut(p.salary.net.net, S);
    assert.equal(back.net, p.salary.net.net, `${agentHt} : net`);
    assert.ok(back.brut <= p.salary.net.brut && p.salary.net.brut - back.brut <= 0.05, `${agentHt} : ${back.brut} pour ${p.salary.net.brut}`);
    assert.ok(p.salary.employer.coutTotal <= budget);
  }
  // Ecran : deux lignes, realise et previsionnel.
  const screen = read("app/admin/remuneration/RemunerationScreen.tsx");
  assert.ok(screen.includes('t("possible.net")') && screen.includes('t("possible.netForecast")'));
});

test("solde de depart : reglage signe, 0 par defaut, colonne absente geree, fichier SQL 34", () => {
  assert.equal(DEFAULT_AGENT.startBalance, 0);
  assert.equal(agentFromRow({ agent_key: "julien" })!.startBalance, 0);
  assert.equal(agentFromRow({ agent_key: "julien", solde_depart_reserve: "19000.00" })!.startBalance, 19000);
  assert.equal(agentFromRow({ agent_key: "julien", solde_depart_reserve: "-350.25" })!.startBalance, -350.25);
  const base = { key: "julien", displayName: "Julien", sharePct: 80, taxClass: 1, travelDeduction: 0, ssmLevel: "non_qualifie" };
  assert.equal(parseAgentInput(base).row?.solde_depart_reserve, 0);
  assert.equal(parseAgentInput({ ...base, startBalance: 19000 }).row?.solde_depart_reserve, 19000);
  assert.equal(parseAgentInput({ ...base, startBalance: -1250.5 }).row?.solde_depart_reserve, -1250.5);
  assert.equal(parseAgentInput({ ...base, startBalance: 1.234 }).error, "start_balance_invalid");
  assert.equal(parseAgentInput({ ...base, startBalance: "19000" }).error, "start_balance_invalid");
  assert.deepEqual([parseSignedDecimal("19 000"), parseSignedDecimal("-1 250,50"), parseSignedDecimal(""), parseSignedDecimal("1,234")].map((x) => (x !== null && Number.isNaN(x) ? "NaN" : x)), [19000, -1250.5, null, "NaN"]);
  assert.ok(isStartBalanceColumnMissing({ code: "PGRST204", message: "Could not find the 'solde_depart_reserve' column" }));
  assert.ok(!isStartBalanceColumnMissing({ code: "PGRST204", message: "Could not find the 'autre' column" }));
  const route = read("app/api/admin/remuneration/reglages/route.ts");
  assert.ok(route.includes("isStartBalanceColumnMissing(a.error)") && route.includes('"start_balance_unavailable"'));
  const sql = read("supabase/sql/34_reserve_solde_depart.sql");
  const code = sql.replace(/--.*$/gm, "");
  assert.ok(code.includes("ALTER TABLE public.mapa_sales_agents ADD COLUMN IF NOT EXISTS solde_depart_reserve NUMERIC(12,2) NOT NULL DEFAULT 0;"));
  assert.ok(/^BEGIN;/m.test(code) && /^COMMIT;/m.test(code) && /ORDER BY 1;\s*$/.test(code));
  assert.ok(!/\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|GRANT|REVOKE)\b/i.test(code));
  const fr = JSON.parse(read("messages/fr.json")).admin_remuneration.settings;
  assert.equal(fr.startBalance, "Solde de départ de la réserve (€)");
  assert.equal(fr.startBalanceHint, "Montant qui revient à l'agent à la date de début, hors TVA et hors part de MAPA Property, après paiement de tous les salaires précédents");
  assert.ok(read("app/admin/remuneration/reglages/SettingsForm.tsx").includes('t("settings.startBalanceHint")'));
});

const frAll = JSON.parse(read("messages/fr.json"));
const { NextIntlClientProvider } = createRequire(import.meta.url)("next-intl") as typeof import("next-intl");
type ScreenProps = Parameters<typeof RemunerationScreen>[0];
const render = (p: ScreenProps) =>
  renderToStaticMarkup(
    createElement(NextIntlClientProvider as unknown as ComponentType<Record<string, unknown>>, { locale: "fr", timeZone: "Europe/Luxembourg", messages: frAll, onError: (e: Error) => { throw e; } }, createElement(RemunerationScreen, p)),
  );
const props = (paid: ScreenProps["reserve"] extends infer R ? (R extends { paid: infer P } ? P : never) : never, forecast: { cumulAgentHt: number; sales: number; endLabel: string; salaries: number } | null): ScreenProps => ({
  agent: { name: "Julien", sharePct: 80, paysEmployerCharges: true, taxClass: 1, travelDeduction: 1881, ssmLevel: "non_qualifie", currentNet: 3720 },
  employer: EMP,
  period: { months: 12, count: 1, notProvided: 0, ht: 10000, agentHt: 8000, mapaHt: 2000, upcoming: { count: 1, ht: 16750, agentHt: 13400, mapaHt: 3350 } },
  reserve: { startLabel: "01/11/2026", startBalance: 19000, cumulAgentHt: 0, sales: 0, paid, forecast },
});

test("ecran : salaires verses, prochain salaire, previsionnel, mois couverts, ventes a venir", () => {
  const nbsp = (s: string) => s.replace(/[  ]/g, " ");
  const html = nbsp(render(props({ count: 0, firstLabel: "", lastLabel: "", nextLabel: "30/11/2026" }, { cumulAgentHt: 13400, sales: 1, endLabel: "31/12/2026", salaries: 2 })));
  assert.ok(html.includes("Aucun salaire versé depuis la date de début."));
  assert.ok(html.includes("Prochain salaire déduit le 30/11/2026."));
  assert.ok(html.includes("Solde de départ au 01/11/2026") && html.includes("19 000,00 €"));
  assert.ok(html.includes("3,4 mois"), "mois couverts au net actuel");
  assert.ok(html.includes('data-remuneration="previsionnel"') && html.includes("Prévisionnel avec les ventes à venir"));
  assert.ok(html.includes("Solde prévisionnel au 31/12/2026") && html.includes("21 214,50 €"));
  assert.ok(html.includes("2 salaires versés d&#x27;ici là") || html.includes("2 salaires versés d'ici là"));
  assert.ok(html.includes("À venir sur la période : 1 vente, 16 750,00 € HT (part de l&#x27;agent 13 400,00 €), non comptées ci-dessus.") || html.includes("À venir sur la période : 1 vente, 16 750,00 € HT (part de l'agent 13 400,00 €), non comptées ci-dessus."));
  assert.ok(html.includes("Net mensuel qui équilibre la période (réalisé)") && html.includes("Net mensuel qui équilibre la période (prévisionnel, avec les ventes à venir)"));
  assert.ok(html.includes("Mois couverts au net actuel"));
  const two = nbsp(render(props({ count: 2, firstLabel: "novembre 2026", lastLabel: "décembre 2026", nextLabel: "31/01/2027" }, null)));
  assert.ok(two.includes("2 salaires versés (de novembre 2026 à décembre 2026).") && two.includes("Prochain salaire déduit le 31/01/2027."));
  assert.ok(two.includes("Aucune vente à venir."));
  const one = nbsp(render(props({ count: 1, firstLabel: "novembre 2026", lastLabel: "novembre 2026", nextLabel: "31/12/2026" }, null)));
  assert.ok(one.includes("1 salaire versé (novembre 2026)."));
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${l}.json`));
    assert.ok(!/[–—]/.test(JSON.stringify([m.admin_remuneration, m.admin_sales])), `${l} : tiret long ou moyen`);
  }
  for (const f of ["lib/payroll/remuneration.ts", "lib/admin/sales-summary.ts", "app/admin/remuneration/RemunerationScreen.tsx", "app/admin/remuneration/page.tsx", "app/admin/ventes-realisees/page.tsx", "supabase/sql/34_reserve_solde_depart.sql"]) assert.ok(!/[–—]/.test(read(f)), f);
});

console.log(`${pass} PASS, 0 FAIL`);
