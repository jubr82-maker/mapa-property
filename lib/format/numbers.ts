// lib/format/numbers.ts — formatage partagé des prix et surfaces pour
// TOUT le rendu HTML/texte du site (fiches publiques, listes admin,
// e-mails). Une seule définition, utilisée partout, pour remplacer les
// définitions concurrentes historiques (PropertyCard, PropertyPrice,
// pages admin mandats/offmarket/estimations, e-mails d'estimation…).
//
// Utilise Intl.NumberFormat natif (jamais de regroupement fait main) :
// espace insécable en français (fr-FR), point en allemand (de-LU), virgule
// en anglais (en-IE, style € préfixé déjà retenu par ce projet).
//
// EXCEPTION DÉLIBÉRÉE — exports PDF : lib/admin/exports/format.ts garde
// son propre formatteur (espace ASCII construite à la main), PAS celui-ci.
// Raison documentée dans ce fichier (2026-09-22) : Intl.NumberFormat("fr-FR")
// produit une espace fine insécable (U+202F) que les polices standard PDF
// (encodage WinAnsi, pdfkit) n'affichent pas correctement ("700 /000 €").
// Unifier aveuglément aurait réintroduit ce bug déjà corrigé — cf. rapport
// de mission "surfaces décimales, formats de nombres...".

export type UILocale = "fr" | "en" | "de";

function normalizeLocale(locale: string): UILocale {
  return locale === "en" || locale === "de" ? locale : "fr";
}

// fr → "500 000 €" (espace insécable, convention française).
// en → "€500,000" (virgule, € préfixé — style déjà retenu par ce projet,
//      cf. ancien commentaire de components/property/PropertyPrice.tsx).
// de → "500.000 €" (point, convention allemande/luxembourgeoise).
const PRICE_LOCALE: Record<UILocale, string> = {
  fr: "fr-FR",
  en: "en-IE",
  de: "de-LU",
};

// Même convention de séparateur que les prix, sans devise.
const NUMBER_LOCALE: Record<UILocale, string> = {
  fr: "fr-FR",
  en: "en-US",
  de: "de-LU",
};

const ON_DEMAND_LABEL: Record<UILocale, string> = {
  fr: "Prix sur demande",
  en: "Price on request",
  de: "Preis auf Anfrage",
};

export function priceOnDemandLabel(locale: string): string {
  return ON_DEMAND_LABEL[normalizeLocale(locale)];
}

/** 500000 → "500 000 €" (fr) / "€500,000" (en) / "500.000 €" (de). */
export function formatPrice(value: number, locale: string): string {
  const nf = new Intl.NumberFormat(PRICE_LOCALE[normalizeLocale(locale)], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  return nf.format(value);
}

/**
 * 186 → "186 m²" ; 136.9 → "136,9 m²" (fr) — jusqu'à 2 décimales, sans
 * zéro superflu (maximumFractionDigits seul, pas de minimum). Passer
 * withUnit:false pour la seule valeur numérique (ex. libellé qui porte
 * déjà "(m²)" lui-même, cf. fiches mandats admin).
 */
export function formatSurface(
  value: number,
  locale: string,
  options?: { withUnit?: boolean },
): string {
  const nf = new Intl.NumberFormat(NUMBER_LOCALE[normalizeLocale(locale)], {
    maximumFractionDigits: 2,
  });
  const formatted = nf.format(value);
  return options?.withUnit === false ? formatted : `${formatted} m²`;
}

/**
 * Taux stocke en FRACTION (0.06) -> "6 %" (fr) / "6%" (en) / "6 %" (de),
 * jusqu'a 3 decimales sans zero superflu (0.00715 -> "0,715 %").
 * Bug corrige (oct. 2026) : le plan de financement affichait la fraction
 * suivie de "%" ("0.06 %" pour 6 %). Les moteurs lib/acquisition/countries
 * stockent tous leurs taux en fraction.
 */
export function formatRateFraction(fraction: number, locale: string): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[normalizeLocale(locale)], {
    style: "percent",
    maximumFractionDigits: 3,
  }).format(fraction);
}

/** Nombre simple (compteurs, etc.), sans unité, même convention de séparateur. */
export function formatNumber(value: number, locale: string): string {
  return new Intl.NumberFormat(NUMBER_LOCALE[normalizeLocale(locale)], {
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Convertit une saisie utilisateur tolérante (virgule OU point comme
 * séparateur décimal, espaces superflus) en nombre fini, arrondi à 2
 * décimales — ou null si vide/non numérique. Utilisé par les champs de
 * surface de l'administration (mission "surfaces décimales").
 */
export function parseDecimalInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(",", ".");
  const n = Number(normalized);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}
