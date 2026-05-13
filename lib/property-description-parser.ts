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
// Niveau H3 (section principale)
const H3_MARKERS: Array<{ pattern: RegExp; title: string }> = [
  {
    pattern: /\b(?:caractéristiques\s+principales|principales\s+caractéristiques|main\s+features|key\s+features|hauptmerkmale|merkmale)\s*:/gi,
    title: "Caractéristiques principales",
  },
  {
    pattern: /\b(?:disposition|agencement|layout|floor\s+plan|aufteilung|raumaufteilung|grundriss)\s*:/gi,
    title: "Disposition",
  },
  {
    pattern: /\b(?:commodités\s+du\s+quartier|amenities\s+nearby|umgebung)\s*:/gi,
    title: "Commodités du quartier",
  },
  {
    pattern: /\b(?:commodités|amenities|facilities|annehmlichkeiten|einrichtungen)\s*:/gi,
    title: "Commodités",
  },
  {
    pattern: /\b(?:sécurité|security|sicherheit)\s*:/gi,
    title: "Sécurité",
  },
  {
    pattern: /\b(?:équipements?|features|comfort|ausstattung)\s*:/gi,
    title: "Équipements",
  },
  {
    pattern: /\b(?:localisation|emplacement|environnement|location|standort|lage)\s*:/gi,
    title: "Localisation",
  },
  {
    pattern: /\b(?:énergie|performance\s+énergétique|energy|dpe|energieeffizienz)\s*:/gi,
    title: "Énergie & performance",
  },
];

// Niveau H4 (sous-section)
const H4_MARKERS: Array<{ pattern: RegExp; title: string }> = [
  {
    pattern: /\b(?:distribution\s+des\s+pièces\s+de\s+nuit|night\s+zone|schlafbereich)\s*:/gi,
    title: "Distribution des pièces de nuit",
  },
  {
    pattern: /\b(?:distribution\s+des\s+pièces\s+de\s+vie|day\s+zone|reception\s+rooms|wohnbereich)\s*:/gi,
    title: "Distribution des pièces de vie",
  },
  {
    pattern: /\b(?:distribution|raumverteilung)\s*:/gi,
    title: "Distribution",
  },
  {
    pattern: /\b(?:hall\s+d['’]entrée|entrance\s+hall|eingangshalle)\s*:/gi,
    title: "Hall d'entrée",
  },
  {
    pattern: /\b(?:cuisine|kitchen|küche)\s*:/gi,
    title: "Cuisine",
  },
  {
    pattern: /\b(?:salle[s]?\s+de\s+bain|bathroom|badezimmer)\s*:/gi,
    title: "Salles de bain",
  },
  {
    pattern: /\b(?:chambres|bedrooms|schlafzimmer)\s*:/gi,
    title: "Chambres",
  },
  {
    pattern: /\b(?:salon|séjour|living|wohnzimmer)\s*:/gi,
    title: "Salon",
  },
  {
    pattern: /\b(?:extérieur[s]?|jardin|exterior|garden|garten|terrasse[s]?)\s*:/gi,
    title: "Extérieurs",
  },
];

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

function injectSectionTokens(text: string): string {
  let out = text;
  // H4 d'abord (les "Distribution des pièces de nuit :" sont plus spécifiques que "Distribution :")
  for (const m of H4_MARKERS) {
    out = out.replace(m.pattern, `\n\n${H4_TOKEN}${m.title}\n`);
  }
  for (const m of H3_MARKERS) {
    out = out.replace(m.pattern, `\n\n${H3_TOKEN}${m.title}\n`);
  }
  return out;
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

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (line.startsWith(H3_TOKEN)) {
      blocks.push({ kind: "h3", title: line.slice(H3_TOKEN.length).trim() });
      continue;
    }
    if (line.startsWith(H4_TOKEN)) {
      blocks.push({ kind: "h4", title: line.slice(H4_TOKEN.length).trim() });
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

export function parseApimoDescription(
  rawText: string | null | undefined,
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

  // 5. Parser en blocs structurés
  const blocks = parseBlocks(working);
  if (blocks.length === 0) return { intro: "", chapters: [], html: "" };

  // 6. Extraire intro (tous les blocks "p" avant le 1er h3/h4)
  let firstSectionIdx = blocks.findIndex(
    (b) => b.kind === "h3" || b.kind === "h4",
  );
  if (firstSectionIdx === -1) firstSectionIdx = blocks.length;

  const introBlocks = blocks.slice(0, firstSectionIdx);
  const sectionBlocks = blocks.slice(firstSectionIdx);

  const introText = introBlocks
    .filter((b) => b.kind === "p")
    .map((b) => (b as { text: string }).text)
    .join("\n\n");

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
  const html = `${introHtml}${sectionsHtml}${conclusionHtml}`;

  return {
    intro: introText,
    chapters,
    conclusion,
    html,
  };
}
