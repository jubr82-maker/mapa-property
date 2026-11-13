// Ecran "Remuneration" (nov. 2026) : ce que les commissions permettent,
// charges patronales payees par l'agent ou par MAPA Property, compte de
// reserve, alertes, reglages (controle serveur), garde d'acces, rendu de
// l'ecran en francais, donnees du partenaire jamais envoyees. Sans reseau.
// Lancement : node --import tsx scripts/payroll/test-remuneration.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRequire } from "node:module";
import { brutVersNet, coutEmployeur, netVersBrut } from "../../lib/payroll/lu-salaire";
import { belowSsm, possibilityFromShare, reserveAccount, salaryFromBrut, salaryFromNet, ssmFor } from "../../lib/payroll/remuneration";
import { DEFAULT_AGENT, SALE_AGENT_KEYS, isSettingsTableMissing, parseAgentInput, parseEmployerInput } from "../../lib/admin/remuneration-reglages";
import { RemunerationScreen } from "../../app/admin/remuneration/RemunerationScreen";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};
const near = (a: number, b: number, tol: number, what: string) => assert.ok(Math.abs(a - b) <= tol, `${what} : ${a} au lieu de ${b}`);

const AGENT = { sharePct: 80, paysEmployerCharges: true, taxClass: 1 as const, travelDeduction: 1881, ssmLevel: "non_qualifie" as const };
const EMP = { mutualiteRate: 0.23, accidentFactor: 1 };
const S = { taxClass: 1 as const, travelDeduction: 1881, mutualiteRate: 0.23, accidentFactor: 1 };

test("je choisis mon net : net vers brut et brut vers net, charges et cout total", () => {
  const a = salaryFromNet(3720, AGENT, EMP);
  assert.equal(a.net.brut, netVersBrut(3720, S).brut);
  near(a.net.net, 3720, 0.01, "net");
  assert.deepEqual(a.employer, coutEmployeur(a.net.brut, S));
  const b = salaryFromBrut(4968, AGENT, EMP);
  assert.deepEqual(b.net, brutVersNet(4968, S));
  assert.equal(b.employer.coutTotal, 5592.48);
  // Classe de l'agent appliquee.
  assert.ok(salaryFromBrut(4968, { ...AGENT, taxClass: 2 }, EMP).net.impot < b.net.impot);
});

test("commissions, l'agent paie les charges : sa part couvre le cout total", () => {
  // 12 mois, part de l'agent 67 109,76 : 5 592,48 par mois, soit 4 968 bruts.
  const p = possibilityFromShare(67109.76, 16777.44, 12, AGENT, EMP);
  assert.equal(p.months, 12);
  assert.equal(p.monthlyBudget, 5592.48);
  assert.equal(p.salary.net.brut, 4968);
  assert.ok(p.salary.employer.coutTotal <= p.monthlyBudget);
  assert.equal(p.totalCostPeriod, Math.round(5592.48 * 12 * 100) / 100);
  assert.equal(p.chargesOnMapa, 0);
  assert.equal(p.mapaRemaining, 16777.44);
  near(p.salary.net.net, 3720, 5, "net equivalent");
});

test("commissions, MAPA Property paie les charges : brut = part, charges prises sur la part MAPA", () => {
  const agent = { ...AGENT, paysEmployerCharges: false };
  const p = possibilityFromShare(59616, 14904, 12, agent, EMP);
  assert.equal(p.salary.net.brut, 4968);
  assert.equal(p.salary.employer.charges, 624.48);
  assert.equal(p.chargesOnMapa, Math.round(624.48 * 12 * 100) / 100);
  assert.equal(p.mapaRemaining, Math.round((14904 - 624.48 * 12) * 100) / 100);
  assert.equal(p.totalCostPeriod, Math.round(5592.48 * 12 * 100) / 100);
  // Sans commission : rien, pas d'alerte de salaire minimum.
  const z = possibilityFromShare(0, 0, 3, agent, EMP);
  assert.deepEqual([z.salary.net.brut, z.salary.belowSsm, z.mapaRemaining], [0, false, 0]);
});

test("salaire social minimum : alerte sous 2 771,33 (non qualifie) ou 3 325,59 (qualifie)", () => {
  assert.equal(ssmFor({ ssmLevel: "non_qualifie" }), 2771.33);
  assert.equal(ssmFor({ ssmLevel: "qualifie" }), 3325.59);
  assert.equal(belowSsm(2771.32, { ssmLevel: "non_qualifie" }), true);
  assert.equal(belowSsm(2771.33, { ssmLevel: "non_qualifie" }), false);
  assert.equal(belowSsm(3000, { ssmLevel: "qualifie" }), true);
  assert.equal(belowSsm(0, { ssmLevel: "qualifie" }), false);
  assert.equal(salaryFromBrut(2500, AGENT, EMP).belowSsm, true);
  assert.equal(possibilityFromShare(12000, 3000, 12, AGENT, EMP).salary.belowSsm, true);
});

test("compte de reserve : solde de depart, ventes, salaires deduits, mois couverts, alerte", () => {
  const cost = salaryFromNet(3720, AGENT, EMP).employer.coutTotal;
  const res = (startBalance: number, cumulAgentHt: number, salaries: number, agent = AGENT) => reserveAccount({ startBalance, cumulAgentHt, salaries, currentNet: 3720 }, agent, EMP);
  const r = res(10000, 40000, 6);
  assert.equal(r.monthlyCost, cost);
  assert.equal(r.balance, Math.round((10000 + 40000 - cost * 6) * 100) / 100);
  assert.equal(r.monthsCovered, Math.round((r.balance / cost) * 10) / 10);
  assert.equal(r.short, false);
  // L'agent ne paie pas les charges : cout = brut seul.
  assert.equal(res(0, 50000, 6, { ...AGENT, paysEmployerCharges: false }).monthlyCost, salaryFromNet(3720, AGENT, EMP).net.brut);
  // Solde de depart negatif accepte.
  assert.equal(res(-2000, 0, 0).balance, -2000);
  // Moins d'un mois couvert : alerte.
  const low = res(0, cost * 3.5, 3);
  assert.equal(low.short, true);
  assert.equal(low.monthsCovered, 0.5);
  const neg = res(0, 1000, 2);
  assert.ok(neg.balance < 0 && neg.short);
  assert.equal(reserveAccount({ startBalance: 0, cumulAgentHt: 0, salaries: 0, currentNet: 0 }, AGENT, EMP).monthsCovered, null);
});

test("reglages : listes fermees et bornes controlees cote serveur", () => {
  const ok = parseAgentInput({ key: "julien", displayName: " Julien Brebion ", active: true, sharePct: 80, paysEmployerCharges: true, taxClass: 1, travelDeduction: 1881, ssmLevel: "non_qualifie", currentNet: 3720, reserveStart: "2026-01-01", startBalance: -1250.5 });
  assert.deepEqual(ok.row, { agent_key: "julien", display_name: "Julien Brebion", active: true, part_agent_pct: 80, paie_charges_patronales: true, classe_impot: 1, frais_deplacement_annuels: 1881, niveau_ssm: "non_qualifie", net_mensuel_actuel: 3720, debut_suivi_reserve: "2026-01-01", solde_depart_reserve: -1250.5 });
  const base = { key: "julien", displayName: "Julien", sharePct: 80, taxClass: 1, travelDeduction: 0, ssmLevel: "qualifie", currentNet: null, reserveStart: null };
  assert.equal(parseAgentInput(base).row?.net_mensuel_actuel, null);
  assert.equal(parseAgentInput({ ...base, key: "autre" }).error, "agent_invalid");
  assert.equal(parseAgentInput({ ...base, displayName: "  " }).error, "name_invalid");
  assert.equal(parseAgentInput({ ...base, sharePct: 100.5 }).error, "share_invalid");
  assert.equal(parseAgentInput({ ...base, sharePct: 80.123 }).error, "share_invalid");
  assert.equal(parseAgentInput({ ...base, sharePct: null }).error, "share_invalid");
  assert.equal(parseAgentInput({ ...base, taxClass: "1a" }).error, "tax_class_invalid");
  assert.equal(parseAgentInput({ ...base, taxClass: 3 }).error, "tax_class_invalid");
  assert.equal(parseAgentInput({ ...base, travelDeduction: -1 }).error, "travel_invalid");
  assert.equal(parseAgentInput({ ...base, ssmLevel: "cadre" }).error, "ssm_invalid");
  assert.equal(parseAgentInput({ ...base, currentNet: -5 }).error, "net_invalid");
  assert.equal(parseAgentInput({ ...base, reserveStart: "2026-02-30" }).error, "reserve_start_invalid");
  assert.deepEqual(parseEmployerInput({ mutualiteRate: 0.95, accidentFactor: 1.1 }).row, { id: 1, mutualite_taux: 0.95, facteur_accident: 1.1 });
  assert.equal(parseEmployerInput({ mutualiteRate: 0.5, accidentFactor: 1 }).error, "mutualite_invalid");
  assert.equal(parseEmployerInput({ mutualiteRate: "0.23", accidentFactor: 1 }).error, "mutualite_invalid");
  assert.equal(parseEmployerInput({ mutualiteRate: 0.23, accidentFactor: 1.2 }).error, "accident_invalid");
  assert.ok(isSettingsTableMissing({ code: "42P01" }) && isSettingsTableMissing({ code: "PGRST205" }) && !isSettingsTableMissing({ code: "23514" }));
  assert.deepEqual([...SALE_AGENT_KEYS], ["julien"]);
  assert.equal(DEFAULT_AGENT.sharePct, 80);
});

test("garde d'acces : pages et route reservees aux comptes des ventes avec double authentification", () => {
  const auth = read("lib/admin/sales-auth.ts");
  assert.ok(/export async function requireSalesAdminPage/.test(auth));
  const guard = auth.slice(auth.indexOf("export async function requireSalesAdminPage"));
  assert.ok(/SALES_ALLOWED_EMAILS\.has\(user\.email\)/.test(guard.slice(0, 900)) && /aal2/.test(guard.slice(0, 900)));
  for (const f of ["app/admin/remuneration/page.tsx", "app/admin/remuneration/reglages/page.tsx"]) {
    const src = read(f);
    assert.ok(/await requireSalesAdminPage\(/.test(src), f);
    const firstRead = Math.min(...["loadSalesAgents(supabase)", ".from("].map((x) => src.indexOf(x)).filter((n) => n >= 0));
    assert.ok(src.indexOf("await requireSalesAdminPage(") < firstRead, `${f} : garde avant toute lecture`);
  }
  const route = read("app/api/admin/remuneration/reglages/route.ts");
  assert.ok(/const auth = await requireSalesAdmin\(\);\s+if \(!auth\.ok\) return auth\.response;/.test(route));
  assert.ok(!/supabaseService|service_role/.test(route + read("app/admin/remuneration/page.tsx") + read("app/admin/remuneration/reglages/page.tsx")));
  const nav = read("components/admin/admin-nav.ts");
  const i = nav.indexOf('href: "/admin/ventes-realisees"');
  assert.ok(i > 0 && nav.indexOf('href: "/admin/remuneration"') > i && nav.slice(i, nav.indexOf('href: "/admin/remuneration"')).split("\n").length === 2, "juste sous Ventes realisees");
  // Rien dans le site public : aucune page sous app/[locale] ne lit ces modules.
  assert.ok(!read("lib/sitemaps.ts").includes("remuneration"));
});

test("donnees du partenaire : jamais enregistrees ni envoyees", () => {
  const screen = read("app/admin/remuneration/RemunerationScreen.tsx");
  assert.ok(!/fetch\(|localStorage|sessionStorage|indexedDB|<form|\bname=|document\.cookie/.test(screen.replace(/^\s*\/\/.*$/gm, "")));
  const page = read("app/admin/remuneration/page.tsx");
  assert.ok(!/partner|partenaire/i.test(page.replace(/^\s*\/\/.*$/gm, "")));
  const route = read("app/api/admin/remuneration/reglages/route.ts") + read("lib/admin/remuneration-reglages.ts");
  assert.ok(!/partner|partenaire/i.test(route));
  const sql = read("supabase/sql/33_remuneration_reglages.sql");
  assert.ok(!/partner|partenaire/i.test(sql));
});

const fr = JSON.parse(read("messages/fr.json"));
// Meme exemplaire de next-intl que le composant (charge par require sous tsx),
// sinon le contexte du fournisseur n'est pas partage.
const { NextIntlClientProvider } = createRequire(import.meta.url)("next-intl") as typeof import("next-intl");
const props = {
  agent: { name: "Julien", sharePct: 80, paysEmployerCharges: true, taxClass: 1 as const, travelDeduction: 1881, ssmLevel: "non_qualifie" as const, currentNet: 3720 },
  employer: EMP,
  period: { months: 12, count: 4, notProvided: 1, ht: 30000, agentHt: 24000, mapaHt: 6000, upcoming: { count: 0, ht: 0, agentHt: 0, mapaHt: 0 } },
  reserve: {
    startLabel: "01/01/2026",
    startBalance: 0,
    cumulAgentHt: 24000,
    sales: 3,
    paid: { count: 11, firstLabel: "janvier 2026", lastLabel: "novembre 2026", nextLabel: "31/12/2026" },
    forecast: null,
  } as Parameters<typeof RemunerationScreen>[0]["reserve"],
};
const render = (p: typeof props) =>
  renderToStaticMarkup(createElement(NextIntlClientProvider as unknown as ComponentType<Record<string, unknown>>, { locale: "fr", timeZone: "Europe/Luxembourg", messages: fr, onError: (e: Error) => { throw e; } }, createElement(RemunerationScreen, p)));

test("rendu de l'ecran : blocs, valeurs, alertes, bandeau ; toutes les traductions presentes", () => {
  const html = render(props);
  for (const b of ["net", "commissions", "reserve", "classe2", "parametres"]) assert.ok(html.includes(`data-remuneration="${b}"`), b);
  assert.ok(html.includes("Je choisis mon net") && html.includes("Mes commissions") && html.includes("Compte de réserve") && html.includes("Estimation annuelle en classe 2"));
  assert.ok(html.includes('value="3720,00"'), "net actuel prerempli");
  assert.ok(html.includes("Coût total pour MAPA Property"));
  assert.ok(html.includes("4 ventes réalisées sur la période, dont 1 « Non renseignée »."));
  assert.ok(html.includes("L&#x27;agent paie aussi les charges patronales") || html.includes("L'agent paie aussi les charges patronales"));
  assert.ok(html.includes("Attention : la réserve ne couvre plus un mois de salaire au net actuel."), "24 000 pour 11 mois : reserve negative");
  assert.ok(html.includes("Attention : le brut permis par les commissions de la période est sous le salaire social minimum"), "2 000 par mois");
  assert.ok(html.includes("Estimations sur les paramètres 2026, mis à jour le 1er juin 2026. L&#x27;impôt réel est fixé par l&#x27;Administration des contributions directes. Vérifiez avec le simulateur officiel saturn.etat.lu."));
  assert.ok(html.includes("<details") && (html.match(/Vérifié|Supposé/g) ?? []).length === 14);
  assert.ok(html.includes("Saisissez le revenu annuel imposable du partenaire"));
  // Charges prises sur la part de MAPA Property.
  const mapa = render({ ...props, agent: { ...props.agent, paysEmployerCharges: false }, reserve: null as never });
  assert.ok(mapa.includes("Reste réellement à MAPA Property") && mapa.includes("Charges patronales prises sur la part de MAPA Property"));
  assert.ok(mapa.includes("Renseignez le net mensuel actuel et la date de début du suivi"));
  assert.ok(!render(props).includes("Reste réellement à MAPA Property"));
  // Classe 1a : message.
  const c1a = render({ ...props, agent: { ...props.agent, taxClass: "1a" as never } });
  assert.ok(c1a.includes("Classe 1a : calcul non disponible."));
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${l}.json`));
    assert.ok(m.admin_nav.remuneration && m.admin_notices.remuneration && m.admin_notices.remuneration_title, l);
    assert.ok(!/[–—]/.test(JSON.stringify([m.admin_remuneration, m.admin_nav.remuneration, m.admin_notices.remuneration])), `${l} : tiret long ou moyen`);
    const keys = (o: object, p = ""): string[] => Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));
    assert.deepEqual(keys(m.admin_remuneration).sort(), keys(fr.admin_remuneration).sort(), `${l} : memes cles que fr`);
  }
});

test("reglages : listes fermees dans le formulaire, aucun tiret long dans les fichiers", () => {
  const form = read("app/admin/remuneration/reglages/SettingsForm.tsx");
  assert.ok(form.includes("MUTUALITE_RATES.map") && form.includes("ACCIDENT_FACTORS.map") && form.includes("SSM_LEVELS.map"));
  assert.ok(form.includes('<option value="1a" disabled>'));
  for (const f of ["app/admin/remuneration/page.tsx", "app/admin/remuneration/RemunerationScreen.tsx", "app/admin/remuneration/reglages/page.tsx", "app/admin/remuneration/reglages/SettingsForm.tsx", "app/api/admin/remuneration/reglages/route.ts", "lib/payroll/remuneration.ts"]) {
    assert.ok(!/[–—]/.test(read(f)), f);
  }
});

console.log(`${pass} PASS, 0 FAIL`);
