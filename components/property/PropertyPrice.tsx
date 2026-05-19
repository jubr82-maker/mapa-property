// POL3-5 — Affichage du prix off-market, refonte priorité stricte.
//
// PROBLÈME résolu : la table properties_offmarket porte un historique de
// colonnes prix. L'ancien composant affichait `price_display` pré-formaté
// en amont (lib/data.ts), lui-même alimenté par le legacy `price_label`
// ("Prix sur demande" en dur). Résultat : ce libellé écrasait le bouton
// admin `price_on_demand` et le prix réel n'apparaissait jamais.
//
// Le composant calcule DÉSORMAIS lui-même le libellé à partir des champs
// bruts, dans cet ordre de priorité strict :
//
//   1. price_on_demand === true        → "Prix sur demande" localisé
//   2. price_mode === 'on_demand'      → idem
//   3. price_mode === 'range' && min&max → "min – max" formaté locale
//   4. price_mode === 'exact' && price_estimate > 0 → price_estimate formaté
//   5. price_indicative > 0            → formaté
//   6. price_display numérique (parseFloat > 0) → formaté
//   7. sinon                           → "Prix sur demande" localisé
//
// Il ne lit JAMAIS `price_label` ni `price_custom_text` pour l'affichage.
//
// Résilience : toute colonne peut être absente / null / undefined tant
// que les migrations ne sont pas appliquées → traitée comme « non
// renseignée » et on tombe dans la branche suivante (jamais de throw).

const ON_DEMAND_LABEL: Record<string, string> = {
  fr: "Prix sur demande",
  en: "Price on request",
  de: "Preis auf Anfrage",
};

export function priceOnDemandLabel(locale: string): string {
  return ON_DEMAND_LABEL[locale] ?? ON_DEMAND_LABEL.fr;
}

// Locales Intl par langue UI. fr → "5 000 000 €", en → "€5,000,000",
// de → "5.000.000 €".
const NUMBER_LOCALE: Record<string, string> = {
  fr: "fr-FR",
  en: "en-IE", // € en préfixe, séparateur virgule (style demandé)
  de: "de-DE",
};

export function formatPrice(value: number, locale: string): string {
  const nf = new Intl.NumberFormat(NUMBER_LOCALE[locale] ?? "fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
  return nf.format(value);
}

/** Convertit une valeur tolérante (number | string | null | undefined) en
 *  nombre fini strictement positif, ou null si non exploitable. */
function toPositiveNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = parseFloat(trimmed.replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

export function PropertyPrice({
  priceOnDemand,
  priceMode,
  priceMin,
  priceMax,
  priceEstimate,
  priceIndicative,
  priceDisplay,
  locale,
  className = "",
}: {
  /** Drapeau admin. undefined / null ⇒ false (colonne potentiellement absente). */
  priceOnDemand?: boolean | null;
  /** 'on_demand' | 'range' | 'exact' | 'custom' | … (tolérant). */
  priceMode?: string | null;
  priceMin?: number | string | null;
  priceMax?: number | string | null;
  priceEstimate?: number | string | null;
  priceIndicative?: number | string | null;
  /** Peut être un nombre OU une chaîne numérique. Jamais un libellé legacy. */
  priceDisplay?: number | string | null;
  locale: string;
  className?: string;
}) {
  let masked = false;
  let text: string;

  const onDemandLabel = priceOnDemandLabel(locale);

  if (priceOnDemand === true) {
    // 1. Drapeau admin explicite.
    masked = true;
    text = onDemandLabel;
  } else if (priceMode === "on_demand") {
    // 2. Mode prix « sur demande ».
    masked = true;
    text = onDemandLabel;
  } else {
    const min = toPositiveNumber(priceMin);
    const max = toPositiveNumber(priceMax);
    const estimate = toPositiveNumber(priceEstimate);
    const indicative = toPositiveNumber(priceIndicative);
    const displayNum = toPositiveNumber(priceDisplay);

    if (priceMode === "range" && min != null && max != null) {
      // 3. Fourchette.
      text = `${formatPrice(min, locale)} – ${formatPrice(max, locale)}`;
    } else if (priceMode === "exact" && estimate != null) {
      // 4. Prix exact.
      text = formatPrice(estimate, locale);
    } else if (indicative != null) {
      // 5. Prix indicatif.
      text = formatPrice(indicative, locale);
    } else if (displayNum != null) {
      // 6. price_display numérique.
      text = formatPrice(displayNum, locale);
    } else {
      // 7. Rien d'exploitable → sur demande.
      masked = true;
      text = onDemandLabel;
    }
  }

  return (
    <span data-property-price data-on-demand={masked} className={className}>
      {text}
    </span>
  );
}
