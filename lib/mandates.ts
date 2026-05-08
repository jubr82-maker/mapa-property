export type MandateType = "exclusif" | "semi-exclusif" | "simple" | "autonome" | "recherche";

export interface MandateConfig {
  slug: MandateType;
  rate: string;
  rateNote: string;
  duration: string;
  formType: string;
  formCta: string;
  defaultMessage: string;
  servicesIncluded: number; // count, content via i18n
  servicesExcluded: number;
  highlights: number;
}

export const MANDATES: Record<MandateType, MandateConfig> = {
  exclusif: {
    slug: "exclusif",
    rate: "3,5 %",
    rateNote: "HT du prix net vendeur",
    duration: "6 mois renouvelables",
    formType: "mandate_exclusive",
    formCta: "Demander un mandat exclusif",
    defaultMessage:
      "Bonjour, je souhaite un mandat exclusif pour la vente de mon bien.",
    servicesIncluded: 8,
    servicesExcluded: 0,
    highlights: 4,
  },
  "semi-exclusif": {
    slug: "semi-exclusif",
    rate: "4,0 %",
    rateNote: "HT du prix net vendeur",
    duration: "6 mois renouvelables",
    formType: "mandate_semi",
    formCta: "Demander un mandat semi-exclusif",
    defaultMessage:
      "Bonjour, je souhaite un mandat semi-exclusif pour la vente de mon bien.",
    servicesIncluded: 6,
    servicesExcluded: 2,
    highlights: 3,
  },
  simple: {
    slug: "simple",
    rate: "4,5 %",
    rateNote: "HT du prix net vendeur",
    duration: "3 mois renouvelables",
    formType: "mandate_simple",
    formCta: "Demander un mandat simple",
    defaultMessage:
      "Bonjour, je souhaite un mandat simple pour la vente de mon bien.",
    servicesIncluded: 4,
    servicesExcluded: 4,
    highlights: 3,
  },
  autonome: {
    slug: "autonome",
    rate: "À discuter",
    rateNote: "Forfait limité aux prestations utilisées",
    duration: "Sur mesure",
    formType: "mandate_autonomous",
    formCta: "Discuter d'un mandat autonome",
    defaultMessage:
      "Bonjour, je souhaite un mandat autonome (assistance ponctuelle).",
    servicesIncluded: 3,
    servicesExcluded: 5,
    highlights: 3,
  },
  recherche: {
    slug: "recherche",
    rate: "1 % à 3 %",
    rateNote: "Selon la juridiction et la complexité",
    duration: "12 mois renouvelables",
    formType: "search_mandate",
    formCta: "Démarrer un mandat de recherche",
    defaultMessage:
      "Bonjour, je souhaite vous confier un mandat de recherche.",
    servicesIncluded: 6,
    servicesExcluded: 0,
    highlights: 4,
  },
};

export const ALL_MANDATE_SLUGS: MandateType[] = [
  "exclusif",
  "semi-exclusif",
  "simple",
  "autonome",
  "recherche",
];
