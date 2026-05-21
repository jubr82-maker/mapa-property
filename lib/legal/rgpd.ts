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
  "© 2026 MAPA Synergy Sàrl — MAPA Property. Politique conforme RGPD (UE 2016/679) et loi luxembourgeoise du 1er août 2018.";

export const rgpd: Record<"fr" | "en" | "de", LegalContent> = {
  fr: {
    eyebrow: "Légal",
    title: "Politique de protection des données (RGPD)",
    updatedAt: "Mise à jour : 2026-05-08",
    pdfLabel: "Télécharger le PDF officiel",
    intro: [
      "MAPA Synergy Sàrl (« MAPA Property ») accorde une importance particulière à la protection de vos données personnelles. La présente politique vous informe sur les traitements effectués via le site mapaproperty.lu, conformément au Règlement (UE) 2016/679 (RGPD) et à la loi luxembourgeoise du 1er août 2018.",
    ],
    sections: [
      {
        heading: "1. Responsable de traitement",
        paragraphs: [
          "MAPA Synergy Sàrl, RCS Luxembourg B241974, 1, rue de la Vallée, L-3593 Dudelange.",
          "Référent données : Julien Brebion. Contact : voir « Nous contacter » en bas de page. MAPA Property n'est pas tenue de désigner un Délégué à la Protection des Données (DPO) au sens de l'article 37 RGPD ; toutefois, Julien Brebion assume cette fonction de référence.",
        ],
      },
      {
        heading: "2. Données collectées",
        paragraphs: [
          "Données d'identification (nom, prénom, email, téléphone), données patrimoniales (sur sollicitation explicite — capacité financière, projet d'acquisition), données de connexion (IP anonymisée, timestamp, user-agent, pages consultées), préférences (langue, mode jour/nuit, favoris), historique des échanges avec le chatbot Eléna.",
        ],
      },
      {
        heading: "3. Finalités et bases légales",
        paragraphs: [
          "Gestion des demandes de contact et leads — base légale : exécution précontractuelle / consentement.",
          "Réponse aux demandes off-market sous NDA — base légale : exécution précontractuelle.",
          "Conformité AML/KYC (loi du 12 novembre 2004) — base légale : obligation légale.",
          "Sécurité, prévention de la fraude et lutte contre les abus — base légale : intérêt légitime.",
          "Mesure d'audience anonyme et amélioration du site — base légale : intérêt légitime.",
          "Communication marketing personnelle (occasionnellement) — base légale : consentement.",
        ],
      },
      {
        heading: "4. Durées de conservation",
        paragraphs: [
          "Données de prospection / formulaires (demandes de contact non transformées) : 3 ans à compter du dernier contact.",
          "Données contractuelles (mandats, dossiers KYC AED, comptabilité) : 7 ans après la fin de la relation, conformément à la réglementation LBC/FT et fiscale luxembourgeoise.",
          "Cookies et logs techniques : 13 mois maximum.",
        ],
      },
      {
        heading: "5. Destinataires",
        paragraphs: [
          "Vos données sont strictement confidentielles. Elles peuvent être partagées avec :",
        ],
        bullets: [
          "Notaires et avocats partenaires lorsque la transaction le requiert.",
          "Sous-traitants techniques (hébergement Vercel, base de données Supabase, Cloudflare, fournisseur d'email Resend) sous accords de sous-traitance conformes RGPD.",
          "Autorités publiques sur réquisition légale uniquement.",
        ],
      },
      {
        heading: "6. Transferts hors UE",
        paragraphs: [
          "Certains sous-traitants techniques sont situés hors UE (Vercel, Cloudflare aux USA). Ces transferts sont encadrés par les Clauses Contractuelles Types de la Commission européenne et par les certifications Data Privacy Framework lorsque applicable.",
        ],
      },
      {
        heading: "7. Vos droits",
        paragraphs: [
          "Conformément au RGPD, vous disposez des droits suivants :",
        ],
        bullets: [
          "Droit d'accès et de rectification.",
          "Droit à l'effacement (« droit à l'oubli ») dans les conditions de l'article 17 RGPD — délai de réponse 30 jours.",
          "Droit à la limitation du traitement.",
          "Droit à la portabilité de vos données dans un format structuré, lisible par machine.",
          "Droit d'opposition au traitement fondé sur l'intérêt légitime.",
          "Droit de retirer votre consentement à tout moment, lorsque le traitement est fondé sur celui-ci.",
          "Droit de définir des directives sur le sort de vos données après votre décès.",
        ],
      },
      {
        heading: "8. Comment exercer vos droits",
        paragraphs: [
          "Toute demande s'exerce par email via le bouton « Nous contacter » en bas de page (référent RGPD : Julien Brebion) ou par courrier à l'adresse du siège, accompagnée d'une copie d'une pièce d'identité justifiant l'identité du demandeur.",
          "MAPA s'engage à répondre dans un délai de 30 jours, prorogeable de deux mois en cas de complexité, conformément aux articles 6, 13, 15, 16, 17 et 21 du RGPD.",
        ],
      },
      {
        heading: "9. Sécurité",
        paragraphs: [
          "MAPA met en œuvre les mesures techniques et organisationnelles appropriées pour garantir la sécurité des données : chiffrement en transit (HTTPS), chiffrement au repos (Supabase), contrôle d'accès strict, sauvegardes régulières, journalisation des accès, formation du personnel.",
        ],
      },
      {
        heading: "10. Cookies",
        paragraphs: [
          "Le site utilise un nombre minimal de cookies techniques nécessaires à son fonctionnement (préférence de langue, mode jour/nuit, favoris). Aucun cookie publicitaire n'est utilisé. Les cookies de mesure d'audience (Vercel Analytics) sont anonymisés et ne nécessitent pas de consentement explicite au sens de l'article 5(3) ePrivacy.",
        ],
      },
      {
        heading: "11. Recours",
        paragraphs: [
          "Si vous estimez que vos droits ne sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission nationale pour la protection des données (CNPD) du Luxembourg : 15, boulevard du Jazz, L-4370 Belvaux — www.cnpd.lu.",
        ],
      },
      {
        heading: "12. Évolution de la politique",
        paragraphs: [
          "La présente politique peut évoluer. La version en vigueur est celle accessible sur le site, dont la date de mise à jour figure en tête de document.",
        ],
      },
    ],
    copyright: COPYRIGHT_FR,
  },
  en: {
    eyebrow: "Legal",
    title: "Privacy Policy (GDPR)",
    updatedAt: "Updated: 2026-05-08",
    pdfLabel: "Download the official PDF",
    intro: [
      "The French version of this policy is the legally binding version. The English version is provided for information only.",
      "MAPA Synergy Sàrl (\"MAPA Property\") values your privacy. This policy informs you about data processing on mapaproperty.lu under EU Regulation 2016/679 (GDPR) and Luxembourg law of 1 August 2018.",
    ],
    sections: [
      {
        heading: "1. Data controller",
        paragraphs: [
          "MAPA Synergy Sàrl, RCS Luxembourg B241974. Data referent: Julien Brebion (coordonnées via « Nous contacter » en bas de page). No DPO designation required, but Julien Brebion fulfils this role.",
        ],
      },
      {
        heading: "2. Data collected",
        paragraphs: [
          "Identification (name, email, phone), wealth data (on explicit request), connection data (anonymised IP, timestamp, pages), preferences, chatbot history.",
        ],
      },
      {
        heading: "3. Purposes and legal bases",
        paragraphs: [
          "Lead management (pre-contractual / consent), off-market under NDA (pre-contractual), AML/KYC (legal obligation), security (legitimate interest), audience measurement (legitimate interest), occasional marketing (consent).",
        ],
      },
      {
        heading: "4. Retention",
        paragraphs: [
          "Prospection data / forms (untransformed leads): 3 years from last contact. Contractual data (mandates, KYC AED files, accounting): 7 years after end of relationship, per Luxembourg AML/CFT and tax regulations. Cookies and technical logs: 13 months maximum.",
        ],
      },
      {
        heading: "5. Recipients",
        paragraphs: [
          "Notaries and partner lawyers when needed; technical subprocessors (Vercel, Supabase, Cloudflare, Resend) under GDPR-compliant data processing agreements; public authorities upon legal request only.",
        ],
      },
      {
        heading: "6. Transfers outside the EU",
        paragraphs: [
          "Some subprocessors are based in the USA (Vercel, Cloudflare) under EU Standard Contractual Clauses and applicable Data Privacy Framework certifications.",
        ],
      },
      {
        heading: "7. Your rights",
        paragraphs: [
          "Access, rectification, erasure (30-day response), restriction, portability, objection, consent withdrawal, post-mortem instructions.",
        ],
      },
      {
        heading: "8. Exercise of rights",
        paragraphs: [
          "Email via the « Contact us » button at the bottom of the page (GDPR contact: Julien Brebion) with proof of identity. Response within 30 days (extendable by two months for complex requests), per articles 6, 13, 15, 16, 17 and 21 GDPR.",
        ],
      },
      {
        heading: "9. Security",
        paragraphs: [
          "HTTPS in transit, encryption at rest, strict access control, regular backups, access logging, staff training.",
        ],
      },
      {
        heading: "10. Cookies",
        paragraphs: [
          "Minimal technical cookies only. Anonymised analytics. No advertising cookies.",
        ],
      },
      {
        heading: "11. Complaints",
        paragraphs: [
          "Luxembourg Data Protection Commission (CNPD): www.cnpd.lu — 15, boulevard du Jazz, L-4370 Belvaux.",
        ],
      },
      {
        heading: "12. Amendments",
        paragraphs: [
          "This policy may evolve. Current version available on the site, with update date.",
        ],
      },
    ],
    copyright: COPYRIGHT_FR,
  },
  de: {
    eyebrow: "Rechtliches",
    title: "Datenschutzerklärung (DSGVO)",
    updatedAt: "Aktualisiert: 2026-05-08",
    pdfLabel: "Offizielles PDF herunterladen",
    intro: [
      "Maßgeblich ist die französische Fassung dieser Erklärung. Die deutsche Fassung dient nur zur Information.",
      "MAPA Synergy Sàrl („MAPA Property\") schützt Ihre Daten gemäß DSGVO (EU) 2016/679 und luxemburgischem Gesetz vom 1. August 2018.",
    ],
    sections: [
      {
        heading: "1. Verantwortlicher",
        paragraphs: [
          "MAPA Synergy Sàrl, RCS Luxemburg B241974. Datenschutzreferent: Julien Brebion (coordonnées via « Nous contacter » en bas de page).",
        ],
      },
      {
        heading: "2. Erhobene Daten",
        paragraphs: [
          "Identifikation, Vermögensdaten (auf ausdrückliche Anfrage), Verbindungsdaten (anonymisiert), Präferenzen, Chatbot-Verlauf.",
        ],
      },
      {
        heading: "3. Zwecke und Rechtsgrundlagen",
        paragraphs: [
          "Lead-Bearbeitung (vorvertraglich / Einwilligung), Off-Market (vorvertraglich), AML/KYC (gesetzliche Pflicht), Sicherheit (berechtigtes Interesse), Reichweitenmessung (berechtigtes Interesse), gelegentliches Marketing (Einwilligung).",
        ],
      },
      {
        heading: "4. Aufbewahrungsfristen",
        paragraphs: [
          "Prospektionsdaten / Formulare (nicht umgewandelte Leads): 3 Jahre ab letztem Kontakt. Vertragliche Daten (Mandate, KYC-AED-Akten, Buchhaltung): 7 Jahre nach Ende der Beziehung gemäß luxemburgischer AML/CFT- und Steuerregulierung. Cookies und technische Logs: max. 13 Monate.",
        ],
      },
      {
        heading: "5. Empfänger",
        paragraphs: [
          "Partner-Notare und Anwälte; technische Auftragsverarbeiter (Vercel, Supabase, Cloudflare, Resend) unter DSGVO-konformen AVV; Behörden nur auf Rechtsverlangen.",
        ],
      },
      {
        heading: "6. Übermittlungen außerhalb der EU",
        paragraphs: [
          "Einige Auftragsverarbeiter sitzen in den USA unter EU-Standardvertragsklauseln.",
        ],
      },
      {
        heading: "7. Ihre Rechte",
        paragraphs: [
          "Auskunft, Berichtigung, Löschung (Antwort innerhalb von 30 Tagen), Einschränkung, Übertragbarkeit, Widerspruch, Widerruf der Einwilligung, postmortale Anweisungen.",
        ],
      },
      {
        heading: "8. Rechtsausübung",
        paragraphs: [
          "E-Mail über die Schaltfläche « Kontakt » am Seitenende (DSGVO-Referent: Julien Brebion) mit Identitätsnachweis. Antwort innerhalb von 30 Tagen (verlängerbar um zwei Monate bei komplexen Anfragen), gemäß Artikel 6, 13, 15, 16, 17 und 21 DSGVO.",
        ],
      },
      {
        heading: "9. Sicherheit",
        paragraphs: [
          "HTTPS, Verschlüsselung at rest, strikte Zugriffskontrolle, regelmäßige Backups.",
        ],
      },
      {
        heading: "10. Cookies",
        paragraphs: [
          "Minimale technische Cookies. Anonyme Statistik. Keine Werbe-Cookies.",
        ],
      },
      {
        heading: "11. Beschwerden",
        paragraphs: [
          "Luxemburger Datenschutzkommission (CNPD): www.cnpd.lu.",
        ],
      },
      {
        heading: "12. Änderungen",
        paragraphs: [
          "Diese Erklärung kann sich weiterentwickeln. Aktuelle Version auf der Website.",
        ],
      },
    ],
    copyright: COPYRIGHT_FR,
  },
};
