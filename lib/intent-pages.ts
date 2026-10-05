// Pages de recherche immobiliere (oct. 2026) : une page par intention,
// dans les trois langues. Chaque page repond a la question dans son premier
// paragraphe ("answer"), propose une FAQ courte et factuelle, des liens vers
// les biens, les villes et les simulateurs, et publie des donnees
// structurees exactes (Service rattache a l'etablissement unique
// #organization, FAQPage). Textes : namespace next-intl "intent_pages",
// uniquement des faits deja publies sur le site (honoraires, mandats,
// cadre legal) ou fournis par Julien (positionnement de broker).

export type IntentKey = "agency" | "buy" | "sell" | "rent" | "search" | "broker";

export type IntentLink = { href: string; key: string };

export interface IntentConfig {
  /** Chemin sans langue. */
  path: string;
  /** Nombre de questions de la FAQ (faq_q1..faq_qN). */
  faqCount: number;
  /** Zone servie par le service (donnees structurees). */
  area: "luxembourg" | "international";
  /** Liens vers les biens et les pages voisines (libelles intent_pages.link_*). */
  links: IntentLink[];
}

export const INTENT_PAGES: Record<IntentKey, IntentConfig> = {
  agency: {
    path: "/agence-immobiliere-luxembourg",
    faqCount: 5,
    area: "luxembourg",
    links: [
      { href: "/biens", key: "link_all_properties" },
      { href: "/services/vendre", key: "link_sell" },
      { href: "/services/acheter", key: "link_buy" },
      { href: "/services/louer", key: "link_rent" },
      { href: "/mandats/recherche", key: "link_search" },
      { href: "/services/broker-international", key: "link_broker" },
      { href: "/services/estimer", key: "link_estimate" },
      { href: "/legal/honoraires", key: "link_fees" },
      { href: "/qui-sommes-nous", key: "link_about" },
    ],
  },
  buy: {
    path: "/services/acheter",
    faqCount: 4,
    area: "luxembourg",
    links: [
      { href: "/biens?transaction=sale", key: "link_properties_sale" },
      { href: "/liste-attente", key: "link_waitlist" },
      { href: "/mandats/recherche", key: "link_search" },
      { href: "/off-market", key: "link_offmarket" },
      { href: "/services/broker-international", key: "link_broker" },
      { href: "/legal/honoraires", key: "link_fees" },
    ],
  },
  sell: {
    path: "/services/vendre",
    faqCount: 4,
    area: "luxembourg",
    links: [
      { href: "/services/estimer", key: "link_estimate" },
      { href: "/biens?transaction=sale", key: "link_properties_sale" },
      { href: "/legal/honoraires", key: "link_fees" },
      { href: "/agence-immobiliere-luxembourg", key: "link_agency" },
    ],
  },
  rent: {
    path: "/services/louer",
    faqCount: 4,
    area: "luxembourg",
    links: [
      { href: "/biens?transaction=rent", key: "link_properties_rent" },
      { href: "/contact?subject=mise-en-location", key: "link_list_rental" },
      { href: "/legal/honoraires", key: "link_fees" },
      { href: "/agence-immobiliere-luxembourg", key: "link_agency" },
    ],
  },
  search: {
    path: "/mandats/recherche",
    faqCount: 4,
    area: "international",
    links: [
      { href: "/biens?transaction=sale", key: "link_properties_sale" },
      { href: "/off-market", key: "link_offmarket" },
      { href: "/services/broker-international", key: "link_broker" },
      { href: "/legal/honoraires", key: "link_fees" },
    ],
  },
  broker: {
    path: "/services/broker-international",
    faqCount: 4,
    area: "international",
    links: [
      { href: "/services/marches-actifs", key: "link_markets" },
      { href: "/mandats/recherche", key: "link_search" },
      { href: "/off-market", key: "link_offmarket" },
      { href: "/biens", key: "link_all_properties" },
      { href: "/legal/honoraires", key: "link_fees" },
      { href: "/contact", key: "link_contact" },
    ],
  },
};
