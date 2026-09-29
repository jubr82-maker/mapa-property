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
  "© 2026 MAPA Synergy Sàrl, MAPA Property. Tous droits réservés. Honoraires HT, TVA luxembourgeoise applicable.";
const COPYRIGHT_EN =
  "© 2026 MAPA Synergy Sàrl, MAPA Property. All rights reserved. Fees excl. VAT, Luxembourg VAT applicable.";
const COPYRIGHT_DE =
  "© 2026 MAPA Synergy Sàrl, MAPA Property. Alle Rechte vorbehalten. Honorare zzgl. MwSt., luxemburgische MwSt. anwendbar.";

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
          "Mandat Exclusif : 3 % HT du prix net vendeur. Pack Vidéo en option.",
          "Mandat Semi-Exclusif : 4 % HT du prix net vendeur. Pack Vidéo en option.",
          "Mandat Simple : 5 % HT du prix net vendeur.",
          "Mandat Autonome : 1 % HT du prix net vendeur (backup juridique et notarial, assistance ponctuelle).",
        ],
      },
      {
        heading: "Mandats de Recherche – Sourcing Exclusif",
        paragraphs: [
          "Luxembourg : 3 % à 5 % HT du prix d'acquisition.",
          "Europe (y compris France) : 3 % à 8 % HT selon complexité et pays.",
          "International : sur devis, à définir au mandat.",
          "Couverture : Luxembourg, Union européenne, hors UE (Émirats, Royaume-Uni, Suisse, Amériques).",
        ],
      },
      {
        heading: "Avance sur frais de recherche",
        paragraphs: [
          "Toute mission de recherche donne lieu à une avance sur frais, intégralement déduite de nos honoraires si la transaction se conclut avec MAPA Property.",
          "Luxembourg : 250 € hors TVA. Régions limitrophes, jusqu'à 100 km : à partir de 500 € hors TVA. Autres pays : sur devis, selon les déplacements nécessaires.",
          "Pourquoi cette avance : un mandat de recherche nous engage à travailler exclusivement sur votre projet. Nous cessons de proposer les biens identifiés à d'autres acquéreurs, nous activons notre réseau, nous visitons et qualifions avant de vous présenter quoi que ce soit. Ce temps est réel, il précède toute transaction, et il ne peut pas être gratuit. L'avance formalise cet engagement réciproque : vous vous engagez sur un projet défini, nous y consacrons nos moyens.",
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
          "Toujours en option, sur devis, quel que soit le mandat souscrit.",
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
          "Frais d'enregistrement et de notaire : environ 6 % de droits d'enregistrement, 1 % de droit de transcription et environ 1 % d'honoraires de notaire, soit un total indicatif proche de 8 % au Luxembourg. Le Bëllegen Akt est un crédit d'impôt jusqu'à 40 000 € par acquéreur, sans condition d'âge ni de primo-accession, pour toute résidence principale.",
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
          "Exclusive: 3% (excl. VAT) of net seller price. Video Pack optional.",
          "Semi-Exclusive: 4%. Video Pack optional.",
          "Simple: 5%.",
          "Autonomous: 1% (excl. VAT) of net seller price (legal and notarial backup, à la carte assistance).",
        ],
      },
      {
        heading: "Search Mandates – Exclusive Sourcing",
        paragraphs: [
          "Luxembourg: 3% to 5% (excl. VAT) of acquisition price.",
          "Europe (including France): 3% to 8% (excl. VAT) depending on complexity and country.",
          "International: on quote, to be defined at mandate signing.",
          "Coverage: Luxembourg, EU, outside EU (UAE, UK, Switzerland, Americas).",
        ],
      },
      {
        heading: "Search fee advance",
        paragraphs: [
          "Every search mandate carries a fee advance, fully deducted from our fees if the transaction concludes with MAPA Property.",
          "Luxembourg: €250 excluding VAT. Neighbouring regions, up to 100 km: from €500 excluding VAT. Other countries: by quotation, depending on the travel required.",
          "Why this advance: a search mandate commits us to working exclusively on your project. We stop offering the properties we identify to other buyers, we activate our network, we visit and qualify before presenting anything to you. This time is real, it precedes any transaction, and it cannot be free. The advance formalises this mutual commitment: you commit to a defined project, and we commit our resources to it.",
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
          "Always optional, by quotation, regardless of the mandate signed.",
          "Includes professional filming, drone footage where relevant, post-production, HD masters for social media and the site.",
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
          "Registration and notary fees: approximately 6% registration duty, 1% transcription duty and approximately 1% notary fees, for an indicative total close to 8% in Luxembourg. The Bëllegen Akt is a tax credit of up to €40,000 per buyer on registration duty, for any primary residence, no age or first-time buyer condition.",
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
    copyright: COPYRIGHT_EN,
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
          "Exklusiv: 3 % zzgl. MwSt. des Nettoverkäuferpreises. Videopaket optional.",
          "Halb-Exklusiv: 4 %. Videopaket optional.",
          "Einfach: 5 %.",
          "Autonom: 1 % zzgl. MwSt. (juristische und notarielle Rückendeckung, punktuelle Unterstützung).",
        ],
      },
      {
        heading: "Suchmandate – Exklusives Sourcing",
        paragraphs: [
          "Luxemburg: 3 % bis 5 % zzgl. MwSt. des Kaufpreises.",
          "Europa (einschließlich Frankreich): 3 % bis 8 % zzgl. MwSt. je nach Komplexität und Land.",
          "International: nach Angebot, zum Zeitpunkt der Mandatsunterzeichnung festgelegt.",
          "Abdeckung: Luxemburg, EU, außerhalb EU (VAE, UK, Schweiz, Amerika).",
        ],
      },
      {
        heading: "Vorschuss auf Suchkosten",
        paragraphs: [
          "Jeder Suchauftrag zieht einen Vorschuss auf Kosten nach sich, der vollständig von unserem Honorar abgezogen wird, wenn das Geschäft mit MAPA Property abgeschlossen wird.",
          "Luxemburg: 250 € zzgl. MwSt. Angrenzende Regionen, bis 100 km: ab 500 € zzgl. MwSt. Andere Länder: auf Angebot, je nach erforderlichen Reisen.",
          "Warum dieser Vorschuss: Ein Suchmandat verpflichtet uns, ausschließlich an Ihrem Vorhaben zu arbeiten. Wir bieten die identifizierten Objekte keinen anderen Käufern mehr an, wir aktivieren unser Netzwerk, wir besichtigen und qualifizieren, bevor wir Ihnen überhaupt etwas vorstellen. Diese Zeit ist real, sie geht jeder Transaktion voraus, und sie kann nicht kostenlos sein. Der Vorschuss formalisiert dieses gegenseitige Engagement: Sie verpflichten sich auf ein definiertes Vorhaben, wir setzen dafür unsere Mittel ein.",
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
          "Immer optional, auf Angebot, unabhängig vom unterzeichneten Mandat.",
          "Umfasst professionellen Dreh, Drohnenaufnahmen falls relevant, Postproduktion, HD-Master für soziale Netzwerke und die Website.",
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
          "Eintragungs- und Notarkosten: etwa 6 % Eintragungsgebühr, 1 % Übertragungsgebühr und etwa 1 % Notarhonorar, insgesamt indikativ nahe 8 % in Luxemburg. Der Bëllegen Akt ist eine Steuergutschrift von bis zu 40 000 € pro Käufer auf die Eintragungsgebühr für jeden Hauptwohnsitz, ohne Alters- oder Erstkäufer-Bedingung.",
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
    copyright: COPYRIGHT_DE,
  },
};
