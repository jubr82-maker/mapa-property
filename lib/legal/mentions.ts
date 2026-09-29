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
  "© 2026 MAPA Synergy Sàrl, MAPA Property. Source : MAPA Property (https://www.mapaproperty.lu). Tous droits réservés. Toute reproduction interdite.";
const COPYRIGHT_EN =
  "© 2026 MAPA Synergy Sàrl, MAPA Property. Source: MAPA Property (https://www.mapaproperty.lu). All rights reserved. Reproduction prohibited.";
const COPYRIGHT_DE =
  "© 2026 MAPA Synergy Sàrl, MAPA Property. Quelle: MAPA Property (https://www.mapaproperty.lu). Alle Rechte vorbehalten. Vervielfältigung untersagt.";

export const mentions: Record<"fr" | "en" | "de", LegalContent> = {
  fr: {
    eyebrow: "Légal",
    title: "Mentions légales",
    updatedAt: "Mise à jour : 2026-05-08",
    pdfLabel: "Télécharger le PDF officiel",
    sections: [
      {
        heading: "Éditeur du site",
        paragraphs: [
          "MAPA Synergy Sàrl, opérant sous le nom commercial MAPA Property.",
          "Forme juridique : Société à responsabilité limitée de droit luxembourgeois.",
          "Siège social : 26, rue du Commerce, L-3450 Dudelange, Grand-Duché de Luxembourg.",
          "RCS Luxembourg B241974.",
          "Autorisation d'établissement (AE) : 10108681/0-1-2-3.",
          "TVA intracommunautaire : LU 31988923.",
        ],
      },
      {
        heading: "Directeur de la publication",
        paragraphs: [
          "Frédéric Mannis, Gérant.",
          "Téléphone : disponible via le bouton « Nous contacter » en bas de page.",
          "Email : disponible via le bouton « Nous contacter » en bas de page.",
        ],
      },
      {
        heading: "Hébergement",
        paragraphs: [
          "Hébergeur du site : Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis. Les pages et fonctions du site sont exécutées dans la région de Stockholm.",
          "Base de données : Supabase, hébergée dans la région de Stockholm.",
          "Protection anti-robots des formulaires et stockage de fichiers : Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis.",
          "Nom de domaine : Gandi SAS, Paris, France.",
          "Ces prestataires établis aux États-Unis sont encadrés par les garanties prévues par le RGPD, dont la certification de Vercel au cadre de protection des données entre l'Union européenne et les États-Unis.",
        ],
      },
      {
        heading: "Propriété intellectuelle",
        paragraphs: [
          "L'ensemble du site (code source, structure, design, contenus textuels et iconographiques, photographies, vidéos, descriptifs de biens, marques, logos) est la propriété exclusive de MAPA Synergy Sàrl ou de ses partenaires.",
          "Toute reproduction, représentation, modification ou exploitation, totale ou partielle, par quelque procédé que ce soit, est strictement interdite sans autorisation écrite préalable.",
          "Les marques MAPA Property et MAPA Synergy sont protégées au Luxembourg et au Benelux.",
        ],
      },
      {
        heading: "Anti-scraping et protection des bases de données",
        paragraphs: [
          "Toute extraction automatisée des données du site, notamment des descriptifs de biens, photographies, prix, est strictement interdite et constitue une violation du droit sui generis du producteur de bases de données (loi du 18 avril 2001) et une atteinte aux systèmes de traitement automatisé de données (article 509-1 du Code pénal luxembourgeois).",
          "Toute infraction fera l'objet de poursuites civiles et pénales.",
        ],
      },
      {
        heading: "Données personnelles",
        paragraphs: [
          "Le traitement des données personnelles est encadré par notre Politique de confidentialité (RGPD) accessible sur le site.",
          "Référent données : Frédéric Mannis. Autorité de contrôle : Commission nationale pour la protection des données (CNPD), www.cnpd.lu.",
        ],
      },
      {
        heading: "Crédits",
        paragraphs: [
          "Conception et développement : MAPA Property avec assistance IA (Claude Code, Anthropic).",
          "Photographies : MAPA Property et partenaires sous licence. Reproduction interdite.",
        ],
      },
      {
        heading: "Loi applicable",
        paragraphs: [
          "Le présent site est régi par le droit luxembourgeois. Tout litige relèvera de la compétence exclusive des tribunaux de Luxembourg-Ville.",
        ],
      },
    ],
    copyright: COPYRIGHT_FR,
  },
  en: {
    eyebrow: "Legal",
    title: "Legal notice",
    updatedAt: "Updated: 2026-05-08",
    pdfLabel: "Download the official PDF",
    intro: [
      "The French version of this notice is the legally binding version. The English version is provided for information only.",
    ],
    sections: [
      {
        heading: "Site editor",
        paragraphs: [
          "MAPA Synergy Sàrl, trading as MAPA Property.",
          "Legal form: Luxembourg limited liability company.",
          "Registered office: 26, rue du Commerce, L-3450 Dudelange, Grand Duchy of Luxembourg.",
          "RCS Luxembourg B241974. Establishment authorisation: 10108681/0-1-2-3. VAT: LU 31988923.",
        ],
      },
      {
        heading: "Publication director",
        paragraphs: [
          "Frédéric Mannis, Manager.",
          "Contact details available via the \"Contact us\" button at the bottom of the page.",
        ],
      },
      {
        heading: "Hosting",
        paragraphs: [
          "Site hosting: Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA. Pages and functions run in the Stockholm region.",
          "Database: Supabase, hosted in the Stockholm region.",
          "Form anti-bot protection and file storage: Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, USA.",
          "Domain name: Gandi SAS, Paris, France.",
          "These US-based providers are covered by GDPR safeguards, including Vercel's certification under the EU-US Data Privacy Framework.",
        ],
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "The entire site is the exclusive property of MAPA Synergy Sàrl. Reproduction prohibited without prior written consent.",
        ],
      },
      {
        heading: "Anti-scraping",
        paragraphs: [
          "Automated extraction of site data is strictly prohibited and constitutes a violation of Luxembourg database protection law (April 18, 2001) and Article 509-1 of the Luxembourg Criminal Code. Civil and criminal proceedings will follow any infringement.",
        ],
      },
      {
        heading: "Personal data",
        paragraphs: [
          "The processing of personal data is governed by our Privacy Policy (GDPR) available on the site.",
          "Data referent: Frédéric Mannis. Supervisory authority: National Commission for Data Protection (CNPD), www.cnpd.lu.",
        ],
      },
      {
        heading: "Credits",
        paragraphs: [
          "Design and development: MAPA Property with AI assistance (Claude Code, Anthropic).",
          "Photographs: MAPA Property and licensed partners. Reproduction prohibited.",
        ],
      },
      {
        heading: "Applicable law",
        paragraphs: [
          "Luxembourg law applies. Exclusive jurisdiction: courts of Luxembourg-City.",
        ],
      },
    ],
    copyright: COPYRIGHT_EN,
  },
  de: {
    eyebrow: "Rechtliches",
    title: "Impressum",
    updatedAt: "Aktualisiert: 2026-05-08",
    pdfLabel: "Offizielles PDF herunterladen",
    intro: [
      "Die französische Fassung dieses Impressums ist rechtsverbindlich. Die deutsche Fassung dient nur zur Information.",
    ],
    sections: [
      {
        heading: "Site-Herausgeber",
        paragraphs: [
          "MAPA Synergy Sàrl, Geschäftsname MAPA Property.",
          "Rechtsform: Luxemburger Gesellschaft mit beschränkter Haftung.",
          "Sitz: 26, rue du Commerce, L-3450 Dudelange, Großherzogtum Luxemburg.",
          "RCS Luxemburg B241974. Niederlassungsgenehmigung: 10108681/0-1-2-3. USt-IdNr.: LU 31988923.",
        ],
      },
      {
        heading: "Verantwortlich",
        paragraphs: [
          "Frédéric Mannis, Geschäftsführer.",
          "Kontaktdaten verfügbar über die Schaltfläche „Kontakt\" am Seitenende.",
        ],
      },
      {
        heading: "Hosting",
        paragraphs: [
          "Hosting der Website: Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, USA. Seiten und Funktionen laufen in der Region Stockholm.",
          "Datenbank: Supabase, in der Region Stockholm gehostet.",
          "Anti-Bot-Schutz der Formulare und Dateispeicherung: Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, USA.",
          "Domainname: Gandi SAS, Paris, Frankreich.",
          "Diese in den USA ansässigen Anbieter unterliegen den von der DSGVO vorgesehenen Garantien, darunter die Zertifizierung von Vercel im Rahmen des Data Privacy Framework zwischen der EU und den USA.",
        ],
      },
      {
        heading: "Geistiges Eigentum",
        paragraphs: [
          "Die gesamte Website ist ausschließliches Eigentum von MAPA Synergy Sàrl. Vervielfältigung ohne vorherige schriftliche Zustimmung untersagt.",
        ],
      },
      {
        heading: "Anti-Scraping",
        paragraphs: [
          "Die automatisierte Extraktion von Site-Daten ist strikt untersagt und stellt einen Verstoß gegen das luxemburgische Datenbankschutzrecht (Gesetz vom 18. April 2001) sowie Artikel 509-1 des luxemburgischen Strafgesetzbuches dar. Zivil- und Strafverfahren folgen.",
        ],
      },
      {
        heading: "Personenbezogene Daten",
        paragraphs: [
          "Die Verarbeitung personenbezogener Daten unterliegt unserer Datenschutzerklärung (DSGVO), die auf der Website verfügbar ist.",
          "Datenschutzreferent: Frédéric Mannis. Aufsichtsbehörde: Commission nationale pour la protection des données (CNPD), www.cnpd.lu.",
        ],
      },
      {
        heading: "Credits",
        paragraphs: [
          "Konzeption und Entwicklung: MAPA Property mit KI-Unterstützung (Claude Code, Anthropic).",
          "Fotografien: MAPA Property und lizenzierte Partner. Vervielfältigung untersagt.",
        ],
      },
      {
        heading: "Anwendbares Recht",
        paragraphs: [
          "Es gilt luxemburgisches Recht. Ausschließlicher Gerichtsstand: Luxemburg-Stadt.",
        ],
      },
    ],
    copyright: COPYRIGHT_DE,
  },
};
