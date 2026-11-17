// Taux d'interet BCE (nov. 2026) : lecture d'une reponse fixe de l'API BCE,
// correspondance des durees, valeurs officielles affichees sans
// modification, pas de doublon pour un meme mois, BCE injoignable sans
// effacement, alerte a plus de 3 mois, mentions de source fr/en/de, plus
// aucune ancienne source en dur. Sans reseau ni base : BCE et base simulees.
// Lancement : node --import tsx scripts/test-taux.mts
import { strict as assert } from "node:assert";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:9";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test";

const rates = await import("../lib/rates");
const { getRateForDuration } = await import("../lib/finance-sim");
const { refreshBceRate } = await import("../lib/pilotage/bce");

const root = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
let pass = 0;
let fail = 0;
const test = async (name: string, fn: () => void | Promise<void>) => {
  try {
    await fn();
    pass++;
    console.log(`PASS ${name}`);
  } catch (e) {
    fail++;
    console.log(`FAIL ${name}\n  ${e instanceof Error ? e.message : e}`);
  }
};

// Reponse fixe au format csvdata de data-api.ecb.europa.eu (periode 2026-09,
// valeurs verifiees le 17/11/2026), titres entre guillemets avec virgules.
const HEAD =
  "KEY,FREQ,REF_AREA,BS_REP_SECTOR,BS_ITEM,MATURITY_ORIG,DATA_TYPE_MIR,AMOUNT_CAT,BS_COUNT_SECTOR,CURRENCY_TRANS,IR_BUS_COV,TIME_PERIOD,OBS_VALUE,OBS_STATUS,TITLE";
const row = (mat: string, cov: string, period: string, v: string) =>
  `MIR.M.LU.B.A2C.${mat}.R.A.2250.EUR.${cov},M,LU,B,A2C,${mat},R,A,2250,EUR,${cov},${period},${v},A,"Lending for house purchase, Luxembourg, ${mat}"`;
const SEPT: Record<string, [string, string, string]> = {
  variable_1y: ["F", "N", "3.13"],
  fixed_1_5: ["I", "N", "3.85"],
  fixed_5_10: ["O", "N", "3.97"],
  fixed_over_10: ["P", "N", "4.03"],
  fixed_over_1: ["K", "N", "4.00"],
  average: ["A", "N", "3.55"],
  average_new_only: ["A", "P", "3.56"],
  average_renegotiated: ["A", "R", "3.44"],
};
const CSV_N = [HEAD, ...["variable_1y", "fixed_1_5", "fixed_5_10", "fixed_over_10", "fixed_over_1", "average"].flatMap((k) => {
  const [m, c, v] = SEPT[k];
  return [row(m, c, "2026-08", "3.50"), row(m, c, "2026-09", v)];
})].join("\n");
const CSV_PR = [HEAD, ...["average_new_only", "average_renegotiated"].flatMap((k) => {
  const [m, c, v] = SEPT[k];
  return [row(m, c, "2026-08", "3.50"), row(m, c, "2026-09", v)];
})].join("\n");

const fixedFetcher = (bodies: { n: string; pr: string }) => async (url: string) => ({
  ok: true,
  status: 200,
  text: async () => (url.includes("EUR.P+R") ? bodies.pr : bodies.n),
});

type Row = Record<string, unknown>;
function memoryStore(initial: Row[] = [], opts: { missingColumns?: string[] } = {}) {
  const rows = [...initial];
  let inserts = 0;
  return {
    rows,
    get inserts() {
      return inserts;
    },
    store: {
      async monthExists(month: string) {
        return { exists: rows.some((r) => r.reference_month === month && r.source === rates.ECB_SOURCE) };
      },
      async insert(r: Row) {
        const bad = (opts.missingColumns ?? []).find((c) => c in r);
        if (bad) return { error: { code: "PGRST204", message: `column ${bad}` } };
        inserts++;
        rows.push(r);
        return {};
      },
    },
  };
}

await test("lecture d'une reponse fixe de l'API BCE : 8 valeurs officielles de 2026-09", () => {
  const obs = new Map([...rates.parseEcbCsv(CSV_N), ...rates.parseEcbCsv(CSV_PR)]);
  const latest = rates.latestCompleteMonth(obs);
  assert.ok(latest);
  assert.equal(latest.month, "2026-09");
  assert.deepEqual(latest.official, {
    variable_1y: 3.13, fixed_1_5: 3.85, fixed_5_10: 3.97, fixed_over_10: 4.03,
    fixed_over_1: 4.0, average: 3.55, average_new_only: 3.56, average_renegotiated: 3.44,
  });
});

await test("mois incomplet ignore : une serie sans 2026-09 donne le dernier mois complet", () => {
  const partial = CSV_PR.split("\n").filter((l) => !(l.includes("EUR.R,") && l.includes("2026-09"))).join("\n");
  const obs = new Map([...rates.parseEcbCsv(CSV_N), ...rates.parseEcbCsv(partial)]);
  assert.equal(rates.latestCompleteMonth(obs)?.month, "2026-08");
});

await test("requetes BCE : data-api.ecb.europa.eu, 8 series, sans en-tete identifiant", () => {
  for (const u of rates.ECB_REQUEST_URLS) assert.ok(u.startsWith("https://data-api.ecb.europa.eu/service/data/MIR/"));
  assert.equal(Object.keys(rates.ECB_SERIES).length, 8);
  const src = read("lib/pilotage/bce.ts");
  assert.ok(!/User-Agent|From:|mapaproperty|@/i.test(src.match(/headers:\s*\{[^}]*\}/)?.[0] ?? ""), "en-tete identifiant");
});

await test("enregistrement : cles officielles + cles du simulateur, colonne rate = moyenne", async () => {
  const m = memoryStore();
  const r = await refreshBceRate({ fetcher: fixedFetcher({ n: CSV_N, pr: CSV_PR }), store: m.store });
  assert.equal(r.ok, true);
  assert.equal(r.detail, "inserted_2026-09");
  const saved = m.rows[0] as { reference_month: string; source: string; rate: number; rates: Record<string, number> };
  assert.equal(saved.reference_month, "2026-09");
  assert.equal(saved.source, "Statistiques BCE");
  assert.equal(saved.rate, 3.55);
  assert.equal(saved.rates.variable, 3.13);
  assert.equal(saved.rates.fixed_5, 3.85);
  assert.equal(saved.rates.fixed_10, 3.97);
  for (const k of ["fixed_15", "fixed_20", "fixed_25", "fixed_30"]) assert.equal(saved.rates[k], 4.03);
  for (const k of rates.OFFICIAL_RATE_KEYS) assert.equal(saved.rates[k], rates.FALLBACK_OFFICIAL[k]);
});

await test("pas de doublon pour un meme mois (deuxieme passage : unchanged)", async () => {
  const m = memoryStore();
  const f = fixedFetcher({ n: CSV_N, pr: CSV_PR });
  await refreshBceRate({ fetcher: f, store: m.store });
  const second = await refreshBceRate({ fetcher: f, store: m.store });
  assert.equal(second.detail, "unchanged_2026-09");
  assert.equal(m.inserts, 1);
  assert.equal(m.rows.length, 1);
});

await test("colonnes facultatives absentes : nouvel essai sans series ni captured_at", async () => {
  const m = memoryStore([], { missingColumns: ["series", "captured_at"] });
  const r = await refreshBceRate({ fetcher: fixedFetcher({ n: CSV_N, pr: CSV_PR }), store: m.store });
  assert.equal(r.detail, "inserted_2026-09");
  assert.equal(m.rows.length, 1);
});

await test("BCE injoignable ou en erreur : rien n'est ecrit ni efface, echec signale", async () => {
  const existing = { reference_month: "2026-08", source: rates.ECB_SOURCE, rates: rates.FALLBACK_RATES };
  const m = memoryStore([existing]);
  const down = await refreshBceRate({ fetcher: async () => { throw new Error("network"); }, store: m.store });
  assert.equal(down.ok, false);
  const http = await refreshBceRate({ fetcher: async () => ({ ok: false, status: 503, text: async () => "" }), store: m.store });
  assert.equal(http.ok, false);
  assert.equal(http.detail, "ecb_http_503");
  assert.deepEqual(m.rows, [existing]);
});

await test("tache quotidienne : veille BCE appelee tous les jours, journalisee", () => {
  const src = read("lib/pilotage/daily-task.ts");
  assert.ok(src.includes('results.push(await step("bce_rate", () => refreshBceRate()));'));
  assert.ok(!src.includes("getUTCDate() === 1"));
});

await test("durees : 5 ans 3,85 ; 10 ans 3,97 ; 30 ans 4,03 ; variable 3,13 ; 7 ans interpole", () => {
  const db = { rates: rates.buildRatesJson(rates.FALLBACK_OFFICIAL) };
  assert.equal(getRateForDuration(5, "fixed", db), 3.85);
  assert.equal(getRateForDuration(10, "fixed", db), 3.97);
  assert.equal(getRateForDuration(30, "fixed", db), 4.03);
  assert.equal(getRateForDuration(12, "fixed", db), 4.03);
  assert.equal(getRateForDuration(20, "variable", db), 3.13);
  const seven = getRateForDuration(7, "fixed", db);
  assert.ok(seven > 3.85 && seven < 3.97, `7 ans = ${seven}`);
  assert.equal(seven, Math.round((3.85 + 0.4 * (3.97 - 3.85)) * 100) / 100);
  // Base vide : memes valeurs (secours septembre 2026).
  assert.equal(getRateForDuration(30, "fixed", null), 4.03);
  assert.equal(getRateForDuration(5, "fixed", null), 3.85);
  assert.equal(rates.rateBasis(11, "fixed"), "fixed_over_10");
});

await test("les 8 valeurs officielles affichees sans modification", () => {
  const fr = rates.OFFICIAL_RATE_KEYS.map((k) => rates.formatOfficialRate(rates.FALLBACK_OFFICIAL[k], "fr"));
  assert.deepEqual(fr, ["3,13", "3,85", "3,97", "4,03", "4,00", "3,55", "3,56", "3,44"]);
  const en = rates.OFFICIAL_RATE_KEYS.map((k) => rates.formatOfficialRate(rates.FALLBACK_OFFICIAL[k], "en"));
  assert.deepEqual(en, ["3.13", "3.85", "3.97", "4.03", "4.00", "3.55", "3.56", "3.44"]);
  assert.equal(rates.formatOfficialRate(3.125, "fr"), "3,125");
  const table = read("components/simulators/RatesTable.tsx");
  assert.ok(table.includes("OFFICIAL_RATE_KEYS.map") && table.includes("formatOfficialRate(v, locale)"));
});

await test("base sans ligne BCE (ancienne ligne mai 2026) : valeurs de secours de septembre 2026", () => {
  const old = { rates: { fixed_30: 3.9 }, reference_month: "2026-05", source: "BCL et courtiers Luxembourg agréés" };
  const e = rates.effectiveRates(old);
  assert.equal(e.isFallback, true);
  assert.equal(e.month, "2026-09");
  assert.equal(rates.formatRateMonth(e.month, "fr"), "septembre 2026");
  const ok = rates.effectiveRates({ rates: rates.buildRatesJson(rates.FALLBACK_OFFICIAL), reference_month: "2026-10", source: "Statistiques BCE" });
  assert.equal(ok.isFallback, false);
  assert.equal(ok.month, "2026-10");
  const data = read("lib/data.ts");
  assert.ok(data.includes('.eq("source", ECB_SOURCE)') && data.includes("nullsFirst: false"));
});

await test("alerte a plus de 3 mois", () => {
  const now = new Date("2026-11-17T08:00:00Z");
  assert.equal(rates.isRateStale("2026-09", now), false);
  assert.equal(rates.isRateStale("2026-08", now), false);
  assert.equal(rates.isRateStale("2026-07", now), true);
  assert.equal(rates.isRateStale(null, now), true);
  const sante = read("app/admin/sante/page.tsx");
  assert.ok(sante.includes('t("rates_stale", { month: ratesMonth })'));
  const fr = JSON.parse(read("messages/fr.json"));
  assert.equal(fr.admin_pilotage.rates_stale, "Taux d'intérêt non mis à jour depuis {month}");
});

await test("mention de la source en fr, en, de dans tous les simulateurs et l'estimation", () => {
  const expected: Record<string, string> = {
    fr: "Données marché Luxembourg, {month}. Source : statistiques BCE",
    en: "Luxembourg market data, {month}. Source: ECB statistics",
    de: "Marktdaten Luxemburg, {month}. Quelle: EZB-Statistiken",
  };
  for (const [loc, text] of Object.entries(expected)) {
    const m = JSON.parse(read(`messages/${loc}.json`));
    assert.equal(m.simulators.source_label, text, `${loc} simulators`);
    assert.equal(m.financing_simulator.source_label, text, `${loc} financing`);
    assert.equal(m.acquisition_simulator.source_label, text, `${loc} acquisition`);
    assert.equal(m.borrowing_capacity.source_label, text, `${loc} capacity`);
    assert.equal(m.estimate_form.rate_source, text, `${loc} estimate`);
    assert.equal(m.rendement_locatif.source, text, `${loc} yield`);
    assert.equal(m.simulators_page.rates_source, text, `${loc} table`);
    for (const v of JSON.stringify(m).match(/"rate_basis_[a-z_0-9]+":"[^"]*"|"rates_[a-z_0-9]+":"[^"]*"/g) ?? []) {
      assert.ok(!/[–—]/.test(v), `tiret long : ${v}`);
    }
  }
  const fr = JSON.parse(read("messages/fr.json"));
  assert.equal(fr.simulators.rate_basis_fixed_over_10, "taux moyen des prêts à taux fixe de plus de 10 ans");
  assert.equal(fr.simulators_page.rates_note, "Moyennes des prêts signés, publiées avec environ deux mois de décalage. Le taux de votre banque peut être différent.");
});

await test("plus aucune ancienne source de taux en dur (courtiers, mai 2026)", () => {
  const hits: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(join(root, dir))) {
      const p = join(dir, f);
      if (statSync(join(root, p)).isDirectory()) walk(p);
      else if (/\.(tsx?|json)$/.test(f)) {
        const src = read(p);
        if (/courtiers Luxembourg agréés|courtiers LU|grille courtiers|accredited Luxembourg brokers|zugelassene Luxemburger Makler/i.test(src)) hits.push(p);
        // Dans une meme chaine : source de taux d'interet datee de mai 2026.
        if (/(?:courtier|BCL|taux d'intérêt|taux de crédit|interest rate|Zinss)[^\n"]{0,80}(?:mai|may) 2026|(?:mai|may) 2026[^\n"]{0,80}(?:courtier|BCL|taux d'intérêt|taux de crédit|interest rate|Zinss)/i.test(src) && !p.endsWith("lib/data.ts")) hits.push(`${p} (mai 2026)`);
      }
    }
  };
  for (const d of ["app", "components", "lib", "messages"]) walk(d);
  assert.deepEqual(hits, []);
});

await test("SQL 41 : ajouts seulement, rejouable", () => {
  const sql = read("supabase/sql/41_taux_par_duree.sql").split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.ok(!/\bDROP\b|\bDELETE\b|\bUPDATE\b|ALTER COLUMN|RENAME/i.test(sql));
  assert.equal((sql.match(/ADD COLUMN IF NOT EXISTS/g) ?? []).length, 6);
  assert.ok(sql.includes("CREATE UNIQUE INDEX IF NOT EXISTS interest_rates_bce_month_uk"));
});

console.log(`${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);
