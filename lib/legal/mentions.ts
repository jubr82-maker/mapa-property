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
  "© 2026 MAPA Synergy Sàrl — MAPA Property. Source : MAPA Property (https://www.mapaproperty.lu). Tous droits réservés. Toute reproduction interdite.";
const COPYRIGHT_EN =
  "© 2026 MAPA Synergy Sàrl — MAPA Property. Source: MAPA Property (https://www.mapaproperty.lu). All rights reserved. Reproduction prohibited.";
const COPYRIGHT_DE =
  "© 2026 MAPA Synergy Sàrl — MAPA Property. Quelle: MAPA Property (https://www.mapaproperty.lu). Alle Rechte vorbehalten. Vervielfältigung untersagt.";

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
          "Siège social : 1, rue de la Vallée, L-3593 Dudelange, Grand-Duché de Luxembourg.",
          "RCS Luxembourg : B241974.",
          "Autorisation d'établissement (AE) : 10108681.",
          "TVA intracommunautaire : LU 31988923.",
          "IBAN : LU88 0019 5655 88 84 9000 — BIC : BCEELULL (BCEE).",
        ],
      },
      {
        heading: "Directeur de la publication",
        paragraphs: [
          "Julien Brebion, Real Estate Director.",
          "Téléphone : +352 691 620 127.",
          "Email : j.brebion@mapagroup.org.",
        ],
      },
      {
        heading: "Gérant",
        paragraphs: [
          "Frédéric Mannis.",
          "Téléphone : +352 691 113 018.",
          "Email : contact@mapagroup.org.",
        ],
      },
      {
        heading: "Hébergement",
        paragraphs: [
          "Hébergeur : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.",
          "Reverse-proxy, DNS, WAF et anti-bot : Cloudflare, Inc., 101 Townsend St, San Francisco, CA 94107, USA.",
          "Base de données : Supabase, hébergée en Union Européenne (eu-central-1).",
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
          "Référent données : Julien Brebion. Autorité de contrôle : Commission nationale pour la protection des données (CNPD), www.cnpd.lu.",
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
          "Registered office: 1, rue de la Vallée, L-3593 Dudelange, Grand Duchy of Luxembourg.",
          "RCS Luxembourg: B241974. Establishment authorisation: 10108681. VAT: LU 31988923.",
          "IBAN: LU88 0019 5655 88 84 9000 — BIC: BCEELULL.",
        ],
      },
      {
        heading: "Publication director",
        paragraphs: [
          "Julien Brebion, Real Estate Director.",
          "+352 691 620 127 — j.brebion@mapagroup.org.",
        ],
      },
      {
        heading: "Manager",
        paragraphs: [
          "Frédéric Mannis.",
          "+352 691 113 018 — contact@mapagroup.org.",
        ],
      },
      {
        heading: "Hosting",
        paragraphs: [
          "Vercel Inc. (USA). Cloudflare reverse-proxy, DNS, WAF (USA). Supabase database (EU).",
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
          "Sitz: 1, rue de la Vallée, L-3593 Dudelange, Großherzogtum Luxemburg.",
          "RCS Luxemburg: B241974. Niederlassungsgenehmigung: 10108681. UStId: LU 31988923.",
          "IBAN: LU88 0019 5655 88 84 9000 — BIC: BCEELULL.",
        ],
      },
      {
        heading: "Verantwortlich",
        paragraphs: [
          "Julien Brebion, Real Estate Director.",
          "+352 691 620 127 — j.brebion@mapagroup.org.",
        ],
      },
      {
        heading: "Geschäftsführer",
        paragraphs: [
          "Frédéric Mannis.",
          "+352 691 113 018 — contact@mapagroup.org.",
        ],
      },
      {
        heading: "Hosting",
        paragraphs: [
          "Vercel Inc. (USA). Cloudflare Reverse-Proxy, DNS, WAF (USA). Supabase-Datenbank (EU).",
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
        heading: "Anwendbares Recht",
        paragraphs: [
          "Es gilt luxemburgisches Recht. Ausschließlicher Gerichtsstand: Luxemburg-Stadt.",
        ],
      },
    ],
    copyright: COPYRIGHT_DE,
  },
};
