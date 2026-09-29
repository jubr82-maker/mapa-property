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
  "© 2026 MAPA Synergy Sàrl, MAPA Property. Politique conforme RGPD (UE 2016/679) et loi luxembourgeoise du 1er août 2018.";
const COPYRIGHT_EN =
  "© 2026 MAPA Synergy Sàrl, MAPA Property. Policy compliant with GDPR (EU 2016/679) and Luxembourg law of 1 August 2018.";
const COPYRIGHT_DE =
  "© 2026 MAPA Synergy Sàrl, MAPA Property. Richtlinie im Einklang mit der DSGVO (EU 2016/679) und dem luxemburgischen Gesetz vom 1. August 2018.";

export const rgpd: Record<"fr" | "en" | "de", LegalContent> = {
  fr: {
    eyebrow: "Légal",
    title: "Politique de protection des données (RGPD)",
    updatedAt: "Mise à jour : 2026-09-14",
    pdfLabel: "Télécharger le PDF officiel",
    intro: [
      "MAPA Synergy Sàrl (« MAPA Property ») accorde une importance particulière à la protection de vos données personnelles. La présente politique vous informe sur les traitements effectués via le site mapaproperty.lu, conformément au Règlement (UE) 2016/679 (RGPD) et à la loi luxembourgeoise du 1er août 2018.",
    ],
    sections: [
      {
        heading: "1. Responsable de traitement",
        paragraphs: [
          "MAPA Synergy Sàrl, RCS Luxembourg B241974, 26, rue du Commerce, L-3450 Dudelange.",
          "Référent données : Frédéric Mannis. Contact : voir « Nous contacter » en bas de page. MAPA Property n'est pas tenue de désigner un Délégué à la Protection des Données (DPO) au sens de l'article 37 RGPD ; toutefois, Frédéric Mannis assume cette fonction de référence.",
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
          "Sous-traitants techniques : hébergement des pages et fonctions du site (Vercel Inc.), base de données (Supabase), stockage de fichiers (Supabase et Cloudflare, Inc.), protection anti-robots des formulaires (Cloudflare, Inc.), envoi d'emails transactionnels (Resend), traitement des échanges avec le chatbot Eléna (Mistral AI, société française), sous accords de sous-traitance conformes RGPD.",
          "L'équipe MAPA Property, via des exports de données réalisés depuis l'espace d'administration, pour la gestion des mandats et des demandes reçues.",
          "Autorités publiques sur réquisition légale uniquement.",
        ],
      },
      {
        heading: "6. Transferts hors UE",
        paragraphs: [
          "L'hébergeur du site, Vercel Inc. (440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis), exécute les pages et fonctions du site dans la région de Stockholm. La base de données est hébergée par Supabase dans la région de Stockholm. La protection anti-robots des formulaires et le stockage de fichiers sont assurés par Cloudflare, Inc. (101 Townsend Street, San Francisco, CA 94107, États-Unis). Le nom de domaine est enregistré chez Gandi SAS, Paris, France. Les transferts vers les prestataires établis aux États-Unis sont encadrés par les garanties prévues par le RGPD, dont la certification de Vercel au cadre de protection des données entre l'Union européenne et les États-Unis.",
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
          "Toute demande s'exerce par email via le bouton « Nous contacter » en bas de page (référent RGPD : Frédéric Mannis) ou par courrier à l'adresse du siège, accompagnée d'une copie d'une pièce d'identité justifiant l'identité du demandeur.",
          "MAPA s'engage à répondre dans un délai de 30 jours, prorogeable de deux mois en cas de complexité, conformément aux articles 6, 13, 15, 16, 17 et 21 du RGPD.",
        ],
      },
      {
        heading: "9. Sécurité",
        paragraphs: [
          "MAPA met en œuvre les mesures techniques suivantes pour garantir la sécurité des données : chiffrement des données en transit avec un échange de clés hybride résistant aux futurs ordinateurs quantiques, fourni par notre hébergeur, chiffrement des données au repos, pare-feu applicatif fourni par notre hébergeur, vérification anti-robots sur les formulaires, limitation du nombre de requêtes, accès à l'espace d'administration restreint à une liste d'adresses nominatives, cloisonnement des droits d'accès dans la base de données, journalisation des accès, sauvegardes régulières.",
        ],
      },
      {
        heading: "10. Cookies",
        paragraphs: [
          "Le site utilise des cookies strictement nécessaires à son fonctionnement (préférence de langue, mode jour/nuit, favoris) — toujours actifs, non désactivables. Les cookies de mesure d'audience (statistiques internes, Vercel Analytics, Google Analytics) et, à terme, les cookies marketing (Meta Pixel, Google Ads) ne sont déposés qu'après votre consentement explicite, recueilli via la bannière affichée dès votre première visite. Vous pouvez modifier votre choix à tout moment via le lien « Gérer les cookies » en pied de page.",
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
    updatedAt: "Updated: 2026-09-14",
    pdfLabel: "Download the official PDF",
    intro: [
      "The French version of this policy is the legally binding version. The English version is provided for information only.",
      "MAPA Synergy Sàrl (\"MAPA Property\") values your privacy. This policy informs you about data processing on mapaproperty.lu under EU Regulation 2016/679 (GDPR) and Luxembourg law of 1 August 2018.",
    ],
    sections: [
      {
        heading: "1. Data controller",
        paragraphs: [
          "MAPA Synergy Sàrl, RCS Luxembourg B241974, 26, rue du Commerce, L-3450 Dudelange. Data referent: Frédéric Mannis (contact details via the \"Contact us\" button at the bottom of the page). No DPO designation required, but Frédéric Mannis fulfils this role.",
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
          "Notaries and partner lawyers when needed; technical subprocessors: site hosting (Vercel Inc.), database (Supabase), file storage (Supabase and Cloudflare, Inc.), form anti-bot protection (Cloudflare, Inc.), transactional emails (Resend), processing of chatbot conversations with Eléna (Mistral AI, a French company), under GDPR-compliant data processing agreements; the MAPA Property team, through data exports generated from the administration area, for managing mandates and incoming requests; public authorities upon legal request only.",
        ],
      },
      {
        heading: "6. Transfers outside the EU",
        paragraphs: [
          "The site's host, Vercel Inc. (440 N Barranca Avenue #4133, Covina, CA 91723, USA), runs the site's pages and functions in the Stockholm region. The database is hosted by Supabase in the Stockholm region. Form anti-bot protection and file storage are provided by Cloudflare, Inc. (101 Townsend Street, San Francisco, CA 94107, USA). The domain name is registered with Gandi SAS, Paris, France. Transfers to providers established in the USA are covered by GDPR safeguards, including Vercel's certification under the EU-US Data Privacy Framework.",
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
          "Email via the « Contact us » button at the bottom of the page (GDPR contact: Frédéric Mannis) with proof of identity. Response within 30 days (extendable by two months for complex requests), per articles 6, 13, 15, 16, 17 and 21 GDPR.",
        ],
      },
      {
        heading: "9. Security",
        paragraphs: [
          "MAPA implements the following technical measures: encryption in transit with a hybrid key exchange resistant to future quantum computers, provided by our host, encryption at rest, application firewall provided by our host, anti-bot verification on forms, request rate limiting, administration access restricted to a named list of addresses, access rights segregation within the database, access logging, regular backups.",
        ],
      },
      {
        heading: "10. Cookies",
        paragraphs: [
          "The site uses strictly necessary cookies (language preference, dark/light mode, favourites) — always active, cannot be disabled. Audience-measurement cookies (internal statistics, Vercel Analytics, Google Analytics) and, in the future, marketing cookies (Meta Pixel, Google Ads) are only set after your explicit consent, collected via the banner shown on your first visit. You can change your choice at any time via the \"Manage cookies\" link in the footer.",
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
    copyright: COPYRIGHT_EN,
  },
  de: {
    eyebrow: "Rechtliches",
    title: "Datenschutzerklärung (DSGVO)",
    updatedAt: "Aktualisiert: 2026-09-14",
    pdfLabel: "Offizielles PDF herunterladen",
    intro: [
      "Maßgeblich ist die französische Fassung dieser Erklärung. Die deutsche Fassung dient nur zur Information.",
      "MAPA Synergy Sàrl („MAPA Property\") schützt Ihre Daten gemäß DSGVO (EU) 2016/679 und luxemburgischem Gesetz vom 1. August 2018.",
    ],
    sections: [
      {
        heading: "1. Verantwortlicher",
        paragraphs: [
          "MAPA Synergy Sàrl, RCS Luxemburg B241974, 26, rue du Commerce, L-3450 Dudelange. Datenschutzreferent: Frédéric Mannis (Kontaktdaten über die Schaltfläche „Kontakt\" am Seitenende).",
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
          "Partner-Notare und Anwälte; technische Auftragsverarbeiter: Hosting der Seiten und Funktionen (Vercel Inc.), Datenbank (Supabase), Dateispeicherung (Supabase und Cloudflare, Inc.), Anti-Bot-Schutz der Formulare (Cloudflare, Inc.), Versand transaktionaler E-Mails (Resend), Verarbeitung der Chatbot-Gespräche mit Eléna (Mistral AI, ein französisches Unternehmen), unter DSGVO-konformen AVV; das MAPA Property-Team, über Datenexporte aus dem Administrationsbereich, zur Verwaltung von Mandaten und eingehenden Anfragen; Behörden nur auf Rechtsverlangen.",
        ],
      },
      {
        heading: "6. Übermittlungen außerhalb der EU",
        paragraphs: [
          "Der Hosting-Anbieter der Website, Vercel Inc. (440 N Barranca Avenue #4133, Covina, CA 91723, USA), betreibt die Seiten und Funktionen der Website in der Region Stockholm. Die Datenbank wird von Supabase in der Region Stockholm gehostet. Der Anti-Bot-Schutz der Formulare und die Dateispeicherung werden von Cloudflare, Inc. (101 Townsend Street, San Francisco, CA 94107, USA) bereitgestellt. Der Domainname ist bei Gandi SAS, Paris, Frankreich, registriert. Übermittlungen an in den USA ansässige Anbieter unterliegen den von der DSGVO vorgesehenen Garantien, darunter die Zertifizierung von Vercel im Rahmen des Data Privacy Framework zwischen der EU und den USA.",
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
          "E-Mail über die Schaltfläche « Kontakt » am Seitenende (DSGVO-Referent: Frédéric Mannis) mit Identitätsnachweis. Antwort innerhalb von 30 Tagen (verlängerbar um zwei Monate bei komplexen Anfragen), gemäß Artikel 6, 13, 15, 16, 17 und 21 DSGVO.",
        ],
      },
      {
        heading: "9. Sicherheit",
        paragraphs: [
          "MAPA setzt folgende technische Maßnahmen um: Verschlüsselung der Daten während der Übertragung mit einem hybriden Schlüsselaustausch, der künftigen Quantencomputern standhält, bereitgestellt von unserem Hosting-Anbieter, Verschlüsselung der Daten im Ruhezustand, Anwendungs-Firewall unseres Hosting-Anbieters, Anti-Bot-Prüfung der Formulare, Begrenzung der Anzahl von Anfragen, Zugang zum Administrationsbereich beschränkt auf eine namentliche Liste von Adressen, Trennung der Zugriffsrechte in der Datenbank, Protokollierung der Zugriffe, regelmäßige Sicherungen.",
        ],
      },
      {
        heading: "10. Cookies",
        paragraphs: [
          "Die Website verwendet unbedingt erforderliche Cookies (Sprachpräferenz, Hell/Dunkel-Modus, Favoriten) — immer aktiv, nicht deaktivierbar. Statistik-Cookies (interne Statistik, Vercel Analytics, Google Analytics) und künftig Marketing-Cookies (Meta Pixel, Google Ads) werden erst nach Ihrer ausdrücklichen Einwilligung gesetzt, die über das beim ersten Besuch angezeigte Banner eingeholt wird. Sie können Ihre Wahl jederzeit über den Link „Cookies verwalten“ im Footer ändern.",
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
    copyright: COPYRIGHT_DE,
  },
};
