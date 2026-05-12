/**
 * Apimo property description parser
 *
 * Reçoit une description brute (texte multi-paragraphe + parfois bullets en
 * début de ligne) et produit une structure éditoriale "magazine" :
 *   - intro (lead, premier paragraphe)
 *   - chapters (titre + corps)
 *   - conclusion (optionnel)
 *
 * Effet de bord : strippe systématiquement les informations de contact
 * (téléphones, emails, URLs, mentions "Tél.", "Email :", etc.) afin que
 * l'agent ait son propre bloc de contact, et que la fiche reste éditoriale.
 *
 * La signature publique `parseApimoDescription(rawText)` est stable.
 */

export type Chapter = { title: string; body: string };

export type ParsedDescription = {
  intro: string;
  chapters: Chapter[];
  conclusion?: string;
};

// Mots-clés FR / EN / DE pour détecter le début d'un chapitre.
// Match en début de ligne (insensible à la casse) — le parser teste sur la
// première version "clean" du paragraphe.
const CHAPTER_KEYWORDS: Array<{ keys: RegExp; title: string }> = [
  { keys: /^(cuisine|kitchen|küche)/i, title: "Cuisine" },
  {
    keys: /^(salle[s]?\s+de\s+bain|salle[s]?\s+d['’]eau|bathroom|badezimmer)/i,
    title: "Salles de bain",
  },
  {
    keys: /^(chambre[s]?|bedroom|schlafzimmer)/i,
    title: "Chambres",
  },
  {
    keys: /^(salon|séjour|sejour|living|wohnzimmer|pièce[s]?\s+de\s+vie)/i,
    title: "Salon & séjour",
  },
  {
    keys: /^(extérieur|exterieur|jardin|exterior|garden|außen|aussen|garten|terrasse|terrace|piscine|pool)/i,
    title: "Extérieurs",
  },
  {
    keys: /^(sécurité|securite|security|sicherheit)/i,
    title: "Sécurité",
  },
  {
    keys: /^(confort|équipement[s]?|equipement[s]?|features|comfort|ausstattung)/i,
    title: "Confort & équipements",
  },
  {
    keys: /^(localisation|emplacement|environnement|quartier|location|standort|lage|umgebung)/i,
    title: "Localisation",
  },
  {
    keys: /^(commodité[s]?|commodite[s]?|amenities|annehmlichkeiten|services)/i,
    title: "Commodités",
  },
  {
    keys: /^(construction|matériau[x]?|materiau[x]?|bau|baujahr)/i,
    title: "Construction",
  },
  {
    keys: /^(énergie|energie|energy|dpe|performance\s+énergétique|performance\s+energetique)/i,
    title: "Énergie & performance",
  },
  {
    keys: /^(garage|parking|stationnement|stellplatz)/i,
    title: "Garage & stationnement",
  },
  {
    keys: /^(sous[\s-]?sol|cave|cellar|keller)/i,
    title: "Sous-sol & rangements",
  },
];

// Regex de strip — ordre important (téléphones avant chiffres simples).
const STRIP_REGEXES: RegExp[] = [
  // Téléphones internationaux (ex : +352 621 23 45 67, 06.12.34.56.78)
  /\+?\(?\d{1,4}\)?[\s.\-/]?\d{2,4}[\s.\-/]?\d{2,4}[\s.\-/]?\d{2,4}(?:[\s.\-/]?\d{2,4})?\b/g,
  // Emails
  /[\w.+\-]+@[\w-]+\.[\w.\-]+/g,
  // URLs http(s)
  /https?:\/\/\S+/g,
  // URLs www. sans http
  /\bwww\.[\w.\-]+(?:\/\S*)?/g,
  // Préfixes de contact à supprimer (FR/EN/DE)
  /\b(?:tél|tel|téléphone|telephone|phone|telefon|portable|mobile|gsm|fax)\.?\s*:?\s*/gi,
  /\b(?:e[\s-]?mail|courriel|email|mail)\s*:?\s*/gi,
  /\b(?:contact|joindre|contactez(?:-nous)?|kontakt)\s*(?:nous|moi)?\s*:?\s*/gi,
];

const cleanLine = (s: string): string => {
  let cleaned = s;
  for (const re of STRIP_REGEXES) cleaned = cleaned.replace(re, " ");
  // Tirets de listing en début ("- ", "• ", "* ", "› ")
  cleaned = cleaned.replace(/^[\s]*[-•*›–—][\s]+/, "");
  // Espaces multiples & ponctuation orpheline
  cleaned = cleaned.replace(/\s+/g, " ").replace(/\s+([.,;:!?])/g, "$1").trim();
  // Ponctuation pure (";" "," "...") → vide
  if (!/[a-zA-ZÀ-ÿ]/.test(cleaned)) return "";
  // Coquilles fréquentes : ":" final isolé
  cleaned = cleaned.replace(/[\s:;,]+$/, (m) =>
    /[.!?]/.test(m) ? m : "",
  );
  return cleaned;
};

// Détection grossière d'une "conclusion" type "Contactez-nous", "Visite sur RDV"
// déjà strippée du contact lui-même → ne garde que des invitations claires.
const CONCLUSION_HINTS = /\b(visite\s+sur\s+(?:rendez-vous|rdv)|prenez\s+rendez-vous|nous\s+vous\s+invitons|contactez[\s-]?(?:nous|moi|notre\s+agence)|book\s+a\s+viewing|terminvereinbarung)/i;

export function parseApimoDescription(
  rawText: string | null | undefined,
): ParsedDescription {
  if (!rawText) return { intro: "", chapters: [] };

  // Découpage en paragraphes : tout double saut OU saut + tiret de liste.
  // On normalise d'abord les sauts CRLF.
  const normalized = rawText.replace(/\r\n?/g, "\n");

  const paragraphs = normalized
    .split(/\n+/)
    .map(cleanLine)
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return { intro: "", chapters: [] };

  // Un seul paragraphe → tout en intro (le composant gère la lettrine).
  if (paragraphs.length === 1) {
    return { intro: paragraphs[0], chapters: [] };
  }

  // Intro = 1er paragraphe (s'il est court : on prend les 2 premiers si le
  // premier fait < 140 caractères et que le 2e ne match aucun keyword).
  let introIdx = 1;
  let intro = paragraphs[0];
  if (
    paragraphs[0].length < 140 &&
    paragraphs[1] &&
    !CHAPTER_KEYWORDS.some((c) => c.keys.test(paragraphs[1]))
  ) {
    intro = paragraphs[0] + "\n\n" + paragraphs[1];
    introIdx = 2;
  }

  // Chapitres
  const chapters: Chapter[] = [];
  let current: Chapter | null = null;
  let conclusion: string | undefined;

  for (let i = introIdx; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const isLast = i === paragraphs.length - 1;

    // Conclusion détectée en fin de description : on l'isole.
    if (isLast && CONCLUSION_HINTS.test(p)) {
      if (current) {
        chapters.push(current);
        current = null;
      }
      conclusion = p;
      continue;
    }

    const matched = CHAPTER_KEYWORDS.find((c) => c.keys.test(p));
    if (matched) {
      if (current) chapters.push(current);
      current = { title: matched.title, body: p };
    } else if (current) {
      current.body += "\n\n" + p;
    } else {
      // Pas de chapitre déclaré encore et plus d'intro à enrichir → chapitre
      // générique "Le bien" pour ne pas perdre de contenu.
      current = { title: "Le bien", body: p };
    }
  }
  if (current) chapters.push(current);

  // Si on n'a obtenu qu'un seul chapitre "Le bien" sans titre éditorial,
  // on le repasse en suite de l'intro (évite la double-section sans relief).
  if (
    chapters.length === 1 &&
    chapters[0].title === "Le bien" &&
    !conclusion
  ) {
    return { intro: intro + "\n\n" + chapters[0].body, chapters: [] };
  }

  return { intro, chapters, conclusion };
}
