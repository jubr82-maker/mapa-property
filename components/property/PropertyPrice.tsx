// POL2-9 — Affichage du prix pilotable (off-market).
//
// Règle :
//   - priceOnDemand === true  ⇒ "Prix sur demande" localisé (fr/en/de)
//   - sinon                   ⇒ le prix fourni (déjà formaté/localisé en
//                               amont : price_display off-market, ou
//                               montant formaté côté serveur).
//
// Résilience : la colonne `price_on_demand` peut ne pas exister tant que
// la migration 20260519_offmarket_price_on_demand.sql n'est pas appliquée.
// L'appelant passe alors `priceOnDemand` = undefined → traité comme false
// (prix affiché). Aucune dépendance Supabase ici : composant pur, rendu
// serveur ou client. Inversion DÉLIBÉRÉE du comportement BUG 1
// (anciennement "Prix sur demande" en dur partout) : par défaut on
// affiche le vrai prix.

const ON_DEMAND_LABEL: Record<string, string> = {
  fr: "Prix sur demande",
  en: "Price on request",
  de: "Preis auf Anfrage",
};

export function priceOnDemandLabel(locale: string): string {
  return ON_DEMAND_LABEL[locale] ?? ON_DEMAND_LABEL.fr;
}

export function PropertyPrice({
  priceOnDemand,
  display,
  locale,
  className = "",
}: {
  /** Drapeau admin. undefined / null ⇒ false (colonne potentiellement absente). */
  priceOnDemand?: boolean | null;
  /** Prix déjà formaté/localisé à afficher quand le prix n'est PAS masqué. */
  display: string | null | undefined;
  locale: string;
  className?: string;
}) {
  const masked = priceOnDemand === true;
  const text = masked
    ? priceOnDemandLabel(locale)
    : (display && display.trim()) || priceOnDemandLabel(locale);

  return (
    <span data-property-price data-on-demand={masked} className={className}>
      {text}
    </span>
  );
}
