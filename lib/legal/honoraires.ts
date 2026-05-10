import type { LegalSection } from "@/components/legal/LegalLayout";

interface LegalContent {
  eyebrow: string;
  title: string;
  updatedAt: string;
  pdfLabel: string;
  intro?: string[];
  sections: LegalSection[];
  copyright: string;
}

const COPYRIGHT_FR =
  "© 2026 MAPA Synergy Sàrl — MAPA Property. Tous droits réservés. Honoraires HT, TVA luxembourgeoise applicable.";

export const honoraires: Record<"fr" | "en" | "de", LegalContent> = {
  fr: {
    eyebrow: "Légal",
    title: "Honoraires",
    updatedAt: "Mise à jour : 2026-05-08",
    pdfLabel: "Télécharger le PDF officiel",
    intro: [
      "Les honoraires de MAPA Property sont publics, indiqués HT, et soumis à la TVA luxembourgeoise (17 % à la date des présentes). Le PDF officiel ci-dessus prime en cas de différence avec la version web.",
    ],
    sections: [
      {
        heading: "Mandats de vente",
        paragraphs: [
          "Mandat Exclusif : 3,5 % HT du prix net vendeur. Pack Vidéo inclus.",
          "Mandat Semi-Exclusif : 4,0 % HT du prix net vendeur. Pack Vidéo en option.",
          "Mandat Simple : 4,5 % HT du prix net vendeur.",
          "Mandat Autonome : forfait sur devis (assistance ponctuelle, audit juridique, coordination notariale).",
        ],
      },
      {
        heading: "Mandat de recherche",
        paragraphs: [
          "Honoraires : 1 % à 3 % HT du prix d'acquisition selon la juridiction et la complexité.",
          "Avance sur frais : montant forfaitaire éventuel précisé au mandat, déductible des honoraires en cas de réussite.",
          "Couverture : Luxembourg, Union européenne, hors UE (Émirats, Royaume-Uni, Suisse, Amériques).",
        ],
      },
      {
        heading: "Mise en location & gestion locative",
        paragraphs: [
          "Honoraires de mise en location : un mois de loyer HT, partagé selon usage (50 % bailleur / 50 % locataire) ou intégralement à la charge du bailleur selon mandat.",
          "Gestion locative : 6 % à 8 % HT des loyers encaissés, selon les services inclus.",
          "Le plafond loyer 5 % du capital investi par an (loi du 21 septembre 2006) est strictement respecté.",
        ],
      },
      {
        heading: "Pack Vidéo",
        paragraphs: [
          "Inclus dans le Mandat Exclusif. En option pour les autres mandats : devis sur demande.",
          "Comprend tournage professionnel, drone si pertinent, post-production, masters HD pour réseaux et site.",
        ],
      },
      {
        heading: "Estimation",
        paragraphs: [
          "Estimation indicative en ligne : gratuite via le simulateur du site.",
          "Estimation visite & rapport écrit : gratuite dans le cadre d'un mandat de vente potentiel ; sur devis hors mandat.",
        ],
      },
      {
        heading: "Modalités de facturation",
        paragraphs: [
          "Les honoraires sont dus à la signature de l'acte authentique, sauf disposition contraire écrite.",
          "L'honoraire est dû dès lors que l'intervention de MAPA Property a contribué directement ou indirectement à la conclusion de l'opération, y compris si l'acquéreur a été présenté par MAPA et que la vente se conclut postérieurement à la fin du mandat dans un délai de 24 mois (cf. CGV).",
        ],
      },
      {
        heading: "Frais annexes (à la charge du Mandant)",
        paragraphs: [
          "Frais d'enregistrement et de notaire : payés au notaire (~7 % au Luxembourg). Le Bëllegen Akt est un abattement de 40 000 € par acquéreur, sans condition d'âge ni de primo-accession, pour toute résidence principale (loi du 3 juillet 2025).",
          "Frais d'huissier en cas de procédure : à la charge du Mandant.",
          "Frais de déplacement à l'international au-delà de 200 km du siège : forfait kilométrique sur devis.",
        ],
      },
      {
        heading: "Disclaimer",
        paragraphs: [
          "Les présents honoraires sont indicatifs et susceptibles d'évolution. Les honoraires applicables sont ceux indiqués dans le mandat signé. En cas de divergence entre la version web et le PDF officiel, le PDF prime.",
        ],
      },
    ],
    copyright: COPYRIGHT_FR,
  },
  en: {
    eyebrow: "Legal",
    title: "Fees",
    updatedAt: "Updated: 2026-05-08",
    pdfLabel: "Download the official PDF",
    intro: [
      "MAPA Property fees are public, expressed excluding VAT (Luxembourg VAT at 17%). The official PDF prevails over the web version in case of discrepancy.",
    ],
    sections: [
      {
        heading: "Sale mandates",
        paragraphs: [
          "Exclusive: 3.5% (excl. VAT) of net seller price. Video Pack included.",
          "Semi-Exclusive: 4.0%. Video Pack optional.",
          "Simple: 4.5%.",
          "Autonomous: à la carte quote.",
        ],
      },
      {
        heading: "Search mandate",
        paragraphs: [
          "1% to 3% (excl. VAT) of acquisition price, by jurisdiction and complexity.",
          "Possible upfront fee, deductible from final fees on success.",
          "Coverage: Luxembourg, EU, outside EU (UAE, UK, Switzerland, Americas).",
        ],
      },
      {
        heading: "Rental & property management",
        paragraphs: [
          "Letting: one month's rent (excl. VAT), split as customary or fully at landlord's expense.",
          "Property management: 6% to 8% (excl. VAT) of collected rents.",
          "Strict compliance with the 5% rent cap on invested capital (law of 21 September 2006).",
        ],
      },
      {
        heading: "Video Pack",
        paragraphs: [
          "Included in Exclusive mandate. Optional elsewhere — quote on request.",
        ],
      },
      {
        heading: "Valuation",
        paragraphs: [
          "Online indicative valuation: free via site simulator.",
          "On-site valuation report: free under prospective sale mandate; quote outside.",
        ],
      },
      {
        heading: "Billing",
        paragraphs: [
          "Fees due upon notarial deed signature.",
          "Fees are due if MAPA's intervention contributed directly or indirectly to the operation, including if the buyer was introduced by MAPA and the sale closes within 24 months after the mandate ends.",
        ],
      },
      {
        heading: "Ancillary fees (Mandant's expense)",
        paragraphs: [
          "Notary fees ~7% in Luxembourg, including 1% Bëllegen Akt (rebate for first-time buyer / primary residence).",
          "Bailiff fees if proceedings.",
          "International travel beyond 200 km from HQ: per-quote.",
        ],
      },
      {
        heading: "Disclaimer",
        paragraphs: [
          "Indicative fees, subject to evolution. Applicable fees are those in the signed mandate. PDF prevails over web version.",
        ],
      },
    ],
    copyright: COPYRIGHT_FR,
  },
  de: {
    eyebrow: "Rechtliches",
    title: "Honorare",
    updatedAt: "Aktualisiert: 2026-05-08",
    pdfLabel: "Offizielles PDF herunterladen",
    intro: [
      "Die Honorare von MAPA Property sind öffentlich, in zzgl. MwSt. ausgewiesen (Luxemburger MwSt. 17 %). Das offizielle PDF ist maßgeblich.",
    ],
    sections: [
      {
        heading: "Verkaufsmandate",
        paragraphs: [
          "Exklusiv: 3,5 % zzgl. MwSt. des Nettoverkäuferpreises. Videopaket inklusive.",
          "Halb-Exklusiv: 4,0 %. Videopaket optional.",
          "Einfach: 4,5 %.",
          "Autonom: maßgeschneidertes Angebot.",
        ],
      },
      {
        heading: "Suchmandat",
        paragraphs: [
          "1 % bis 3 % zzgl. MwSt. des Kaufpreises, je nach Jurisdiktion und Komplexität.",
          "Möglicher Vorschuss, bei Erfolg von Endhonoraren abziehbar.",
          "Abdeckung: Luxemburg, EU, außerhalb EU (VAE, UK, Schweiz, Amerika).",
        ],
      },
      {
        heading: "Vermietung & Verwaltung",
        paragraphs: [
          "Vermietung: eine Monatsmiete zzgl. MwSt., je nach Brauch geteilt oder voll vom Vermieter getragen.",
          "Hausverwaltung: 6 % bis 8 % zzgl. MwSt. der eingenommenen Mieten.",
          "Strikte Einhaltung der 5 %-Mietobergrenze auf investiertes Kapital (Gesetz vom 21. September 2006).",
        ],
      },
      {
        heading: "Videopaket",
        paragraphs: [
          "Im Exklusivmandat enthalten. Andernorts optional auf Angebot.",
        ],
      },
      {
        heading: "Bewertung",
        paragraphs: [
          "Online-Indikativbewertung: kostenlos via Site-Rechner.",
          "Vor-Ort-Bewertungsbericht: kostenlos im Rahmen eines Verkaufsmandats; sonst auf Angebot.",
        ],
      },
      {
        heading: "Abrechnung",
        paragraphs: [
          "Honorar fällig bei Unterzeichnung der notariellen Urkunde.",
          "Honorar geschuldet, wenn MAPAs Eingriff direkt oder indirekt zum Geschäft beigetragen hat — inklusive Verkauf an einen von MAPA vermittelten Käufer innerhalb von 24 Monaten nach Mandatsende.",
        ],
      },
      {
        heading: "Nebenkosten (zu Lasten des Mandanten)",
        paragraphs: [
          "Notarkosten ~7 % in Luxemburg, davon 1 % Bëllegen Akt (Rabatt bei Erstkauf / Hauptwohnsitz).",
          "Gerichtsvollzieherkosten bei Verfahren.",
          "Internationale Reisen über 200 km vom Sitz: auf Angebot.",
        ],
      },
      {
        heading: "Hinweis",
        paragraphs: [
          "Indikative Honorare, Änderungen vorbehalten. Maßgeblich sind die im unterzeichneten Mandat genannten Honorare. PDF hat Vorrang vor Web-Version.",
        ],
      },
    ],
    copyright: COPYRIGHT_FR,
  },
};
