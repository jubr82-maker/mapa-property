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
  "© 2026 MAPA Synergy Sàrl — MAPA Property. Tous droits réservés. Toute reproduction interdite.";

export const cgu: Record<"fr" | "en" | "de", LegalContent> = {
  fr: {
    eyebrow: "Légal",
    title: "Conditions Générales d'Utilisation",
    updatedAt: "Mise à jour : 2026-05-08",
    pdfLabel: "Télécharger le PDF officiel",
    intro: [
      "Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation du site mapaproperty.lu, édité par MAPA Synergy Sàrl (« MAPA Property »).",
      "L'accès au site implique l'acceptation pleine et entière des présentes CGU.",
    ],
    sections: [
      {
        heading: "1. Objet du site",
        paragraphs: [
          "Le site mapaproperty.lu présente les services de MAPA Property : agence immobilière luxembourgeoise et broker (courtier) international, vente, location, off-market, mandats, estimation, simulateurs, contenus éditoriaux.",
          "Les informations affichées sont fournies à titre informatif et ne constituent pas une offre contractuelle. Toute transaction nécessite la signature d'un mandat distinct.",
        ],
      },
      {
        heading: "2. Accès au site",
        paragraphs: [
          "L'accès est libre et gratuit. Certaines fonctionnalités (formulaires, off-market) requièrent la transmission de données personnelles (cf. Politique RGPD).",
          "MAPA Property se réserve le droit de modifier, suspendre ou interrompre tout ou partie du site sans préavis.",
        ],
      },
      {
        heading: "3. Propriété intellectuelle",
        paragraphs: [
          "Le code source du présent site, ainsi que sa structure, son design, ses contenus textuels et iconographiques, photographies, vidéos, descriptifs de biens, sont la propriété exclusive de MAPA Synergy Sàrl ou de ses partenaires sous licence.",
          "Toute reproduction, représentation, modification ou exploitation, totale ou partielle, par quelque procédé que ce soit, est strictement interdite sans autorisation écrite préalable de MAPA Synergy Sàrl.",
        ],
      },
      {
        heading: "4. Anti-scraping et protection des bases de données",
        paragraphs: [
          "Toute extraction automatisée des données du site, notamment des descriptifs de biens, photographies, prix, est strictement interdite et constitue une violation du droit sui generis du producteur de bases de données (loi du 18 avril 2001) et une atteinte aux systèmes de traitement automatisé de données (article 509-1 du Code pénal luxembourgeois).",
          "Toute infraction fera l'objet de poursuites civiles et pénales.",
          "L'utilisation d'outils automatisés (scrapers, bots, crawlers tiers) sans autorisation écrite est expressément interdite et entraînera le blocage immédiat ainsi que des poursuites.",
        ],
      },
      {
        heading: "5. Logging technique",
        paragraphs: [
          "Tout accès au site fait l'objet d'un enregistrement technique (IP anonymisée, timestamp, pages consultées, user-agent). Ces données sont conservées 13 mois à des fins de sécurité, prévention des abus et conformité légale.",
          "Le détail du traitement et les bases légales sont précisés dans la Politique RGPD.",
        ],
      },
      {
        heading: "6. Liens externes",
        paragraphs: [
          "Le site peut contenir des liens vers des sites tiers (portails immobiliers, sources institutionnelles, partenaires). MAPA Property n'exerce aucun contrôle sur ces sites et décline toute responsabilité quant à leur contenu.",
        ],
      },
      {
        heading: "7. Comportement de l'utilisateur",
        paragraphs: [
          "L'utilisateur s'engage à ne pas perturber le fonctionnement du site, à ne pas tenter d'y introduire de contenu malveillant, à ne pas porter atteinte aux droits de tiers, et à respecter la législation en vigueur.",
          "Tout comportement contraire pourra entraîner des sanctions, le blocage de l'accès et des poursuites.",
        ],
      },
      {
        heading: "8. Cookies",
        paragraphs: [
          "Le site utilise un nombre minimal de cookies techniques nécessaires à son fonctionnement (préférence de langue, mode jour/nuit, panier off-market, mesure d'audience anonyme).",
          "Les détails sont précisés dans la Politique cookies (à venir) et la Politique RGPD.",
        ],
      },
      {
        heading: "9. Limitation de responsabilité",
        paragraphs: [
          "MAPA Property s'efforce d'assurer l'exactitude et l'actualité des informations diffusées. Cependant, aucune garantie n'est donnée quant à leur exhaustivité, leur précision ou leur disponibilité permanente.",
          "MAPA Property décline toute responsabilité pour les dommages directs ou indirects résultant de l'usage du site, notamment en cas d'indisponibilité, d'erreur d'affichage des prix ou descriptifs, ou de perte de données.",
        ],
      },
      {
        heading: "10. Modification des CGU",
        paragraphs: [
          "MAPA Property se réserve le droit de modifier les présentes CGU à tout moment. La version en vigueur est celle accessible sur le site à la date d'utilisation. Une modification substantielle fera l'objet d'une notification visible.",
        ],
      },
      {
        heading: "11. Droit applicable et juridiction",
        paragraphs: [
          "Les présentes CGU sont régies par le droit luxembourgeois. Tout litige relatif à leur interprétation ou exécution relèvera de la compétence exclusive des tribunaux de Luxembourg-Ville, sauf disposition impérative contraire en faveur du consommateur.",
        ],
      },
    ],
    copyright: COPYRIGHT_FR,
  },
  en: {
    eyebrow: "Legal",
    title: "Terms of Use",
    updatedAt: "Updated: 2026-05-08",
    pdfLabel: "Download the official PDF",
    intro: [
      "The French version of these Terms of Use is the legally binding version. The English version is provided for information only.",
      "These Terms govern access to and use of mapaproperty.lu, published by MAPA Synergy Sàrl (\"MAPA Property\").",
    ],
    sections: [
      {
        heading: "1. Purpose",
        paragraphs: [
          "The site presents MAPA Property's services. Information is informational only and does not constitute a contractual offer. Transactions require a separate signed mandate.",
        ],
      },
      {
        heading: "2. Access",
        paragraphs: [
          "Access is free. Some features require personal data submission (see Privacy Policy).",
          "MAPA Property reserves the right to modify, suspend or interrupt the site without notice.",
        ],
      },
      {
        heading: "3. Intellectual property",
        paragraphs: [
          "The site, its source code, design, content, photos, videos and listing descriptions are the exclusive property of MAPA Synergy Sàrl. Reproduction prohibited without prior written consent.",
        ],
      },
      {
        heading: "4. Anti-scraping",
        paragraphs: [
          "Automated extraction of site data is strictly prohibited under Luxembourg database protection law (April 18, 2001) and Article 509-1 of the Luxembourg Criminal Code. Civil and criminal proceedings will follow.",
        ],
      },
      {
        heading: "5. Technical logging",
        paragraphs: [
          "Each visit is logged technically (anonymised IP, timestamp, pages, user-agent) and retained for 13 months for security, abuse prevention and legal compliance.",
        ],
      },
      {
        heading: "6. External links",
        paragraphs: [
          "MAPA Property is not liable for content on third-party sites linked from this site.",
        ],
      },
      {
        heading: "7. User conduct",
        paragraphs: [
          "Users must not disrupt the site, introduce malicious content, infringe third-party rights or violate applicable law. Breaches lead to access blocking and legal action.",
        ],
      },
      {
        heading: "8. Cookies",
        paragraphs: [
          "Minimal technical cookies (language, theme, off-market basket, anonymous analytics). See Privacy Policy.",
        ],
      },
      {
        heading: "9. Liability",
        paragraphs: [
          "MAPA Property strives for accurate and up-to-date information but offers no warranty of completeness or availability. Liability is excluded for direct or indirect damages.",
        ],
      },
      {
        heading: "10. Amendments",
        paragraphs: [
          "MAPA Property may amend these Terms at any time. Substantive changes will be visibly notified.",
        ],
      },
      {
        heading: "11. Law and jurisdiction",
        paragraphs: [
          "Luxembourg law applies. Exclusive jurisdiction: courts of Luxembourg-City, subject to mandatory consumer-protection rules.",
        ],
      },
    ],
    copyright: COPYRIGHT_FR,
  },
  de: {
    eyebrow: "Rechtliches",
    title: "Nutzungsbedingungen",
    updatedAt: "Aktualisiert: 2026-05-08",
    pdfLabel: "Offizielles PDF herunterladen",
    intro: [
      "Die französische Fassung dieser Nutzungsbedingungen ist rechtsverbindlich. Die deutsche Fassung dient nur zur Information.",
      "Diese Bedingungen regeln den Zugriff auf und die Nutzung von mapaproperty.lu, herausgegeben von MAPA Synergy Sàrl („MAPA Property\").",
    ],
    sections: [
      {
        heading: "1. Zweck",
        paragraphs: [
          "Die Site stellt die Leistungen von MAPA Property dar. Informationen sind rein informativ und stellen kein vertragliches Angebot dar.",
        ],
      },
      {
        heading: "2. Zugang",
        paragraphs: [
          "Der Zugang ist kostenlos. Einige Funktionen erfordern personenbezogene Daten (siehe Datenschutzerklärung).",
        ],
      },
      {
        heading: "3. Geistiges Eigentum",
        paragraphs: [
          "Die Website ist ausschließliches Eigentum von MAPA Synergy Sàrl. Vervielfältigung ohne vorherige schriftliche Zustimmung untersagt.",
        ],
      },
      {
        heading: "4. Anti-Scraping",
        paragraphs: [
          "Die automatisierte Extraktion von Daten ist gemäß luxemburgischem Datenbankschutzrecht (Gesetz vom 18. April 2001) und Artikel 509-1 des luxemburgischen Strafgesetzbuches strikt untersagt.",
        ],
      },
      {
        heading: "5. Technisches Logging",
        paragraphs: [
          "Jeder Zugriff wird technisch protokolliert (anonymisierte IP, Timestamp, Seiten, User-Agent) und 13 Monate lang aufbewahrt.",
        ],
      },
      {
        heading: "6. Externe Links",
        paragraphs: [
          "MAPA Property haftet nicht für Inhalte verlinkter Drittseiten.",
        ],
      },
      {
        heading: "7. Nutzerverhalten",
        paragraphs: [
          "Nutzer dürfen die Site nicht stören, keine Schadinhalte einbringen, keine Rechte Dritter verletzen.",
        ],
      },
      {
        heading: "8. Cookies",
        paragraphs: [
          "Minimale technische Cookies (Sprache, Theme, Off-Market-Korb, anonyme Statistik).",
        ],
      },
      {
        heading: "9. Haftung",
        paragraphs: [
          "MAPA Property bemüht sich um Genauigkeit und Aktualität, gewährt aber keine Garantie. Haftung für direkte und indirekte Schäden ausgeschlossen.",
        ],
      },
      {
        heading: "10. Änderungen",
        paragraphs: [
          "Wesentliche Änderungen werden sichtbar mitgeteilt.",
        ],
      },
      {
        heading: "11. Recht und Gerichtsstand",
        paragraphs: [
          "Luxemburgisches Recht. Ausschließlicher Gerichtsstand: Luxemburg-Stadt.",
        ],
      },
    ],
    copyright: COPYRIGHT_FR,
  },
};
