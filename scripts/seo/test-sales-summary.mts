// Totaux des commissions et recapitulatif par agent (nov. 2026) : periodes,
// totaux HT, TVA, TTC, ventes "Non renseignee", parts agent et MAPA
// Property, reglages par defaut, fichier SQL 33. Sans reseau ni base.
// Lancement : node --import tsx scripts/seo/test-sales-summary.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createTranslator } from "next-intl";
import {
  commissionTotals,
  luxembourgToday,
  monthsInPeriod,
  resolvePeriod,
  splitCommission,
  summaryByAgent,
} from "../../lib/admin/sales-summary";
import {
  ACCIDENT_FACTORS,
  DEFAULT_AGENT,
  DEFAULT_EMPLOYER,
  MUTUALITE_RATES,
  agentFromRow,
  employerFromRow,
  loadEmployerSettings,
  loadSalesAgents,
  saleAgentKey,
} from "../../lib/admin/remuneration-reglages";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  await fn();
  pass++;
  console.log(`PASS ${name}`);
};

const sale = (agent: string, mode: string | null, ht: number | null, vat = 17, taux: number | null = null) => ({
  agent,
  commission_mode: mode,
  commission_taux: taux,
  commission_ht: ht === null ? null : String(ht),
  tva_taux: vat,
});

await test("periodes : mois, annee en cours, annee precedente, tout, de date a date", () => {
  const today = "2026-11-03";
  assert.deepEqual(resolvePeriod("mois", undefined, undefined, today), { key: "mois", from: "2026-11-01", to: "2026-11-30" });
  assert.deepEqual(resolvePeriod("mois", undefined, undefined, "2028-02-10"), { key: "mois", from: "2028-02-01", to: "2028-02-29" });
  assert.deepEqual(resolvePeriod("annee", undefined, undefined, today), { key: "annee", from: "2026-01-01", to: "2026-12-31" });
  assert.deepEqual(resolvePeriod("annee_precedente", undefined, undefined, today), { key: "annee_precedente", from: "2025-01-01", to: "2025-12-31" });
  assert.deepEqual(resolvePeriod("tout", undefined, undefined, today), { key: "tout", from: null, to: null });
  assert.deepEqual(resolvePeriod(undefined, undefined, undefined, today), { key: "tout", from: null, to: null });
  assert.deepEqual(resolvePeriod("n_importe_quoi", undefined, undefined, today), { key: "tout", from: null, to: null });
  assert.deepEqual(resolvePeriod("dates", "2026-03-01", "2026-06-30", today), { key: "dates", from: "2026-03-01", to: "2026-06-30" });
  assert.deepEqual(resolvePeriod("dates", "2026-06-30", "2026-03-01", today), { key: "dates", from: "2026-03-01", to: "2026-06-30" });
  assert.deepEqual(resolvePeriod("dates", "2026-03-01", "", today), { key: "dates", from: "2026-03-01", to: null });
  assert.deepEqual(resolvePeriod("dates", "2026-02-30", "x", today), { key: "tout", from: null, to: null });
  assert.equal(monthsInPeriod("2026-01-01", "2026-12-31"), 12);
  assert.equal(monthsInPeriod("2026-11-01", "2026-11-30"), 1);
  assert.equal(monthsInPeriod("2025-12-15", "2026-01-10"), 2);
  assert.match(luxembourgToday(new Date("2026-12-31T23:30:00Z")), /^2027-01-01$/);
});

await test("totaux HT, TVA, TTC : somme des ventes au centime, ventes sans commission a part", () => {
  const sales = [
    sale("julien", "pourcentage", 15000, 17, 3), // TVA 2550, TTC 17550
    sale("julien", "montant_fixe", 1234.56, 8), // TVA 98,76 (98,7648), TTC 1333,32
    sale("julien", "montant_fixe", 0.05, 17), // TVA 0,01 (0,0085), TTC 0,06
    sale("julien", null, null),
    sale("ancienne_valeur", null, null),
  ];
  const t = commissionTotals(sales);
  assert.deepEqual(t, { count: 5, notProvided: 2, ht: 16234.61, tva: 2648.77, ttc: 18883.38 });
  assert.equal(Math.round((t.ht + t.tva) * 100), Math.round(t.ttc * 100));
  assert.deepEqual(commissionTotals([]), { count: 0, notProvided: 0, ht: 0, tva: 0, ttc: 0 });
  for (const vat of [17, 14, 8, 3, 0]) {
    const one = commissionTotals([sale("julien", "montant_fixe", 1000, vat)]);
    assert.deepEqual([one.ht, one.tva, one.ttc], [1000, vat * 10, 1000 + vat * 10]);
  }
});

await test("parts : 80 % agent, 20 % MAPA Property, au centime, somme exacte", () => {
  assert.deepEqual(splitCommission(15000, 80), { agentHt: 12000, mapaHt: 3000 });
  assert.deepEqual(splitCommission(1234.57, 80), { agentHt: 987.66, mapaHt: 246.91 });
  assert.deepEqual(splitCommission(0.05, 80), { agentHt: 0.04, mapaHt: 0.01 });
  assert.deepEqual(splitCommission(1000, 0), { agentHt: 0, mapaHt: 1000 });
  assert.deepEqual(splitCommission(1000, 100), { agentHt: 1000, mapaHt: 0 });
  assert.deepEqual(splitCommission(0, 80), { agentHt: 0, mapaHt: 0 });
});

await test("recapitulatif par agent : ancienne valeur reattribuee, agent sans vente, part reglee", () => {
  const sales = [sale("julien", "pourcentage", 15000, 17, 3), sale("ancienne_valeur", "montant_fixe", 5000, 17), sale("julien", null, null)];
  const [j] = summaryByAgent(sales, [DEFAULT_AGENT], 80);
  assert.deepEqual(j, { key: "julien", count: 3, notProvided: 1, ht: 20000, tva: 3400, ttc: 23400, sharePct: 80, agentHt: 16000, mapaHt: 4000 });
  const two = summaryByAgent(sales, [{ ...DEFAULT_AGENT, sharePct: 75 }, { ...DEFAULT_AGENT, key: "nouvel_agent" }], 80);
  assert.equal(two.length, 2);
  assert.deepEqual([two[0].agentHt, two[0].mapaHt], [15000, 5000]);
  assert.deepEqual([two[1].key, two[1].count, two[1].ht], ["nouvel_agent", 0, 0]);
  assert.equal(saleAgentKey("ancienne_valeur", ["julien"]), "julien");
  assert.equal(saleAgentKey("julien", ["julien"]), "julien");
  assert.equal(saleAgentKey("nouvel_agent", ["julien", "nouvel_agent"]), "nouvel_agent");
});

await test("reglages : repli par defaut si tables absentes ou vides, valeurs hors regles ignorees", async () => {
  const fake = (result: { data: unknown; error: unknown }) =>
    ({
      from: () => {
        const q = { select: () => q, order: () => Promise.resolve(result), eq: () => q, maybeSingle: () => Promise.resolve(result) };
        return q;
      },
    }) as never;
  assert.deepEqual(await loadSalesAgents(fake({ data: null, error: { code: "42P01" } })), { agents: [DEFAULT_AGENT], source: "unavailable" });
  assert.deepEqual(await loadSalesAgents(fake({ data: [], error: null })), { agents: [DEFAULT_AGENT], source: "defaults" });
  assert.deepEqual(await loadEmployerSettings(fake({ data: null, error: { code: "42P01" } })), { employer: DEFAULT_EMPLOYER, source: "unavailable" });
  assert.deepEqual(await loadEmployerSettings(fake({ data: null, error: null })), { employer: DEFAULT_EMPLOYER, source: "defaults" });
  const saved = await loadSalesAgents(
    fake({ data: [{ agent_key: "julien", display_name: "Julien Brebion", active: true, part_agent_pct: "75.50", paie_charges_patronales: false, classe_impot: 2, frais_deplacement_annuels: "1881.00", niveau_ssm: "qualifie", net_mensuel_actuel: "3720.00", debut_suivi_reserve: "2026-01-01" }], error: null }),
  );
  assert.equal(saved.source, "saved");
  assert.deepEqual(saved.agents[0], { key: "julien", displayName: "Julien Brebion", active: true, sharePct: 75.5, paysEmployerCharges: false, taxClass: 2, travelDeduction: 1881, ssmLevel: "qualifie", currentNet: 3720, reserveStart: "2026-01-01" });
  const bad = agentFromRow({ agent_key: "julien", display_name: " ", part_agent_pct: 140, classe_impot: 3, frais_deplacement_annuels: -5, niveau_ssm: "x", net_mensuel_actuel: -1 })!;
  assert.deepEqual([bad.displayName, bad.sharePct, bad.taxClass, bad.travelDeduction, bad.ssmLevel, bad.currentNet], [null, 80, 1, 0, "non_qualifie", null]);
  assert.equal(agentFromRow({ agent_key: "Julien!" }), null);
  assert.deepEqual(employerFromRow({ mutualite_taux: "0.95", facteur_accident: "1.10" }), { mutualiteRate: 0.95, accidentFactor: 1.1 });
  assert.deepEqual(employerFromRow({ mutualite_taux: 0.5, facteur_accident: 2 }), DEFAULT_EMPLOYER);
  assert.deepEqual([...MUTUALITE_RATES], [0.23, 0.95, 1.56, 2.66]);
  assert.deepEqual([...ACCIDENT_FACTORS], [0.85, 1, 1.1, 1.3, 1.5]);
});

await test("fichier SQL 33 : creations seulement, contraintes exactes, RLS admin, tableau final", () => {
  const sql = read("supabase/sql/33_remuneration_reglages.sql");
  const code = sql.replace(/--.*$/gm, "");
  assert.ok(!/\b(DROP|DELETE|UPDATE|INSERT|TRUNCATE|GRANT|REVOKE)\b/i.test(code));
  assert.ok(/^BEGIN;/m.test(code) && /^COMMIT;/m.test(code));
  assert.ok(code.includes("CREATE TABLE IF NOT EXISTS public.mapa_sales_agents"));
  assert.ok(code.includes("CREATE TABLE IF NOT EXISTS public.mapa_employer_settings"));
  assert.ok(code.includes("part_agent_pct NUMERIC(5,2) NOT NULL DEFAULT 80"));
  assert.ok(code.includes("paie_charges_patronales BOOLEAN NOT NULL DEFAULT true"));
  assert.ok(code.includes("CHECK (classe_impot IN (1, 2))"));
  assert.ok(code.includes("CHECK (niveau_ssm IN ('non_qualifie', 'qualifie'))"));
  assert.ok(code.includes("mutualite_taux NUMERIC(4,2) NOT NULL DEFAULT 0.23"));
  assert.ok(code.includes("CHECK (mutualite_taux IN (0.23, 0.95, 1.56, 2.66))"));
  assert.ok(code.includes("facteur_accident NUMERIC(4,2) NOT NULL DEFAULT 1,"));
  assert.ok(code.includes("CHECK (facteur_accident IN (0.85, 1, 1.1, 1.3, 1.5))"));
  assert.equal((code.match(/ENABLE ROW LEVEL SECURITY/g) ?? []).length, 2);
  assert.equal((code.match(/USING \(public\.is_mapa_admin\(\)\)\s+WITH CHECK \(public\.is_mapa_admin\(\)\)/g) ?? []).length, 2);
  assert.ok(!/\banon\b/.test(code));
  assert.ok(/ORDER BY 1;\s*$/.test(code));
});

await test("liste des ventes : filtres, totaux, recapitulatif, formulaire ; traductions sans tiret long", () => {
  const page = read("app/admin/ventes-realisees/page.tsx");
  assert.ok(page.includes("loadSalesAgents(supabase)") && page.includes('name="periode"') && page.includes('name="du"') && page.includes('name="au"'));
  assert.ok(page.includes("commissionTotals(saleRecords)") && page.includes("summaryByAgent(") && page.includes("data-sales-totals"));
  assert.ok(!page.includes("<option value=\"julien\">"), "liste des agents issue des reglages");
  assert.ok(!/AdminNotice kind="(agents|remuneration)/.test(page));
  const form = read("app/admin/ventes-realisees/SaleForm.tsx");
  assert.ok(form.includes('commissionValue !== null && percent ? t("form.commissionNeedsPrice") : t("form.commissionNone")'));
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${l}.json`)).admin_sales;
    const all = JSON.stringify([m.filters, m.totals, m.recap, m.form.commissionNeedsPrice]);
    assert.ok(!/[–—]/.test(all), l);
    for (const k of ["period", "periodMonth", "periodYear", "periodPrevYear", "periodAll", "periodDates", "from", "to", "periodRange", "periodAllText"]) assert.ok(m.filters[k], `${l} filters.${k}`);
    for (const k of ["title", "ht", "tva", "ttc", "notProvided"]) assert.ok(m.totals[k], `${l} totals.${k}`);
    for (const k of ["title", "sales", "notProvided", "ht", "ttc", "agentShare", "mapaShare", "share", "defaults"]) assert.ok(m.recap[k], `${l} recap.${k}`);
  }
  const fr = JSON.parse(read("messages/fr.json")).admin_sales;
  assert.equal(fr.form.commissionNeedsPrice, "Indiquez le prix de vente pour calculer la commission.");
  assert.equal(fr.filters.allAgents, "Tous");
  const tr = createTranslator({ locale: "fr", messages: { t: fr.totals } as never, namespace: "t" as never });
  const np = (count: number, total: number) => (tr as unknown as (k: string, v: object) => string)("notProvided", { count, total });
  assert.equal(np(0, 0), "Aucune vente affichée.");
  assert.equal(np(0, 4), "Toutes les ventes affichées ont une commission renseignée.");
  assert.equal(np(1, 4), "1 vente sur 4 « Non renseignée » : comptée dans le nombre de ventes, pas dans les montants.");
  assert.equal(np(4, 4), "4 ventes sur 4 « Non renseignée » : comptées dans le nombre de ventes, pas dans les montants.");
});

console.log(`${pass} PASS, 0 FAIL`);
