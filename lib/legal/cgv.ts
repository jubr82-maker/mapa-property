import type { LegalSection } from "@/components/legal/LegalLayout";

interface LegalContent {
  eyebrow: string;
  title: string;
  updatedAt: string;
  pdfLabel: string;
  disclaimer: string;
  intro?: string[];
  sections: LegalSection[];
  copyright: string;
}

const COPYRIGHT_FR =
  "© 2026 MAPA Synergy Sàrl — MAPA Property. Tous droits réservés. Toute reproduction interdite. Document susceptible d'évolution — version en vigueur consultable sur mapaproperty.lu.";

const DISCLAIMER_FR =
  "Ces CGV constituent une base de travail rédigée à titre indicatif. Elles doivent impérativement être validées et amendées par un avocat luxembourgeois inscrit au Barreau avant toute utilisation contractuelle effective. MAPA Synergy Sàrl recommande une revue juridique annuelle.";
const DISCLAIMER_EN =
  "These T&S are a working draft for information only. They must be reviewed and amended by a Luxembourg-admitted lawyer before any contractual use. MAPA Synergy Sàrl recommends an annual legal review.";
const DISCLAIMER_DE =
  "Diese AGB sind eine Arbeitsvorlage zu informativen Zwecken. Sie sind vor jeder vertraglichen Verwendung von einem in Luxemburg zugelassenen Anwalt zu prüfen und zu ergänzen. Eine jährliche Rechtsrevision wird empfohlen.";

const sectionsFr: LegalSection[] = [
  {
    heading: "1. Objet et champ d'application",
    paragraphs: [
      "Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles entre MAPA Synergy Sàrl, agissant sous le nom commercial MAPA Property (ci-après « MAPA » ou « le Mandataire »), et tout client (ci-après « le Mandant ») recourant à ses services d'agence immobilière et de broker (courtier) international.",
      "Sont concernées les prestations suivantes : conseil et accompagnement à la vente, à l'acquisition, à la location, accès off-market, mandat de recherche, estimation, et services connexes.",
      "Toute mission donne lieu à la signature d'un mandat distinct, qui prime sur les présentes CGV en cas de divergence.",
    ],
  },
  {
    heading: "2. Identification du prestataire",
    paragraphs: [
      "MAPA Synergy Sàrl, société à responsabilité limitée de droit luxembourgeois.",
      "Siège : 1, rue de la Vallée, L-3593 Dudelange.",
      "RCS Luxembourg : B241974. Autorisation d'établissement : 10108681. TVA : LU 31988923.",
      "IBAN : LU88 0019 5655 88 84 9000 — BIC : BCEELULL.",
      "Représentant : Julien Brebion, Real Estate Director.",
    ],
  },
  {
    heading: "3. Définitions",
    paragraphs: [
      "« Mandant » : personne physique ou morale donnant mandat à MAPA.",
      "« Mandataire » : MAPA Synergy Sàrl, agissant en qualité d'agent immobilier ou de broker.",
      "« Acquéreur » et « Vendeur » : les contreparties d'une transaction immobilière.",
      "« Bien » : tout bien immobilier objet d'un mandat.",
      "« Off-Market » : bien dont la commercialisation est strictement confidentielle, accessible uniquement sous NDA.",
      "« NDA » : Non-Disclosure Agreement, accord de confidentialité contractuel.",
      "« Compromis » : compromis de vente / promesse synallagmatique.",
      "« Acte authentique » : acte notarié de transfert de propriété.",
    ],
  },
  {
    heading: "4. Formation du contrat",
    paragraphs: [
      "Toute mission débute par un devis ou une proposition de mandat. Sa signature par le Mandant vaut acceptation pleine et entière des CGV et des conditions particulières du mandat.",
      "Pour les contrats conclus à distance ou hors lieux commerciaux avec un consommateur, le Mandant dispose d'un délai de rétractation de quatorze (14) jours calendaires à compter de la signature, sauf prestation déjà entièrement exécutée avec accord exprès du consommateur.",
    ],
  },
  {
    heading: "5. Obligations du Mandataire",
    paragraphs: [
      "MAPA s'engage à exécuter la mission confiée avec diligence, loyauté et conformément aux usages de la profession. Il s'agit d'une obligation de moyens et non de résultat.",
      "MAPA respecte la législation AML/KYC luxembourgeoise (loi du 12 novembre 2004 modifiée) et procède aux vérifications d'identité et d'origine des fonds requises.",
      "MAPA respecte la confidentialité de toute information non publique communiquée par le Mandant.",
    ],
  },
  {
    heading: "6. Obligations du Mandant",
    paragraphs: [
      "Le Mandant s'engage à fournir des informations sincères et complètes sur le bien (titre de propriété, surfaces, charges, vices apparents et cachés connus, état hypothécaire, etc.).",
      "Selon le type de mandat, le Mandant respecte une exclusivité totale ou partielle vis-à-vis de MAPA.",
      "Le Mandant s'engage à ne pas exercer d'activité concurrente avec MAPA pendant la durée du mandat (présentation directe d'acquéreurs identifiés par MAPA, contournement, etc.).",
    ],
  },
  {
    heading: "7. Honoraires",
    paragraphs: [
      "Les honoraires applicables sont précisés dans le mandat signé et dans le document Honoraires officiel MAPA Property accessible sur le site.",
      "Les honoraires sont exprimés HT, sauf mention contraire ; la TVA luxembourgeoise applicable est de 17 % à la date des présentes.",
      "L'honoraire est dû dès lors que l'intervention de MAPA Property a contribué directement ou indirectement à la conclusion de l'opération, y compris si l'acquéreur a été présenté par MAPA et que la vente se conclut postérieurement à la fin du mandat dans un délai de vingt-quatre (24) mois.",
      "Conditions de paiement : à la signature de l'acte authentique, sauf disposition contraire écrite. Tout retard entraîne, après mise en demeure, des pénalités au taux légal majoré de 5 points, ainsi qu'une indemnité forfaitaire pour frais de recouvrement.",
    ],
  },
  {
    heading: "8. Pack Vidéo",
    paragraphs: [
      "Le Pack Vidéo (tournage professionnel, drone si pertinent, montage) est inclus dans le Mandat Exclusif et facturé en option pour les autres mandats.",
      "En cas de retrait du mandat avant signature de compromis, le coût du Pack Vidéo déjà engagé est dû par le Mandant.",
    ],
  },
  {
    heading: "9. Off-Market",
    paragraphs: [
      "L'accès aux biens off-market est conditionné à la signature préalable d'un NDA contractuel.",
      "Toute divulgation, publication, transmission ou utilisation des informations off-market en dehors du cadre fixé par le NDA constitue une faute lourde et engage la responsabilité civile et pénale du contrevenant.",
      "MAPA se réserve le droit de réclamer des dommages-intérêts forfaitaires, sans préjudice du préjudice réellement subi.",
    ],
  },
  {
    heading: "10. Mandat de recherche",
    paragraphs: [
      "Le mandat de recherche est exclusif. Une avance sur frais peut être demandée, déductible des honoraires finaux en cas de réussite.",
      "L'honoraire est dû en cas d'identification d'un bien correspondant aux critères convenus, et de conclusion d'une opération avec ce bien dans un délai de vingt-quatre (24) mois suivant l'identification.",
    ],
  },
  {
    heading: "11. Confidentialité",
    paragraphs: [
      "Les parties s'engagent réciproquement à conserver strictement confidentielles toutes les informations échangées dans le cadre de la mission.",
      "Cette obligation de confidentialité demeure en vigueur pendant cinq (5) ans à compter de la fin de la relation contractuelle.",
    ],
  },
  {
    heading: "12. Propriété intellectuelle",
    paragraphs: [
      "Les descriptifs, photographies, vidéos, plans et tous supports créés ou financés par MAPA dans le cadre de la mission demeurent la propriété exclusive de MAPA.",
      "Le Mandant s'engage à ne pas réutiliser ces supports en dehors du cadre du mandat, ni les transmettre à des tiers sans autorisation écrite préalable.",
    ],
  },
  {
    heading: "13. Responsabilité",
    paragraphs: [
      "La responsabilité de MAPA est limitée aux dommages directs et prévisibles résultant d'une faute prouvée. Les dommages indirects (perte de chance, préjudice commercial, perte d'opportunité) sont expressément exclus.",
      "Le plafond annuel de responsabilité de MAPA est limité au montant total des honoraires effectivement perçus du Mandant au cours des douze (12) mois précédant le fait générateur, sauf disposition légale impérative contraire.",
    ],
  },
  {
    heading: "14. Force majeure",
    paragraphs: [
      "Aucune des parties ne pourra être tenue responsable d'un manquement résultant d'un cas de force majeure, entendu au sens large : catastrophe naturelle, conflit armé, pandémie, panne généralisée des télécommunications, décision administrative imprévue, etc.",
    ],
  },
  {
    heading: "15. AML / KYC",
    paragraphs: [
      "MAPA est tenue par la loi du 12 novembre 2004 (modifiée) à des obligations strictes de vigilance et de déclaration.",
      "MAPA se réserve le droit de refuser, suspendre ou résilier toute prestation si le Mandant ne fournit pas les documents requis (pièce d'identité, justificatif de domicile, origine des fonds, structure de propriété ultime).",
    ],
  },
  {
    heading: "16. Données personnelles",
    paragraphs: [
      "Le traitement des données personnelles est encadré par notre Politique RGPD accessible sur le site, conformément au Règlement (UE) 2016/679 et à la loi luxembourgeoise du 1er août 2018.",
    ],
  },
  {
    heading: "17. Droit de rétractation",
    paragraphs: [
      "Pour les contrats conclus à distance ou hors lieux commerciaux avec un consommateur, le Mandant dispose d'un délai de quatorze (14) jours calendaires pour se rétracter, sans avoir à justifier de motif.",
      "La rétractation s'exerce par notification écrite à l'adresse du siège ou par email à j.brebion@mapagroup.org.",
      "Si le Mandant a expressément demandé l'exécution immédiate de la prestation et que celle-ci a été entièrement réalisée avant la fin du délai, le droit de rétractation s'éteint.",
    ],
  },
  {
    heading: "18. Réclamations et médiation",
    paragraphs: [
      "Toute réclamation est à adresser par écrit à MAPA, qui s'engage à y répondre dans un délai raisonnable.",
      "À défaut de résolution amiable, le Mandant consommateur peut saisir le médiateur de la consommation luxembourgeois (https://meco.lu) avant tout recours juridictionnel.",
    ],
  },
  {
    heading: "19. Cession",
    paragraphs: [
      "Aucune partie ne peut céder ses droits ou obligations à un tiers sans l'accord écrit préalable de l'autre, sauf cession à une entité du même groupe.",
    ],
  },
  {
    heading: "20. Modification des CGV",
    paragraphs: [
      "MAPA se réserve le droit de modifier les présentes CGV. Toute modification substantielle fera l'objet d'une notification au Mandant trente (30) jours avant son entrée en vigueur. Le Mandant pourra s'opposer à la modification dans ce délai ; à défaut, l'acceptation sera réputée acquise.",
    ],
  },
  {
    heading: "21. Droit applicable",
    paragraphs: [
      "Les présentes CGV sont exclusivement régies par le droit luxembourgeois.",
    ],
  },
  {
    heading: "22. Juridiction",
    paragraphs: [
      "Tout litige sera de la compétence exclusive des tribunaux de Luxembourg-Ville, sauf disposition impérative contraire en faveur du consommateur résidant dans l'Union européenne.",
    ],
  },
  {
    heading: "23. Clause de sauvegarde",
    paragraphs: [
      "Si une ou plusieurs stipulations des présentes CGV venaient à être déclarées nulles, illégales ou inapplicables, les autres stipulations demeureraient en vigueur.",
    ],
  },
  {
    heading: "24. Anti-scraping",
    paragraphs: [
      "Toute extraction automatisée des données du site, notamment des descriptifs de biens, photographies et prix, est strictement interdite et constitue une violation du droit sui generis du producteur de bases de données (loi du 18 avril 2001) et une atteinte aux systèmes de traitement automatisé de données (article 509-1 du Code pénal luxembourgeois).",
      "Toute infraction fera l'objet de poursuites civiles et pénales.",
    ],
  },
];

const sectionsCondensed = (lang: "en" | "de"): LegalSection[] => {
  const titles =
    lang === "en"
      ? [
          "Purpose and scope",
          "Provider identification",
          "Definitions",
          "Contract formation and consumer 14-day withdrawal",
          "Mandator's obligations (means, AML/KYC, confidentiality)",
          "Mandant's obligations (sincerity, exclusivity, non-circumvention)",
          "Fees (24-month survival clause, payment, late penalties)",
          "Video Pack",
          "Off-Market and NDA",
          "Search mandate",
          "Confidentiality (5 years)",
          "Intellectual property",
          "Liability (direct foreseeable damages, annual cap)",
          "Force majeure",
          "AML / KYC",
          "Personal data — see GDPR Policy",
          "Right of withdrawal (14 days, consumer)",
          "Claims and mediation (meco.lu)",
          "Assignment",
          "Amendment (30 days notice)",
          "Applicable law (Luxembourg)",
          "Jurisdiction (Luxembourg-City)",
          "Severability",
          "Anti-scraping",
        ]
      : [
          "Zweck und Anwendungsbereich",
          "Identifikation des Dienstleisters",
          "Definitionen",
          "Vertragsabschluss und 14-Tage-Widerrufsrecht",
          "Pflichten des Mandatars (Bemühen, AML/KYC, Vertraulichkeit)",
          "Pflichten des Mandanten (Aufrichtigkeit, Exklusivität, Umgehungsverbot)",
          "Honorare (24-Monate-Nachwirkung, Zahlung, Verzugszinsen)",
          "Videopaket",
          "Off-Market und NDA",
          "Suchmandat",
          "Vertraulichkeit (5 Jahre)",
          "Geistiges Eigentum",
          "Haftung (direkte vorhersehbare Schäden, jährliche Obergrenze)",
          "Höhere Gewalt",
          "AML / KYC",
          "Personenbezogene Daten — siehe DSGVO-Erklärung",
          "Widerrufsrecht (14 Tage, Verbraucher)",
          "Reklamationen und Mediation (meco.lu)",
          "Abtretung",
          "Änderungen (30-Tage-Frist)",
          "Anwendbares Recht (Luxemburg)",
          "Gerichtsstand (Luxemburg-Stadt)",
          "Salvatorische Klausel",
          "Anti-Scraping",
        ];
  return titles.map((heading, i) => ({
    heading: `${i + 1}. ${heading}`,
    paragraphs:
      lang === "en"
        ? [
            "See the French version of this article for the binding text. Summary: this clause matches the French version with no substantive change.",
          ]
        : [
            "Maßgeblich ist die französische Fassung. Zusammenfassung: Diese Klausel entspricht inhaltlich der französischen Version.",
          ],
  }));
};

export const cgv: Record<"fr" | "en" | "de", LegalContent> = {
  fr: {
    eyebrow: "Légal",
    title: "Conditions Générales de Vente",
    updatedAt: "Mise à jour : 2026-05-08",
    pdfLabel: "Télécharger le PDF officiel",
    disclaimer: DISCLAIMER_FR,
    intro: [
      "Les présentes Conditions Générales de Vente (CGV) constituent le cadre contractuel entre MAPA Synergy Sàrl (« MAPA Property ») et ses clients pour l'ensemble des prestations d'agence immobilière et de broker international.",
    ],
    sections: sectionsFr,
    copyright: COPYRIGHT_FR,
  },
  en: {
    eyebrow: "Legal",
    title: "Terms and Conditions of Sale",
    updatedAt: "Updated: 2026-05-08",
    pdfLabel: "Download the official PDF",
    disclaimer: DISCLAIMER_EN,
    intro: [
      "The French version of these Terms is the legally binding version. The English version is provided for information only.",
    ],
    sections: sectionsCondensed("en"),
    copyright: COPYRIGHT_FR,
  },
  de: {
    eyebrow: "Rechtliches",
    title: "Allgemeine Verkaufsbedingungen",
    updatedAt: "Aktualisiert: 2026-05-08",
    pdfLabel: "Offizielles PDF herunterladen",
    disclaimer: DISCLAIMER_DE,
    intro: [
      "Maßgeblich ist die französische Fassung dieser AGB. Die deutsche Fassung dient nur zur Information.",
    ],
    sections: sectionsCondensed("de"),
    copyright: COPYRIGHT_FR,
  },
};
