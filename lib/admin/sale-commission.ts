// Commission d'une vente realisee (nov. 2026), facultative : en pourcentage
// du prix de vente ou en montant fixe hors taxes, avec un taux de TVA de la
// liste fermee (17 % par defaut). Module pur, partage par le formulaire
// (affichage en direct), les routes (validation serveur) et la liste.
//
// Colonnes (supabase/sql/32_ventes_commission.sql) : commission_mode,
// commission_taux, commission_ht, tva_taux. Le TTC n'est pas stocke : il
// se calcule (HT + TVA, chacun arrondi au centime).

export const COMMISSION_MODES = ["pourcentage", "montant_fixe"] as const;
export type CommissionMode = (typeof COMMISSION_MODES)[number];

export const VAT_RATES = [17, 14, 8, 3, 0] as const;
export type VatRate = (typeof VAT_RATES)[number];
export const DEFAULT_VAT_RATE: VatRate = 17;

/** Plafond de commission_ht (NUMERIC(12,2)). */
const MAX_AMOUNT = 9_999_999_999.99;

export const COMMISSION_COLUMNS = ["commission_mode", "commission_taux", "commission_ht", "tva_taux"] as const;

export type SaleCommission = {
  commission_mode: CommissionMode | null;
  commission_taux: number | null;
  commission_ht: number | null;
  tva_taux: VatRate;
};

export type CommissionError = "commission_mode_invalid" | "commission_rate_invalid" | "commission_amount_invalid" | "vat_rate_invalid";

/** Arrondi au centime (au plus proche, demi-centime vers le haut), sans erreur de virgule flottante. */
export function roundCents(n: number): number {
  return Math.round(Number((n * 100).toPrecision(12))) / 100;
}

/** Au plus 2 decimales. */
function twoDecimals(n: number): boolean {
  return Math.abs(n * 100 - Math.round(n * 100)) < 1e-6;
}

export function isCommissionMode(v: unknown): v is CommissionMode {
  return typeof v === "string" && (COMMISSION_MODES as readonly string[]).includes(v);
}

export function isVatRate(v: unknown): v is VatRate {
  return typeof v === "number" && (VAT_RATES as readonly number[]).includes(v);
}

/** Commission HT en pourcentage du prix : prix x taux / 100, au centime. */
export function commissionFromRate(price: number, rate: number): number {
  return roundCents((price * rate) / 100);
}

/** HT, TVA et TTC, chacun au centime. */
export function commissionAmounts(ht: number, vat: number): { ht: number; tva: number; ttc: number } {
  const h = roundCents(ht);
  const tva = roundCents((h * vat) / 100);
  return { ht: h, tva, ttc: roundCents(h + tva) };
}

/**
 * Nombre saisi dans le formulaire ("3", "3,5", "12 500,25") : nombre, null
 * si vide, NaN si invalide (lettres, plus de 2 decimales, negatif).
 */
export function parseDecimalInput(raw: string): number | null {
  const s = raw.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  if (!s) return null;
  return /^\d+(\.\d{1,2})?$/.test(s) ? Number(s) : NaN;
}

/**
 * Controle serveur de la commission d'une vente. Facultative : sans mode
 * (null, absent ou vide), aucune commission, taux et montant vides. Avec un
 * mode : pourcentage = taux entre 0 et 100 (2 decimales), montant HT
 * recalcule ici depuis le prix ; montant fixe = montant HT positif ou nul
 * (2 decimales). TVA : 17, 14, 8, 3 ou 0 (17 si absente).
 */
export function parseSaleCommission(body: Record<string, unknown>, price: number): { commission?: SaleCommission; error?: CommissionError } {
  const vatRaw = body.tva_taux;
  const tva_taux = vatRaw === undefined || vatRaw === null || vatRaw === "" ? DEFAULT_VAT_RATE : vatRaw;
  if (!isVatRate(tva_taux)) return { error: "vat_rate_invalid" };

  const mode = body.commission_mode;
  if (mode === undefined || mode === null || mode === "") {
    return { commission: { commission_mode: null, commission_taux: null, commission_ht: null, tva_taux } };
  }
  if (!isCommissionMode(mode)) return { error: "commission_mode_invalid" };

  if (mode === "pourcentage") {
    const rate = body.commission_taux;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0 || rate > 100 || !twoDecimals(rate)) {
      return { error: "commission_rate_invalid" };
    }
    return { commission: { commission_mode: mode, commission_taux: rate, commission_ht: commissionFromRate(price, rate), tva_taux } };
  }

  const amount = body.commission_ht;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT || !twoDecimals(amount)) {
    return { error: "commission_amount_invalid" };
  }
  return { commission: { commission_mode: mode, commission_taux: null, commission_ht: roundCents(amount), tva_taux } };
}

/**
 * Commission enregistree d'une vente (ligne lue en base), pour la liste et
 * le formulaire de modification. Colonnes absentes (fichier SQL pas encore
 * execute) ou vente sans commission : null.
 */
export function storedCommission(row: Record<string, unknown>): { mode: CommissionMode; rate: number | null; ht: number; vat: VatRate } | null {
  const mode = row.commission_mode;
  const ht = row.commission_ht === null || row.commission_ht === undefined ? NaN : Number(row.commission_ht);
  if (!isCommissionMode(mode) || !Number.isFinite(ht)) return null;
  const rate = row.commission_taux === null || row.commission_taux === undefined ? null : Number(row.commission_taux);
  const vatN = Number(row.tva_taux);
  return { mode, rate: rate !== null && Number.isFinite(rate) ? rate : null, ht, vat: isVatRate(vatN) ? vatN : DEFAULT_VAT_RATE };
}

/** Erreur Supabase/PostgREST due a une colonne de commission absente. */
export function isCommissionColumnMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (error.code === "PGRST204" || error.code === "42703") && /commission_|tva_taux/.test(error.message ?? "");
}
