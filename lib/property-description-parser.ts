/**
 * Apimo property description parser
 *
 * Reçoit une description brute (souvent une longue ligne continue côté Apimo)
 * et produit :
 *   1. Une structure éditoriale typée `ParsedDescription` (intro + chapters + conclusion)
 *   2. Un rendu HTML prêt-à-l'emploi (`html`) avec h3/h4/ul/ol sécurisé (texte échappé)
 *
 * Effet de bord — stripping :
 *   - Téléphones, emails, URLs, mentions "Tél." / "Email :" / "Contact :"
 *   - Phrases marketing en fin ("Pour une estimation gratuite...", "Consultez nos autres biens...")
 *   - Texte tronqué ("veuillez nous er", "Pour toute information supplémentaire...")
 *
 * La détection s'appuie sur des marqueurs INLINE multilingues (FR/EN/DE) :
 *   "Caractéristiques principales :", "Disposition :", "Distribution des pièces de nuit :",
 *   "Commodités :", "Main features:", "Hauptmerkmale:", etc.
 */

// ─── Types ────────────────────────────────────────────────────────────────

export type Chapter = { title: string; body: string };

export type ParsedDescription = {
  intro: string;
  chapters: Chapter[];
  conclusion?: string;
  /** HTML pré-rendu (texte échappé, balises sûres uniquement). */
  html: string;
};

// ─── Échappement HTML (XSS-safe) ──────────────────────────────────────────

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── Marqueurs de section inline (FR/EN/DE) ───────────────────────────────
//
// Sprint UI-I18N : chaque marqueur a desormais une `titleKey` stable +
// un `titleFR` (label francais hardcode comme fallback). Le caller peut
// passer un dict { [titleKey]: labelLocalise } via parseApimoDescription
// (cf. messages/{fr,en,de}.json namespace fiche.section.*). Si aucun
// dict n'est passe, le fallback FR est utilise (retrocompat).
type SectionMarker = { pattern: RegExp; titleKey: string; titleFR: string };

// Niveau H3 (section principale)
const H3_MARKERS: SectionMarker[] = [
  {
    pattern: /\b(?:caractéristiques\s+principales|principales\s+caractéristiques|main\s+features|key\s+features|hauptmerkmale|merkmale)\s*:/gi,
    titleKey: "caracteristiques_principales",
    titleFR: "Caractéristiques principales",
  },
  {
    pattern: /\b(?:disposition|agencement|layout|floor\s+plan|aufteilung|raumaufteilung|grundriss)\s*:/gi,
    titleKey: "disposition",
    titleFR: "Disposition",
  },
  {
    pattern: /\b(?:commodités\s+du\s+quartier|amenities\s+nearby|umgebung)\s*:/gi,
    titleKey: "commodites_quartier",
    titleFR: "Commodités du quartier",
  },
  {
    pattern: /\b(?:commodités|amenities|facilities|annehmlichkeiten|einrichtungen)\s*:/gi,
    titleKey: "commodites",
    titleFR: "Commodités",
  },
  {
    pattern: /\b(?:sécurité|security|sicherheit)\s*:/gi,
    titleKey: "securite",
    titleFR: "Sécurité",
  },
  {
    pattern: /\b(?:équipements?|features|comfort|ausstattung)\s*:/gi,
    titleKey: "equipements",
    titleFR: "Équipements",
  },
  {
    pattern: /\b(?:localisation|emplacement|environnement|location|standort|lage)\s*:/gi,
    titleKey: "localisation",
    titleFR: "Localisation",
  },
  {
    pattern: /\b(?:énergie|performance\s+énergétique|energy|dpe|energieeffizienz)\s*:/gi,
    titleKey: "energie_performance",
    titleFR: "Énergie & performance",
  },
];

// Export pour permettre au caller de charger uniquement les titres
// utiles (utilise dans /biens/[slug]/page.tsx pour construire le dict
// titles via getTranslations).
export const SECTION_TITLE_KEYS_H3 = [
  "caracteristiques_principales",
  "disposition",
  "commodites_quartier",
  "commodites",
  "securite",
  "equipements",
  "localisation",
  "energie_performance",
] as const;

// Niveau H4 (sous-section)
const H4_MARKERS: SectionMarker[] = [
  {
    pattern: /\b(?:distribution\s+des\s+pièces\s+de\s+nuit|night\s+zone|schlafbereich)\s*:/gi,
    titleKey: "distribution_nuit",
    titleFR: "Distribution des pièces de nuit",
  },
  {
    pattern: /\b(?:distribution\s+des\s+pièces\s+de\s+vie|day\s+zone|reception\s+rooms|wohnbereich)\s*:/gi,
    titleKey: "distribution_vie",
    titleFR: "Distribution des pièces de vie",
  },
  {
    pattern: /\b(?:distribution|raumverteilung)\s*:/gi,
    titleKey: "distribution",
    titleFR: "Distribution",
  },
  {
    pattern: /\b(?:hall\s+d['’]entrée|entrance\s+hall|eingangshalle)\s*:/gi,
    titleKey: "hall_entree",
    titleFR: "Hall d'entrée",
  },
  {
    pattern: /\b(?:cuisine|kitchen|küche)\s*:/gi,
    titleKey: "cuisine",
    titleFR: "Cuisine",
  },
  {
    pattern: /\b(?:salle[s]?\s+de\s+bain|bathroom|badezimmer)\s*:/gi,
    titleKey: "salles_bain",
    titleFR: "Salles de bain",
  },
  {
    pattern: /\b(?:chambres|bedrooms|schlafzimmer)\s*:/gi,
    titleKey: "chambres",
    titleFR: "Chambres",
  },
  {
    pattern: /\b(?:salon|séjour|living|wohnzimmer)\s*:/gi,
    titleKey: "salon",
    titleFR: "Salon",
  },
  {
    pattern: /\b(?:extérieur[s]?|jardin|exterior|garden|garten|terrasse[s]?)\s*:/gi,
    titleKey: "exterieurs",
    titleFR: "Extérieurs",
  },
];

export const SECTION_TITLE_KEYS_H4 = [
  "distribution_nuit",
  "distribution_vie",
  "distribution",
  "hall_entree",
  "cuisine",
  "salles_bain",
  "chambres",
  "salon",
  "exterieurs",
] as const;

/** Union de toutes les cles de section (H3 + H4) — pour build dict caller. */
export const ALL_SECTION_TITLE_KEYS = [
  ...SECTION_TITLE_KEYS_H3,
  ...SECTION_TITLE_KEYS_H4,
] as const;

// ─── Stripping ────────────────────────────────────────────────────────────

const STRIP_REGEXES: RegExp[] = [
  // Téléphones internationaux
  /\+?\(?\d{1,4}\)?[\s.\-/]?\d{2,4}[\s.\-/]?\d{2,4}[\s.\-/]?\d{2,4}(?:[\s.\-/]?\d{2,4})?\b/g,
  // Emails
  /[\w.+\-]+@[\w-]+\.[\w.\-]+/g,
  // URLs http(s)
  /https?:\/\/\S+/g,
  // URLs www. sans http
  /\bwww\.[\w.\-]+(?:\/\S*)?/g,
  // Préfixes de contact (FR/EN/DE)
  /\b(?:tél|tel|téléphone|telephone|phone|telefon|portable|mobile|gsm|fax)\.?\s*:?\s*/gi,
  /\b(?:e[\s-]?mail|courriel|email|mail)\s*:?\s*/gi,
];

// Phrases marketing à supprimer en fin de description (Apimo boilerplate)
const MARKETING_PHRASES: RegExp[] = [
  /Pour\s+une\s+estimation\s+immobilière\s+(?:gratuite|rapide)[^.]*\.?/gi,
  /notre\s+agence\s+s['’]engage\s+à\s+mettre\s+en\s+valeur[^.]*\.?/gi,
  /Consultez\s+nos\s+autres\s+biens\s+sur\s+notre\s+site\.?/gi,
  /Pour\s+toute\s+information\s+supplémentaire[^.]*$/gi,
  /veuillez\s+nous\s+(?:contacter\s+)?(?:er\s+)?à\s+l['’]adresse\s+suivante[^.]*$/gi,
  /Visit\s+our\s+other\s+properties[^.]*\.?/gi,
  /For\s+more\s+information[^.]*$/gi,
  /Kontaktieren\s+Sie\s+uns[^.]*$/gi,
];

function stripContactAndMarketing(text: string): string {
  let cleaned = text;
  for (const re of STRIP_REGEXES) cleaned = cleaned.replace(re, " ");
  for (const re of MARKETING_PHRASES) cleaned = cleaned.replace(re, " ");
  // Doubles espaces et ponctuation orpheline
  cleaned = cleaned
    .replace(/\s+/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/«\s+/g, "« ")
    .replace(/\s+»/g, " »")
    .trim();
  return cleaned;
}

// ─── Splitting inline → paragraphes structurés ────────────────────────────
// Tokens internes pour repérer les sections après remplacement.
const H3_TOKEN = "H3";
const H4_TOKEN = "H4";

// Sprint UI-I18N : on encode dans le token la `titleKey` (vs le label
// hardcode FR avant). Le label final est resolu plus tard dans
// parseBlocks via le dict `titles` passe par le caller (ou fallback FR).
function injectSectionTokens(text: string): string {
  let out = text;
  // H4 d'abord (les "Distribution des pièces de nuit :" sont plus spécifiques que "Distribution :")
  for (const m of H4_MARKERS) {
    out = out.replace(m.pattern, `\n\n${H4_TOKEN}${m.titleKey}\n`);
  }
  for (const m of H3_MARKERS) {
    out = out.replace(m.pattern, `\n\n${H3_TOKEN}${m.titleKey}\n`);
  }
  return out;
}

// Resolveur titleKey -> label. Si le dict `titles` (passe par le caller
// via parseApimoDescription) contient une entree pour cette cle, on
// l'utilise. Sinon fallback sur le `titleFR` du marqueur. Permet aux
// pages /fr de continuer a marcher sans dict (legacy) et aux pages
// /en /de de recevoir les labels traduits.
function resolveTitle(
  titleKey: string,
  titles?: Record<string, string>,
): string {
  if (titles && titles[titleKey]) return titles[titleKey];
  const marker =
    H3_MARKERS.find((m) => m.titleKey === titleKey) ??
    H4_MARKERS.find((m) => m.titleKey === titleKey);
  return marker?.titleFR ?? titleKey;
}

// Détecte les bullets inline ("- xxx", " 1. xxx", " 2. xxx") et insère des \n
// pour qu'ils soient ensuite splittables.
function injectBulletNewlines(text: string): string {
  let out = text;
  // " - " ou " – " (tiret moyen) au milieu d'une phrase → bullet
  out = out.replace(/\s+[-–]\s+/g, "\n- ");
  // " N. " (numérotation latine) → numbered list
  out = out.replace(/(?<=\S)\s+(\d{1,2})\.\s+/g, "\n$1. ");
  // " • " bullet UTF-8
  out = out.replace(/\s+•\s+/g, "\n• ");
  return out;
}

// ─── Conclusion détection (visite RDV / contactez-nous) ───────────────────
const CONCLUSION_HINTS = /\b(visite\s+sur\s+(?:rendez-vous|rdv)|prenez\s+rendez-vous|book\s+a\s+viewing|terminvereinbarung)/i;

// ─── Parsing principal ────────────────────────────────────────────────────

type Block =
  | { kind: "h3" | "h4"; title: string }
  | { kind: "bullet"; text: string }
  | { kind: "numbered"; index: number; text: string }
  | { kind: "p"; text: string };

function parseBlocks(text: string, titles?: Record<string, string>): Block[] {
  const blocks: Block[] = [];
  // Sprint HTML-RENDERING C3 : normalise <br><br> (et <br/><br/> +
  // variantes) en \n\n avant le split. Apimo livre certaines
  // descriptions sur 1 seule ligne avec des <br><br> en guise de saut
  // de paragraphe — sans cette normalisation, parseBlocks faisait 1
  // seul block geant et l'intro etait toute la description.
  // <br> simple -> \n (saut de ligne simple, conserve dans le block).
  const normalized = text
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n");
  const lines = normalized.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith(H3_TOKEN)) {
      const key = line.slice(H3_TOKEN.length).trim();
      blocks.push({ kind: "h3", title: resolveTitle(key, titles) });
      continue;
    }
    if (line.startsWith(H4_TOKEN)) {
      const key = line.slice(H4_TOKEN.length).trim();
      blocks.push({ kind: "h4", title: resolveTitle(key, titles) });
      continue;
    }
    const bulletMatch = line.match(/^[-–•]\s+(.+)$/);
    if (bulletMatch) {
      blocks.push({ kind: "bullet", text: bulletMatch[1].trim() });
      continue;
    }
    const numberedMatch = line.match(/^(\d{1,2})\.\s+(.+)$/);
    if (numberedMatch) {
      blocks.push({
        kind: "numbered",
        index: parseInt(numberedMatch[1], 10),
        text: numberedMatch[2].trim(),
      });
      continue;
    }
    blocks.push({ kind: "p", text: line });
  }
  return blocks;
}

// Regroupe les bullets / numbered consécutifs en ul/ol HTML, et formate les
// "Label : valeur" en `<strong>Label</strong> : valeur` dans les listes.
function blocksToHtml(blocks: Block[]): string {
  const out: string[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];

    if (b.kind === "h3") {
      out.push(`<h3>${escapeHtml(b.title)}</h3>`);
      i++;
      continue;
    }
    if (b.kind === "h4") {
      out.push(`<h4>${escapeHtml(b.title)}</h4>`);
      i++;
      continue;
    }
    if (b.kind === "bullet") {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].kind === "bullet") {
        const txt = (blocks[i] as { kind: "bullet"; text: string }).text;
        items.push(`<li>${formatListItem(txt)}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (b.kind === "numbered") {
      const items: string[] = [];
      while (i < blocks.length && blocks[i].kind === "numbered") {
        const txt = (blocks[i] as { kind: "numbered"; text: string }).text;
        items.push(`<li>${formatListItem(txt)}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    if (b.kind === "p") {
      out.push(`<p>${escapeHtml(b.text)}</p>`);
      i++;
      continue;
    }
    i++;
  }
  return out.join("");
}

// "Surface habitable: 524m²" → "<strong>Surface habitable</strong> : 524m²"
function formatListItem(text: string): string {
  const m = text.match(/^([A-ZÀ-ÿ][\w\s'’-]{1,40}?)\s*[:：]\s*(.+)$/);
  if (m) {
    return `<strong>${escapeHtml(m[1].trim())}</strong> : ${escapeHtml(m[2].trim())}`;
  }
  return escapeHtml(text);
}

// ─── API publique ─────────────────────────────────────────────────────────

/**
 * Sprint UI-I18N : Optional `titles` dict pour les labels de section.
 * Cle = titleKey (cf. H3_MARKERS/H4_MARKERS). Valeur = label localise.
 * Si absent ou cle manquante : fallback sur le `titleFR` du marqueur
 * (legacy comportement, retrocompat).
 *
 * Exemple :
 *   const titles = {
 *     caracteristiques_principales: tFiche("section.caracteristiques_principales"),
 *     disposition: tFiche("section.disposition"),
 *     ...
 *   };
 *   parseApimoDescription(description, { titles });
 */
export type ParseOptions = {
  titles?: Record<string, string>;
};

export function parseApimoDescription(
  rawText: string | null | undefined,
  opts?: ParseOptions,
): ParsedDescription {
  if (!rawText) return { intro: "", chapters: [], html: "" };

  // 1. Normaliser les sauts de ligne et caractères
  let working = rawText.replace(/\r\n?/g, "\n");
  // Normaliser quotes typographiques (déjà courantes, on garde "/«»)
  working = working.replace(/“|”/g, '"');

  // 2. Stripping global (contact + marketing)
  working = stripContactAndMarketing(working);

  // 3. Injecter les tokens de section (h3/h4) à partir des marqueurs inline
  working = injectSectionTokens(working);

  // 4. Convertir les bullets inline en lignes
  working = injectBulletNewlines(working);

  // 5. Parser en blocs structurés (resolveTitle utilise opts.titles)
  const blocks = parseBlocks(working, opts?.titles);
  if (blocks.length === 0) return { intro: "", chapters: [], html: "" };

  // 6. Extraire intro (tous les blocks "p" avant le 1er h3/h4)
  let firstSectionIdx = blocks.findIndex(
    (b) => b.kind === "h3" || b.kind === "h4",
  );
  if (firstSectionIdx === -1) firstSectionIdx = blocks.length;

  const introBlocks = blocks.slice(0, firstSectionIdx);
  const sectionBlocks = blocks.slice(firstSectionIdx);

  // Sprint HTML-RENDERING C0 : strip HTML brut dans intro. Apimo livre
  // parfois description_fr sur 1 seule ligne avec des tags inline
  // (<p>, <strong>, <br>, <em>, ...) — parseBlocks ne strip pas ces
  // tags donc l'intro contenait du HTML brut, ensuite affiche en
  // {value} echappe par React dans le panel "LE BRIEF" (cf.
  // app/[locale]/biens/[slug]/page.tsx panel overview). Resultat
  // visible : "<p><strong>MAPA Property</strong>..." litteralement.
  // On normalise <br> en \n, on strip le set known-good de tags, puis
  // tout reste de balise pour securite. introHtml (L.361) ecrase
  // ensuite via escapeHtml — sans impact car le texte est deja plat.
  const introText = introBlocks
    .filter((b) => b.kind === "p")
    .map((b) => (b as { text: string }).text)
    .join("\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|strong|em|b|i|ul|ol|li)[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();

  // 7. Détection conclusion (dernier paragraphe match CONCLUSION_HINTS)
  let conclusion: string | undefined;
  if (sectionBlocks.length > 0) {
    const last = sectionBlocks[sectionBlocks.length - 1];
    if (last.kind === "p" && CONCLUSION_HINTS.test(last.text)) {
      conclusion = last.text;
      sectionBlocks.pop();
    }
  }

  // 8. Construire chapters (compat avec consumers existants)
  const chapters: Chapter[] = [];
  let currentChapter: Chapter | null = null;
  for (const b of sectionBlocks) {
    if (b.kind === "h3") {
      if (currentChapter) chapters.push(currentChapter);
      currentChapter = { title: b.title, body: "" };
    } else if (b.kind === "h4") {
      if (currentChapter) currentChapter.body += `\n${b.title}\n`;
      else currentChapter = { title: b.title, body: "" };
    } else if (b.kind === "p") {
      if (currentChapter) currentChapter.body += "\n" + b.text;
      else currentChapter = { title: "Description", body: b.text };
    } else if (b.kind === "bullet" || b.kind === "numbered") {
      if (currentChapter) currentChapter.body += "\n- " + (b as { text: string }).text;
      else currentChapter = { title: "Description", body: "- " + (b as { text: string }).text };
    }
  }
  if (currentChapter) chapters.push(currentChapter);

  // 9. Construire le HTML final (intro + sections + conclusion)
  const introHtml = introText
    ? `<p class="intro">${escapeHtml(introText.replace(/\n\n/g, " "))}</p>`
    : "";
  const sectionsHtml = blocksToHtml(sectionBlocks);
  const conclusionHtml = conclusion
    ? `<p class="conclusion">${escapeHtml(conclusion)}</p>`
    : "";
  const html = stripResidualTokens(
    `${introHtml}${sectionsHtml}${conclusionHtml}`,
  );

  return {
    intro: introText,
    chapters,
    conclusion,
    html,
  };
}

// Filet de sécurité ultime : strip toute sentinelle U+0001/U+0002 résiduelle
// ET toute occurrence "H3"/"H4" littérale collée au texte qui aurait échappé
// au parsing (regex futures, cas non couverts, descriptions corrompues).
function stripResidualTokens(html: string): string {
  return html
    .replace(/[]/g, "")
    .replace(/(?<![<\/a-zA-Z0-9])H[34](?=[A-ZÀ-ÿ])/g, "");
}
