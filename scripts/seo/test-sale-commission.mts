// Commission des ventes realisees (nov. 2026) : calcul, arrondis, TVA,
// controle serveur, ventes deja saisies. Sans reseau ni base.
// Lancement : node --import tsx scripts/seo/test-sale-commission.mts
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_VAT_RATE,
  VAT_RATES,
  commissionAmounts,
  commissionFromRate,
  isCommissionColumnMissing,
  parseDecimalInput,
  parseSaleCommission,
  roundCents,
  storedCommission,
} from "../../lib/admin/sale-commission";
import { parseSaleInput } from "../../lib/admin/sales-auth";

const root = join(import.meta.dirname, "..", "..");
const read = (f: string) => readFileSync(join(root, f), "utf8");
let pass = 0;
const test = (name: string, fn: () => void) => {
  fn();
  pass++;
  console.log(`PASS ${name}`);
};

test("pourcentage : prix x taux / 100, arrondi au centime", () => {
  assert.equal(commissionFromRate(500000, 3), 15000);
  assert.equal(commissionFromRate(500000, 3.5), 17500);
  assert.equal(commissionFromRate(487350, 2.75), 13402.13); // 13402,125 -> 13402,13
  assert.equal(commissionFromRate(123457, 1.11), 1370.37); // 1370,3727
  assert.equal(commissionFromRate(1, 0.01), 0); // 0,0001
  assert.equal(commissionFromRate(50, 1), 0.5);
  assert.equal(commissionFromRate(1000000, 100), 1000000);
  assert.equal(commissionFromRate(1000000, 0), 0);
});

test("arrondis au centime sans erreur de virgule flottante", () => {
  assert.equal(roundCents(1.005), 1.01);
  assert.equal(roundCents(2.675), 2.68);
  assert.equal(roundCents(0.1 + 0.2), 0.3);
  assert.equal(roundCents(1234.5649), 1234.56);
  assert.equal(roundCents(1234.565), 1234.57);
});

test("TVA : chaque taux de la liste, HT + TVA = TTC au centime", () => {
  assert.deepEqual([...VAT_RATES], [17, 14, 8, 3, 0]);
  assert.equal(DEFAULT_VAT_RATE, 17);
  const ht = 15000;
  assert.deepEqual(commissionAmounts(ht, 17), { ht: 15000, tva: 2550, ttc: 17550 });
  assert.deepEqual(commissionAmounts(ht, 14), { ht: 15000, tva: 2100, ttc: 17100 });
  assert.deepEqual(commissionAmounts(ht, 8), { ht: 15000, tva: 1200, ttc: 16200 });
  assert.deepEqual(commissionAmounts(ht, 3), { ht: 15000, tva: 450, ttc: 15450 });
  assert.deepEqual(commissionAmounts(ht, 0), { ht: 15000, tva: 0, ttc: 15000 });
  // Arrondi de la TVA : 13402,13 x 17 % = 2278,3621 -> 2278,36.
  assert.deepEqual(commissionAmounts(13402.13, 17), { ht: 13402.13, tva: 2278.36, ttc: 15680.49 });
  assert.deepEqual(commissionAmounts(0.05, 17), { ht: 0.05, tva: 0.01, ttc: 0.06 }); // 0,0085 -> 0,01
  assert.deepEqual(commissionAmounts(99.99, 3), { ht: 99.99, tva: 3, ttc: 102.99 }); // 2,9997 -> 3,00
  for (const v of VAT_RATES) {
    const a = commissionAmounts(12345.67, v);
    assert.equal(a.ttc, roundCents(a.ht + a.tva), `TVA ${v}`);
  }
});

test("saisie du formulaire : virgule ou point, 2 decimales, vide = non renseignee", () => {
  assert.equal(parseDecimalInput(""), null);
  assert.equal(parseDecimalInput("   "), null);
  assert.equal(parseDecimalInput("3"), 3);
  assert.equal(parseDecimalInput("3,5"), 3.5);
  assert.equal(parseDecimalInput("2.75"), 2.75);
  assert.equal(parseDecimalInput("12 500,25"), 12500.25);
  assert.equal(parseDecimalInput("12\u202f500,25"), 12500.25);
  for (const bad of ["3,555", "-1", "abc", "1e3", "3,", ",5", "1.2.3"]) assert.ok(Number.isNaN(parseDecimalInput(bad)), bad);
});

test("controle serveur : commission facultative, mode, taux, montant et TVA", () => {
  // Sans commission : tout vide, TVA 17 par defaut.
  assert.deepEqual(parseSaleCommission({}, 500000).commission, { commission_mode: null, commission_taux: null, commission_ht: null, tva_taux: 17 });
  assert.deepEqual(parseSaleCommission({ commission_mode: null, tva_taux: 3 }, 500000).commission, { commission_mode: null, commission_taux: null, commission_ht: null, tva_taux: 3 });
  // Pourcentage : montant recalcule par le serveur, jamais celui du navigateur.
  assert.deepEqual(parseSaleCommission({ commission_mode: "pourcentage", commission_taux: 2.75, commission_ht: 1, tva_taux: 17 }, 487350).commission, {
    commission_mode: "pourcentage",
    commission_taux: 2.75,
    commission_ht: 13402.13,
    tva_taux: 17,
  });
  // Montant fixe : taux vide.
  assert.deepEqual(parseSaleCommission({ commission_mode: "montant_fixe", commission_ht: 15000.5, commission_taux: 3, tva_taux: 8 }, 500000).commission, {
    commission_mode: "montant_fixe",
    commission_taux: null,
    commission_ht: 15000.5,
    tva_taux: 8,
  });
  assert.equal(parseSaleCommission({ commission_mode: "montant_fixe", commission_ht: 0 }, 500000).commission?.commission_ht, 0);
  assert.equal(parseSaleCommission({ commission_mode: "pourcentage", commission_taux: 0 }, 500000).commission?.commission_ht, 0);
  assert.equal(parseSaleCommission({ commission_mode: "pourcentage", commission_taux: 100 }, 500000).commission?.commission_ht, 500000);
  // Refus.
  const err = (b: Record<string, unknown>) => parseSaleCommission(b, 500000).error;
  assert.equal(err({ commission_mode: "forfait", commission_ht: 10 }), "commission_mode_invalid");
  assert.equal(err({ commission_mode: "pourcentage" }), "commission_rate_invalid");
  assert.equal(err({ commission_mode: "pourcentage", commission_taux: 100.01 }), "commission_rate_invalid");
  assert.equal(err({ commission_mode: "pourcentage", commission_taux: -1 }), "commission_rate_invalid");
  assert.equal(err({ commission_mode: "pourcentage", commission_taux: 2.555 }), "commission_rate_invalid");
  assert.equal(err({ commission_mode: "pourcentage", commission_taux: "3" }), "commission_rate_invalid");
  assert.equal(err({ commission_mode: "montant_fixe" }), "commission_amount_invalid");
  assert.equal(err({ commission_mode: "montant_fixe", commission_ht: -0.01 }), "commission_amount_invalid");
  assert.equal(err({ commission_mode: "montant_fixe", commission_ht: 10.001 }), "commission_amount_invalid");
  assert.equal(err({ commission_mode: "montant_fixe", commission_ht: 1e11 }), "commission_amount_invalid");
  for (const v of [20, 16, "17", 5.5]) assert.equal(err({ commission_mode: "montant_fixe", commission_ht: 10, tva_taux: v }), "vat_rate_invalid", String(v));
  for (const v of VAT_RATES) assert.equal(err({ commission_mode: "montant_fixe", commission_ht: 10, tva_taux: v }), undefined, String(v));
  // Prix pris en compte : celui enregistre (arrondi a l'euro par parseSaleInput).
  const base = { property_type: "appartement", surface_habitable: 80, adresse: "1 rue X", commune: "Steinfort", date_acte: "2026-09-01", agent: "julien", prix_vente: 500000.4 };
  const insert = parseSaleInput(base).insert!;
  assert.equal(parseSaleCommission({ commission_mode: "pourcentage", commission_taux: 3 }, insert.prix_vente).commission?.commission_ht, 15000);
});

test("ventes deja saisies : sans commission ou colonnes absentes, rien a ressaisir", () => {
  assert.equal(storedCommission({ prix_vente: 500000 }), null);
  assert.equal(storedCommission({ commission_mode: null, commission_taux: null, commission_ht: null, tva_taux: 17 }), null);
  assert.deepEqual(storedCommission({ commission_mode: "pourcentage", commission_taux: 2.75, commission_ht: 13402.13, tva_taux: 17 }), { mode: "pourcentage", rate: 2.75, ht: 13402.13, vat: 17 });
  // NUMERIC renvoye en texte par certains clients : accepte.
  assert.deepEqual(storedCommission({ commission_mode: "montant_fixe", commission_taux: null, commission_ht: "15000.50", tva_taux: 3 }), { mode: "montant_fixe", rate: null, ht: 15000.5, vat: 3 });
  assert.equal(isCommissionColumnMissing({ code: "PGRST204", message: "Could not find the 'commission_ht' column of 'mapa_historical_sales' in the schema cache" }), true);
  assert.equal(isCommissionColumnMissing({ code: "42703", message: "column mapa_historical_sales.tva_taux does not exist" }), true);
  assert.equal(isCommissionColumnMissing({ code: "23514", message: "check constraint" }), false);
  assert.equal(isCommissionColumnMissing(null), false);
});

test("branchement : formulaire, routes, liste, modification, fichier SQL", () => {
  const form = read("app/admin/ventes-realisees/SaleForm.tsx");
  for (const k of ["commissionFromRate(price, commissionValue)", "commissionAmounts(commissionHt, vatRate)", "VAT_RATES.map", "COMMISSION_MODES.map", "tva_taux: vatRate", "data-sale-commission"]) assert.ok(form.includes(k), k);
  for (const f of ["app/api/admin/ventes-realisees/route.ts", "app/api/admin/ventes-realisees/[id]/route.ts"]) {
    const src = read(f);
    assert.ok(src.includes("parseSaleCommission(body, insert.prix_vente)") && src.includes("isCommissionColumnMissing(error)") && src.includes('"commission_unavailable"'), f);
  }
  const list = read("app/admin/ventes-realisees/page.tsx");
  assert.ok(list.includes('t("col.commissionHt")') && list.includes('t("col.commissionTtc")') && list.includes("SELECT_WITH_OVERRIDE + COMMISSION_SELECT"));
  const edit = read("app/admin/ventes-realisees/[id]/edit/page.tsx");
  assert.ok(edit.includes("storedCommission(row)") && edit.includes("if (res.error) res = await read(BASE);"));
  const sql = read("supabase/sql/32_ventes_commission.sql");
  const statements = sql.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
  assert.ok(!/\bDROP\b|\bDELETE\b|\bUPDATE\b|\bTRUNCATE\b/i.test(statements));
  assert.equal((statements.match(/ADD COLUMN IF NOT EXISTS/g) ?? []).length, 4);
  assert.ok(statements.includes("CHECK (tva_taux IN (17, 14, 8, 3, 0))") && statements.includes("commission_taux <= 100"));
  // Moteur d'estimation : lecture inchangee.
  assert.ok(read("app/api/estimate/route.ts").includes('.select("prix_vente, surface_habitable, commune, property_type, date_acte, comparable_override")'));
  for (const l of ["fr", "en", "de"]) {
    const m = JSON.parse(read(`messages/${l}.json`));
    const s = m.admin_sales;
    for (const k of ["commission", "commissionModePercent", "commissionModeFixed", "commissionRate", "commissionAmount", "vat", "vatOption", "commissionHt", "commissionVat", "commissionTtc", "commissionNone", "commissionNeedsPrice"]) assert.ok(s.form[k], `${l} form.${k}`);
    for (const k of ["commissionMode", "commissionRate", "commissionAmount", "vatRate", "commissionUnavailable"]) assert.ok(s.errors[k], `${l} errors.${k}`);
    assert.ok(s.col.commissionHt && s.col.commissionTtc && s.commissionNotProvided && m.admin_notices.commission && m.admin_notices.commission_title);
    assert.ok(!/[\u2013\u2014]/.test(JSON.stringify(s) + m.admin_notices.commission), `${l} tiret`);
  }
  const fr = JSON.parse(read("messages/fr.json")).admin_sales.form;
  assert.equal(fr.commissionModePercent, "En pourcentage du prix");
  assert.equal(fr.commissionRate, "Taux de commission (%)");
  assert.equal(fr.commissionAmount, "Commission hors taxes (€)");
});

console.log(`${pass} PASS, 0 FAIL`);
