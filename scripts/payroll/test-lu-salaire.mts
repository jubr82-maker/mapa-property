// Moteur de calcul salaire Luxembourg 2026 (nov. 2026) : calage sur
// l'extrait de compte salaire 2025 de Julien, cas 2026, aller-retour net
// brut, plafond cotisable, credits d'impot, classe 2. Sans reseau.
// Lancement : node --import tsx scripts/payroll/test-lu-salaire.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PARAMS_2026, PARAMS_2026_LIST, type LuPayrollParams } from "../../lib/payroll/lu-parametres-2026";
import {
  baremeClasse1,
  brutDepuisCoutTotal,
  brutVersNet,
  cotisationsSalarie,
  coutEmployeur,
  creditCisAnnuel,
  creditCo2Annuel,
  estimationAnnuelleClasse2,
  impotAnnuel,
  isTaxClassSupported,
  netVersBrut,
  revenuImposableAnnuel,
} from "../../lib/payroll/lu-salaire";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};
const near = (actual: number, expected: number, tol: number, what: string) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${what} : ${actual} au lieu de ${expected} (tolerance ${tol})`);

const JULIEN = { taxClass: 1 as const, travelDeduction: 1881 };
const EMPLOYEUR = { mutualiteRate: 0.23, accidentFactor: 1 };

test("parametres 2026 : valeurs de la consigne", () => {
  const p = PARAMS_2026;
  assert.deepEqual([p.indice, p.ssmNonQualifie, p.ssmQualifie, p.plafondMensuel], [992.24, 2771.33, 3325.59, 13856.63]);
  assert.deepEqual([p.pensionSalarie, p.maladieSalarie, p.dependanceSalarie, p.dependanceAbattementMensuel], [0.085, 0.0305, 0.014, 692.83]);
  assert.deepEqual([p.pensionEmployeur, p.maladieEmployeur, p.accidentEmployeur, p.santeTravailEmployeur], [0.085, 0.0305, 0.0065, 0.0014]);
  assert.deepEqual([p.fondsEmploiTaux, p.fondsEmploiTauxMajore, p.fondsEmploiSeuilClasse1, p.fondsEmploiSeuilClasse2], [0.07, 0.09, 150000, 300000]);
  assert.deepEqual([p.forfaitFraisObtention, p.forfaitDepensesSpeciales], [540, 480]);
  const b = p.baremeClasse1;
  assert.deepEqual(b.slice(0, 7).map((x) => [x.upTo, Math.round(x.rate * 100)]), [[13230, 0], [15435, 8], [17640, 9], [19845, 10], [22050, 11], [24255, 12], [26550, 14]]);
  const steps = b.slice(7, 19);
  assert.deepEqual(steps.map((x) => Math.round(x.rate * 100)), [16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38]);
  assert.deepEqual([steps[0].upTo, steps[1].upTo, steps[11].upTo], [28845, 31140, 54090]);
  assert.deepEqual(b.slice(19).map((x) => [x.upTo, Math.round(x.rate * 100)]), [[117450, 39], [176160, 40], [234870, 41], [Infinity, 42]]);
  // Chaque parametre porte un commentaire de source et de statut.
  const src = read("lib/payroll/lu-parametres-2026.ts");
  for (const k of ["indice:", "ssmNonQualifie:", "plafondMensuel:", "pensionSalarie:", "dependanceSalarie:", "pensionEmployeur:", "accidentEmployeur:", "santeTravailEmployeur:", "baremeClasse1:", "fondsEmploiTaux:", "forfaitFraisObtention:", "cis:", "co2:"]) {
    const before = src.slice(0, src.lastIndexOf(`  ${k}`)).split("\n").slice(-6).join("\n");
    assert.ok(/Source/.test(before) || /Verifie|Suppose/.test(before), `commentaire avant ${k}`);
    assert.ok(/Verifie|Suppose/.test(before), `statut avant ${k}`);
  }
  assert.ok(PARAMS_2026_LIST.length >= 10 && PARAMS_2026_LIST.every((x) => x.status === "verifie" || x.status === "suppose"));
});

test("calage extrait 2025 de Julien (pension a 8 %) : cotisations, credit d'impot, impot annuel", () => {
  const p2025: LuPayrollParams = { ...PARAMS_2026, pensionSalarie: 0.08 };
  const brutAnnuel = 57245.73;
  const { cotisationsDeductibles, revenuImposable } = revenuImposableAnnuel(brutAnnuel, 1881, p2025);
  near(cotisationsDeductibles, 6325.6, 1, "cotisations deductibles");
  assert.equal(creditCisAnnuel(brutAnnuel, p2025), 341.31);
  near(impotAnnuel(revenuImposable, 1, p2025), 7114.2, 15, "impot annuel");
  // La dependance n'est pas deduite du revenu imposable.
  assert.equal(revenuImposable, Math.round((brutAnnuel - cotisationsDeductibles - 1881 - 540 - 480) * 100) / 100);
});

test("2026, classe 1, frais 1 881 euros : brut 4 968 euros, net 3 720 a 5 euros pres, cout employeur environ 5 593", () => {
  const r = brutVersNet(4968, JULIEN);
  near(r.net, 3720, 5, "net");
  assert.deepEqual([r.pension, r.maladie, r.dependance], [422.28, 151.52, 59.85]);
  assert.equal(r.cotisationsSalarie, 633.65);
  assert.equal(r.net, Math.round((r.brut - r.cotisationsSalarie - r.impot + r.creditCis + r.creditCo2) * 100) / 100);
  const c = coutEmployeur(4968, EMPLOYEUR);
  near(c.coutTotal, 5593, 1, "cout employeur");
  assert.deepEqual([c.pension, c.maladie, c.accident, c.santeTravail, c.mutualite], [422.28, 151.52, 32.29, 6.96, 11.43]);
  assert.equal(c.coutTotal, Math.round((4968 + c.charges) * 100) / 100);
  // Facteur et mutualite pris en compte.
  const c2 = coutEmployeur(4968, { mutualiteRate: 2.66, accidentFactor: 1.5 });
  assert.equal(c2.accident, 48.44);
  assert.equal(c2.mutualite, 132.15);
});

test("aller-retour : netVersBrut puis brutVersNet retombe sur le meme net a 1 centime pres", () => {
  for (const taxClass of [1, 2] as const) {
    for (const net of [0, 500, 1800, 2500, 3000, 3720, 4321.99, 6000, 8000, 12000, 25000]) {
      const r = netVersBrut(net, { taxClass, travelDeduction: 1881 });
      near(brutVersNet(r.brut, { taxClass, travelDeduction: 1881 }).net, net, 0.01, `classe ${taxClass}, net ${net}`);
      if (r.brut > 0) assert.ok(brutVersNet(r.brut - 0.01, { taxClass, travelDeduction: 1881 }).net < net, `plus petit brut, net ${net}`);
    }
  }
  near(netVersBrut(3720, JULIEN).brut, 4968, 10, "brut pour 3 720 net");
});

test("plafond cotisable : pension et maladie bloquees au-dessus de 13 856,63 euros, dependance non plafonnee", () => {
  const a = cotisationsSalarie(13856.63);
  const b = cotisationsSalarie(20000);
  assert.deepEqual([a.pension, a.maladie], [1177.81, 422.63]);
  assert.deepEqual([b.pension, b.maladie], [1177.81, 422.63]);
  assert.equal(b.dependance, Math.round((20000 - 692.83) * 0.014 * 100) / 100);
  assert.ok(b.dependance > a.dependance);
  const e1 = coutEmployeur(13856.63, EMPLOYEUR);
  const e2 = coutEmployeur(30000, EMPLOYEUR);
  assert.equal(e1.charges, e2.charges);
  assert.equal(e2.coutTotal, Math.round((30000 + e1.charges) * 100) / 100);
  // Sous l'abattement : aucune dependance.
  assert.equal(cotisationsSalarie(600).dependance, 0);
});

test("credits d'impot : bornes 936, 11 265, 40 000 et nuls a partir de 80 000 euros", () => {
  assert.equal(creditCisAnnuel(935.99), 0);
  assert.equal(creditCisAnnuel(936), 300);
  assert.equal(creditCisAnnuel(11265), 599.54);
  assert.equal(creditCisAnnuel(11266), 600);
  assert.equal(creditCisAnnuel(40000), 600);
  assert.equal(creditCisAnnuel(60000), 300);
  assert.equal(creditCisAnnuel(80000), 0);
  assert.equal(creditCisAnnuel(120000), 0);
  assert.equal(creditCo2Annuel(935), 0);
  assert.equal(creditCo2Annuel(936), 216);
  assert.equal(creditCo2Annuel(40000), 216);
  assert.equal(creditCo2Annuel(60000), 108);
  assert.equal(creditCo2Annuel(80000), 0);
  const r = brutVersNet(80000 / 12, JULIEN);
  assert.deepEqual([r.creditCis, r.creditCo2], [0, 0]);
});

test("bareme : tranches, classe 2 (deux fois l'impot sur la moitie), fonds pour l'emploi a 9 % au-dela des seuils", () => {
  assert.equal(baremeClasse1(13230), 0);
  assert.equal(Math.round(baremeClasse1(15435) * 100) / 100, 176.4);
  assert.equal(Math.round(baremeClasse1(54090) * 100) / 100, Math.round((1423.8 + [16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38].reduce((s, r) => s + 2295 * r / 100, 0)) * 100) / 100);
  assert.equal(impotAnnuel(60000, 2), Math.round(2 * baremeClasse1(30000) * 1.07 * 100) / 100);
  assert.equal(impotAnnuel(150000, 1), Math.round(baremeClasse1(150000) * 1.07 * 100) / 100);
  assert.equal(impotAnnuel(150001, 1), Math.round(baremeClasse1(150001) * 1.09 * 100) / 100);
  assert.equal(impotAnnuel(300000, 2), Math.round(2 * baremeClasse1(150000) * 1.07 * 100) / 100);
  assert.equal(impotAnnuel(300001, 2), Math.round(2 * baremeClasse1(150000.5) * 1.09 * 100) / 100);
  assert.equal(impotAnnuel(0, 1), 0);
  assert.ok(brutVersNet(4968, { taxClass: 2, travelDeduction: 1881 }).impot < brutVersNet(4968, JULIEN).impot);
  assert.equal(isTaxClassSupported(1) && isTaxClassSupported(2), true);
  assert.equal(isTaxClassSupported("1a"), false);
});

test("estimation annuelle en classe 2 : revenu du foyer, impots retenus, difference complete ou non", () => {
  const e = estimationAnnuelleClasse2(4968 * 12, 0, 0, JULIEN);
  assert.equal(e.revenuImposableAgent, brutVersNet(4968, JULIEN).annual.revenuImposable);
  assert.equal(e.revenuImposableFoyer, e.revenuImposableAgent);
  assert.equal(e.impotRetenuClasse1, impotAnnuel(e.revenuImposableAgent, 1));
  assert.equal(e.impotClasse2, impotAnnuel(e.revenuImposableAgent, 2));
  assert.equal(e.difference, Math.round((e.impotClasse2 - e.impotRetenuClasse1) * 100) / 100);
  assert.ok(e.difference < 0, "partenaire sans revenu : remboursement estime (difference negative)");
  assert.equal(e.differenceComplete, true);
  // Partenaire avec revenus et impot retenu saisi : difference complete.
  const f = estimationAnnuelleClasse2(4968 * 12, 40000, 4200, JULIEN);
  assert.equal(f.revenuImposableFoyer, Math.round((f.revenuImposableAgent + 40000) * 100) / 100);
  assert.equal(f.impotClasse2, impotAnnuel(f.revenuImposableFoyer, 2));
  assert.equal(f.impotRetenuPartenaire, 4200);
  assert.equal(f.difference, Math.round((f.impotClasse2 - (f.impotRetenuClasse1 + 4200)) * 100) / 100);
  assert.equal(f.differenceComplete, true);
  assert.ok(f.impotClasse2 > e.impotClasse2);
  // Impot du partenaire non saisi : compte pour 0, difference incomplete.
  const g = estimationAnnuelleClasse2(4968 * 12, 40000, null, JULIEN);
  assert.equal(g.impotRetenuPartenaire, null);
  assert.equal(g.differenceComplete, false);
  assert.equal(g.difference, Math.round((g.impotClasse2 - g.impotRetenuClasse1) * 100) / 100);
});

test("cout total vers brut : le plus grand brut couvert, au centime", () => {
  const c = brutDepuisCoutTotal(5592.48, EMPLOYEUR);
  assert.equal(c.brut, 4968);
  assert.ok(c.coutTotal <= 5592.48);
  assert.ok(coutEmployeur(c.brut + 0.01, EMPLOYEUR).coutTotal > 5592.48);
  assert.equal(brutDepuisCoutTotal(0, EMPLOYEUR).brut, 0);
});

test("fonctions pures : aucun reseau, aucune base, aucun acces au navigateur", () => {
  for (const f of ["lib/payroll/lu-salaire.ts", "lib/payroll/lu-parametres-2026.ts"]) {
    const src = read(f).replace(/^\s*\/\/.*$/gm, "");
    assert.ok(!/fetch\(|supabase|process\.env|window\.|document\.|localStorage|XMLHttpRequest/.test(src), f);
    assert.ok(!/[–—]/.test(read(f)), `${f} : tiret long ou moyen`);
  }
});

console.log(`${pass} PASS, 0 FAIL`);
