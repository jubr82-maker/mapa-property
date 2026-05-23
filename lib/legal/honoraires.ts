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
          "Mandat Exclusif : 3 % HT du prix net vendeur. Pack Vidéo inclus.",
          "Mandat Semi-Exclusif : 4 % HT du prix net vendeur. Pack Vidéo en option.",
          "Mandat Simple : 5 % HT du prix net vendeur.",
          "Mandat Autonome : 1 % HT du prix net vendeur (backup juridique et notarial, assistance ponctuelle).",
        ],
      },
      {
        heading: "Mandats de Recherche – Sourcing Exclusif",
        paragraphs: [
          "Luxembourg : 3 % à 5 % HT du prix d'acquisition.",
          "France (transfrontalier et national) : selon barème France ci-dessus.",
          "Europe (hors Luxembourg) : 3 % à 8 % HT selon complexité et pays.",
          "International : sur devis, à définir au mandat.",
          "Avance sur frais : une avance forfaitaire est exigible à la signature du mandat. Elle est intégralement déduite de la commission finale due. Le montant de l'avance est défini au mandat selon la zone géographique et la complexité de la mission.",
          "Couverture : Luxembourg, Union européenne, hors UE (Émirats, Royaume-Uni, Suisse, Amériques).",
        ],
      },
      {
        heading: "Mise en location & gestion locative",
        paragraphs: [
          "Honoraires de mise en location : un mois de loyer HT, partagé selon usage (50 % bailleur / 50 % locataire) ou intégralement à la charge du bailleur selon mandat.",
          "Gestion locative : 6 % à 8 % HT des loyers encaissés, selon les services inclus.",
          "Le plafond luxembourgeois de 5 % du capital investi par an est strictement respecté.",
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
          "Frais d'enregistrement et de notaire : payés au notaire (~7 % au Luxembourg). Le Bëllegen Akt est un crédit d'impôt jusqu'à 40 000 € par acquéreur, sans condition d'âge ni de primo-accession, pour toute résidence principale.",
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
          "Exclusive: 3% (excl. VAT) of net seller price. Video Pack included.",
          "Semi-Exclusive: 4%. Video Pack optional.",
          "Simple: 5%.",
          "Autonomous: 1% (excl. VAT) of net seller price (legal and notarial backup, à la carte assistance).",
        ],
      },
      {
        heading: "Search Mandates – Exclusive Sourcing",
        paragraphs: [
          "Luxembourg: 3% to 5% (excl. VAT) of acquisition price.",
          "France (cross-border and national): per France schedule above.",
          "Europe (outside Luxembourg): 3% to 8% (excl. VAT) depending on complexity and country.",
          "International: on quote, to be defined at mandate signing.",
          "Retainer: a flat retainer is due at mandate signing. It is fully deducted from the final commission. The retainer amount is defined at mandate signing based on geographic scope and mission complexity.",
          "Coverage: Luxembourg, EU, outside EU (UAE, UK, Switzerland, Americas).",
        ],
      },
      {
        heading: "Rental & property management",
        paragraphs: [
          "Letting: one month's rent (excl. VAT), split as customary or fully at landlord's expense.",
          "Property management: 6% to 8% (excl. VAT) of collected rents.",
          "Strict compliance with the Luxembourg 5% rent cap on invested capital per year.",
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
          "Notary fees ~7% in Luxembourg. The Bëllegen Akt is a tax credit of up to €40,000 per buyer on registration duty, for any primary residence, no age or first-time buyer condition.",
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
          "Exklusiv: 3 % zzgl. MwSt. des Nettoverkäuferpreises. Videopaket inklusive.",
          "Halb-Exklusiv: 4 %. Videopaket optional.",
          "Einfach: 5 %.",
          "Autonom: 1 % zzgl. MwSt. (juristische und notarielle Rückendeckung, punktuelle Unterstützung).",
        ],
      },
      {
        heading: "Suchmandate – Exklusives Sourcing",
        paragraphs: [
          "Luxemburg: 3 % bis 5 % zzgl. MwSt. des Kaufpreises.",
          "Frankreich (grenzüberschreitend und national): gemäß französischem Tarif oben.",
          "Europa (außer Luxemburg): 3 % bis 8 % zzgl. MwSt. je nach Komplexität und Land.",
          "International: nach Angebot, zum Zeitpunkt der Mandatsunterzeichnung festgelegt.",
          "Vorschuss: Bei Unterzeichnung des Mandats wird ein pauschaler Vorschuss fällig. Er wird vollständig von der Endprovision abgezogen. Die Höhe des Vorschusses wird im Mandat je nach geografischem Geltungsbereich und Komplexität festgelegt.",
          "Abdeckung: Luxemburg, EU, außerhalb EU (VAE, UK, Schweiz, Amerika).",
        ],
      },
      {
        heading: "Vermietung & Verwaltung",
        paragraphs: [
          "Vermietung: eine Monatsmiete zzgl. MwSt., je nach Brauch geteilt oder voll vom Vermieter getragen.",
          "Hausverwaltung: 6 % bis 8 % zzgl. MwSt. der eingenommenen Mieten.",
          "Strikte Einhaltung der Luxemburger 5 %-Mietobergrenze auf investiertes Kapital pro Jahr.",
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
          "Notarkosten ~7 % in Luxemburg. Der Bëllegen Akt ist eine Steuergutschrift von bis zu 40 000 € pro Käufer auf die Eintragungsgebühr für jeden Hauptwohnsitz, ohne Alters- oder Erstkäufer-Bedingung.",
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
