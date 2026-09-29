import type { LegalSection } from "@/components/legal/LegalLayout";

interface LegalContent {
  eyebrow: string;
  title: string;
  updatedAt: string;
  intro?: string[];
  sections: LegalSection[];
  copyright: string;
}

const COPYRIGHT_FR =
  "© 2026 MAPA Synergy Sàrl — MAPA Property. Page d'information sur l'usage de l'intelligence artificielle.";
const COPYRIGHT_EN =
  "© 2026 MAPA Synergy Sàrl — MAPA Property. Information page on the use of artificial intelligence.";
const COPYRIGHT_DE =
  "© 2026 MAPA Synergy Sàrl — MAPA Property. Informationsseite zum Einsatz künstlicher Intelligenz.";

export const intelligenceArtificielle: Record<"fr" | "en" | "de", LegalContent> = {
  fr: {
    eyebrow: "Légal",
    title: "Intelligence artificielle",
    updatedAt: "Mise à jour : 2026-09-29",
    intro: [
      "MAPA Property utilise certains outils d'intelligence artificielle pour améliorer votre expérience et la qualité de nos contenus. Cette page explique précisément où et comment, en toute transparence.",
    ],
    sections: [
      {
        heading: "Assistante virtuelle",
        paragraphs: [
          "Eléna, l'assistante disponible sur le site, est une intelligence artificielle conversationnelle. Elle se présente comme telle dès le premier échange et vous oriente vers les bonnes pages ou vers notre équipe. Elle ne remplace jamais un conseil personnalisé de nos collaborateurs.",
        ],
      },
      {
        heading: "Portraits et visuels de l'agence",
        paragraphs: [
          "Certains portraits de notre équipe, dont celui de Julien Brebion, peuvent être retouchés avec l'assistance de l'intelligence artificielle à des fins de présentation professionnelle (netteté, lumière, cadrage). Ces retouches ne modifient ni l'identité ni l'apparence réelle des personnes de façon trompeuse.",
        ],
      },
      {
        heading: "Photographies des biens",
        paragraphs: [
          "Certaines photographies de biens peuvent être améliorées par traitement numérique (luminosité, couleurs, perspective). MAPA Property s'engage à ne jamais modifier la réalité d'un bien : aucun élément n'est ajouté, supprimé ou transformé de façon à donner une image trompeuse de son état, de ses dimensions ou de sa configuration réelle.",
        ],
      },
      {
        heading: "Articles du journal",
        paragraphs: [
          "Certains articles de notre journal éditorial sont rédigés avec une assistance à l'intelligence artificielle. Chaque contenu est ensuite vérifié et validé par MAPA Property avant publication : l'agence reste seule responsable éditorialement de ce qui est publié.",
        ],
      },
      {
        heading: "Cadre européen",
        paragraphs: [
          "L'utilisation de l'intelligence artificielle sur ce site s'inscrit dans le cadre du règlement (UE) 2024/1689 sur l'intelligence artificielle. Les usages décrits ci-dessus, assistante conversationnelle, retouche d'image, aide à la rédaction, relèvent d'obligations de transparence et non de catégories à haut risque. MAPA Property s'engage à respecter les obligations d'information qui en découlent.",
        ],
      },
      {
        heading: "Notre engagement",
        paragraphs: [
          "Nous nous engageons à ne jamais publier un visuel, portrait, photographie de bien ou autre, donnant une image trompeuse de la réalité. Pour toute question sur l'usage de l'intelligence artificielle sur ce site, contactez-nous via la page Contact.",
        ],
      },
    ],
    copyright: COPYRIGHT_FR,
  },
  en: {
    eyebrow: "Legal",
    title: "Artificial intelligence",
    updatedAt: "Last updated: 2026-09-29",
    intro: [
      "MAPA Property uses certain artificial intelligence tools to improve your experience and the quality of our content. This page explains precisely where and how, in full transparency.",
    ],
    sections: [
      {
        heading: "Virtual assistant",
        paragraphs: [
          "Eléna, the assistant available on the site, is a conversational artificial intelligence. She identifies herself as such from the very first exchange and guides you to the right pages or to our team. She never replaces personalised advice from our staff.",
        ],
      },
      {
        heading: "Team portraits and visuals",
        paragraphs: [
          "Some portraits of our team, including Julien Brebion's, may be retouched with the assistance of artificial intelligence for professional presentation purposes (sharpness, lighting, framing). These retouches never alter a person's identity or real appearance in a misleading way.",
        ],
      },
      {
        heading: "Property photographs",
        paragraphs: [
          "Some property photographs may be enhanced through digital processing (brightness, colour, perspective). MAPA Property is committed to never altering the reality of a property: no element is added, removed or transformed in a way that would give a misleading picture of its condition, dimensions or actual layout.",
        ],
      },
      {
        heading: "Journal articles",
        paragraphs: [
          "Some articles in our editorial journal are drafted with the assistance of artificial intelligence. Every piece of content is then reviewed and validated by MAPA Property before publication: the agency remains solely editorially responsible for everything published.",
        ],
      },
      {
        heading: "European framework",
        paragraphs: [
          "The use of artificial intelligence on this site falls within the scope of Regulation (EU) 2024/1689 on artificial intelligence. The uses described above, conversational assistant, image retouching, writing assistance, fall under transparency obligations rather than high risk categories. MAPA Property is committed to complying with the resulting information obligations.",
        ],
      },
      {
        heading: "Our commitment",
        paragraphs: [
          "We commit to never publishing a visual, portrait, property photograph or otherwise, that gives a misleading picture of reality. For any question about the use of artificial intelligence on this site, please contact us via the Contact page.",
        ],
      },
    ],
    copyright: COPYRIGHT_EN,
  },
  de: {
    eyebrow: "Rechtliches",
    title: "Künstliche Intelligenz",
    updatedAt: "Letzte Aktualisierung: 2026-09-29",
    intro: [
      "MAPA Property setzt bestimmte Werkzeuge der künstlichen Intelligenz ein, um Ihre Erfahrung und die Qualität unserer Inhalte zu verbessern. Diese Seite erklärt transparent, wo und wie.",
    ],
    sections: [
      {
        heading: "Virtuelle Assistentin",
        paragraphs: [
          "Eléna, die auf der Website verfügbare Assistentin, ist eine gesprächsbasierte künstliche Intelligenz. Sie stellt sich von Beginn des Austauschs an als solche vor und leitet Sie zu den passenden Seiten oder zu unserem Team weiter. Sie ersetzt niemals eine persönliche Beratung durch unsere Mitarbeiter.",
        ],
      },
      {
        heading: "Porträts und Bildmaterial der Agentur",
        paragraphs: [
          "Einige Porträts unseres Teams, darunter das von Julien Brebion, können mit Unterstützung künstlicher Intelligenz zu professionellen Präsentationszwecken bearbeitet werden (Schärfe, Licht, Bildausschnitt). Diese Bearbeitungen verändern weder die Identität noch das tatsächliche Erscheinungsbild der Personen in irreführender Weise.",
        ],
      },
      {
        heading: "Immobilienfotografien",
        paragraphs: [
          "Einige Immobilienfotografien können digital nachbearbeitet werden (Helligkeit, Farben, Perspektive). MAPA Property verpflichtet sich, die Realität einer Immobilie niemals zu verändern: Es wird kein Element hinzugefügt, entfernt oder so verändert, dass ein irreführendes Bild von Zustand, Abmessungen oder tatsächlicher Aufteilung entsteht.",
        ],
      },
      {
        heading: "Journal-Artikel",
        paragraphs: [
          "Einige Artikel unseres redaktionellen Journals werden mit Unterstützung künstlicher Intelligenz verfasst. Jeder Inhalt wird vor der Veröffentlichung von MAPA Property geprüft und freigegeben: Die Agentur bleibt allein redaktionell verantwortlich für alles Veröffentlichte.",
        ],
      },
      {
        heading: "Europäischer Rahmen",
        paragraphs: [
          "Der Einsatz künstlicher Intelligenz auf dieser Website erfolgt im Rahmen der Verordnung (EU) 2024/1689 über künstliche Intelligenz. Die oben beschriebenen Anwendungen, virtuelle Assistentin, Bildbearbeitung, Unterstützung bei der Texterstellung, fallen unter Transparenzpflichten und nicht unter Hochrisikokategorien. MAPA Property verpflichtet sich, die daraus resultierenden Informationspflichten einzuhalten.",
        ],
      },
      {
        heading: "Unsere Verpflichtung",
        paragraphs: [
          "Wir verpflichten uns, niemals ein Bildmaterial, Porträt, Immobilienfoto oder anderes, zu veröffentlichen, das ein irreführendes Bild der Realität vermittelt. Für Fragen zum Einsatz künstlicher Intelligenz auf dieser Website kontaktieren Sie uns bitte über die Kontaktseite.",
        ],
      },
    ],
    copyright: COPYRIGHT_DE,
  },
};
