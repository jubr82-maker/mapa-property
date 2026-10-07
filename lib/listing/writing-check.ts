// Controle de redaction des annonces (oct. 2026). Module pur : meme code a
// l'ecran (avant enregistrement) et dans l'action serveur (qui bloque).
// Ne modifie JAMAIS le texte : il liste ce qu'il faut corriger, avec
// l'extrait fautif. Regles : lib/listing/writing-rules.ts.
import type { ListingLang } from "@/lib/listing/listing-data";
import { ALLOWED_CAPS, BARE_VERBS, FORBIDDEN_PHRASES } from "@/lib/listing/writing-rules";

export type WritingIssueCode =
  | "dash"
  | "spaced_hyphen"
  | "bullet"
  | "emoji"
  | "symbol"
  | "exclamation"
  | "caps_word"
  | "title_case"
  | "forbidden"
  | "bare_verb"
  | "three_adjectives"
  | "apostrophes"
  | "space_before"
  | "amount"
  | "area";

export type WritingIssue = { code: WritingIssueCode; excerpt: string };

// Tirets long, moyen, figure, barre horizontale et signe moins.
const DASHES = /[\u2012\u2013\u2014\u2015\u2212]/;
// Puces et marques de liste decoratives (debut de ligne ou au fil du texte).
const BULLETS = /[\u2022\u2023\u2043\u2219\u25AA\u25AB\u25CF\u25CB\u25E6\u25A0\u25A1\u25C6\u25C7\u00B7\u2027]/;
// Fleches et symboles decoratifs.
const ARROWS = /[\u2190-\u21FF\u27A1\u27F5-\u27FF\u2900-\u297F\u2B05-\u2B07\u25B6\u25C0\u25BA\u25C4]/;
const SYMBOLS = /[\u2605\u2606\u2713\u2714\u2716\u2717\u2718\u2726\u2727\u2728\u2756\u2764\u2665\u2666\u2663\u2660\u203B\u00A7\u00A4\u261E\u261B\u2600-\u26FF\u2700-\u27BF]/;
const EMOJI = /\p{Extended_Pictographic}/u;

function excerptAt(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 18);
  const end = Math.min(text.length, index + length + 18);
  return (start > 0 ? "..." : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "..." : "");
}

function firstMatch(text: string, re: RegExp): RegExpExecArray | null {
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  return g.exec(text);
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// --- Trois adjectifs a la suite ---------------------------------------------

// Adjectifs usuels des annonces (formes de base) ; les terminaisons et
// accords sont pris en compte par adjectiveLike().
const ADJ: Record<ListingLang, string[]> = {
  fr: [
    "beau", "bel", "belle", "grand", "petit", "joli", "vaste", "calme", "moderne", "neuf", "lumineux", "spacieux", "chaleureux", "agréable",
    "confortable", "élégant", "charmant", "superbe", "magnifique", "splendide", "unique", "rare", "exceptionnel", "contemporain", "fonctionnel",
    "pratique", "soigné", "raffiné", "authentique", "verdoyant", "ensoleillé", "paisible", "accueillant", "cosy", "idéal", "parfait", "généreux",
    "prestigieux", "luxueux", "somptueux", "intime", "convivial", "harmonieux", "clair", "sain", "solide", "récent", "rénové", "équipé",
    "aménagé", "traversant", "dégagé", "ouvert", "privatif", "sécurisé", "isolé", "familial", "chic", "sobre", "noble", "lumineuse",
  ],
  en: [
    "beautiful", "bright", "spacious", "warm", "modern", "elegant", "charming", "superb", "stunning", "unique", "rare", "exceptional",
    "contemporary", "functional", "practical", "refined", "authentic", "green", "sunny", "peaceful", "quiet", "welcoming", "cosy", "cozy",
    "ideal", "perfect", "generous", "prestigious", "luxurious", "sumptuous", "intimate", "friendly", "harmonious", "light", "airy", "large",
    "small", "new", "renovated", "equipped", "open", "private", "secure", "comfortable", "pleasant", "lovely", "stylish", "calm",
  ],
  de: [
    "schön", "hell", "geräumig", "warm", "modern", "elegant", "charmant", "einzigartig", "selten", "außergewöhnlich", "zeitgemäß",
    "funktional", "praktisch", "edel", "authentisch", "grün", "sonnig", "ruhig", "einladend", "gemütlich", "ideal", "perfekt", "großzügig",
    "luxuriös", "freundlich", "harmonisch", "licht", "groß", "klein", "neu", "renoviert", "offen", "privat", "sicher", "komfortabel",
    "angenehm", "stilvoll", "hochwertig", "exklusiv", "großartig", "wunderschön", "lichtdurchflutet",
  ],
};

const ADJ_SUFFIX: Record<ListingLang, RegExp> = {
  fr: /(eux|euse|euses|if|ive|ives|able|ables|ible|ibles|el|elle|elles|eux)$/,
  en: /(ous|ful|ive|able|ible|ic)$/,
  de: /(ig|lich|isch|bar|sam|voll|haft)(e|en|er|es|em)?$/,
};

// Noms courants qui ressemblent a des adjectifs (jamais comptes).
const NOT_ADJ = new Set(["table", "cable", "câble", "meuble", "immeuble", "hôtel", "tunnel", "niveau", "sous-sol", "jeux", "lieux", "cheveux", "feux", "vœux", "creux", "cive", "olive", "massive", "music", "traffic", "attic", "office", "honig", "käfig", "essig", "könig",
  // Noms de langues (service multilingue) : jamais une suite d'adjectifs decoratifs.
  "luxemburgisch", "französisch", "englisch", "deutsch", "italienisch", "portugiesisch", "spanisch", "niederländisch", "russisch", "arabisch", "chinesisch"]);

function adjectiveLike(word: string, lang: ListingLang): boolean {
  const w = word.toLocaleLowerCase(lang);
  if (w.length < 3 || NOT_ADJ.has(w)) return false;
  const bases = ADJ[lang];
  if (bases.includes(w)) return true;
  if (lang === "fr") {
    for (const b of bases) if (w === b + "e" || w === b + "s" || w === b + "es" || w === b.replace(/eux$/, "euse") || w === b.replace(/eux$/, "euses")) return true;
  } else if (lang === "de") {
    for (const b of bases) if (w.startsWith(b) && /^(e|en|er|es|em)?$/.test(w.slice(b.length))) return true;
  }
  return ADJ_SUFFIX[lang].test(w);
}

const AND: Record<ListingLang, string> = { fr: "et", en: "and", de: "und" };

function threeAdjectives(text: string, lang: ListingLang): string | null {
  // "A, B et C" ou "A, B, C" : trois adjectifs separes par virgule ou "et".
  const word = "([\\p{L}'-]+)";
  const sep = `(?:\\s*,\\s*|\\s+${AND[lang]}\\s+)`;
  const re = new RegExp(`${word}${sep}${word}${sep}${word}`, "giu");
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (adjectiveLike(m[1], lang) && adjectiveLike(m[2], lang) && adjectiveLike(m[3], lang)) return m[0];
    re.lastIndex = m.index + m[1].length + 1;
  }
  return null;
}

// --- Controle ----------------------------------------------------------------

export type CheckOptions = {
  /** Le texte est un titre (majuscules decoratives controlees). */
  title?: boolean;
  /** Noms propres permis en majuscule dans un titre (commune, marque). */
  properNouns?: string[];
};

export function checkWriting(input: string, lang: ListingLang, opts: CheckOptions = {}): WritingIssue[] {
  const text = String(input ?? "").replace(/\r\n?/g, "\n");
  const issues: WritingIssue[] = [];
  // Jusqu'a trois occurrences par regle, chacune avec son extrait.
  const add = (code: WritingIssueCode, re: RegExp) => {
    const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
    let m: RegExpExecArray | null;
    let n = 0;
    while ((m = g.exec(text)) && n < 3) {
      issues.push({ code, excerpt: excerptAt(text, m.index, m[0].length) });
      n++;
      if (m[0].length === 0) g.lastIndex++;
    }
  };

  add("dash", DASHES);
  // Tiret droit employe comme tiret de phrase (" - " au fil d'une ligne, ou "--").
  add("spaced_hyphen", /[^\n\s][ \t]+-[ \t]+[^\n]|--/);
  // Liste qui ne commence pas par "- " (tiret colle, puce, asterisque).
  add("bullet", new RegExp(`${BULLETS.source}|^[ \\t]*[*+>][ \\t]|^[ \\t]*-(?=[^ \\t\\n-])`, "m"));
  add("emoji", new RegExp(EMOJI.source, "u"));
  add("symbol", new RegExp(`${ARROWS.source}|${SYMBOLS.source}`, "u"));
  add("exclamation", /!/);

  if (opts.title) {
    const proper = new Set((opts.properNouns ?? []).flatMap((p) => p.split(/[\s-]+/)).map((p) => p.toLocaleLowerCase(lang)));
    const caps = new RegExp(`(?<!\\p{L})(?!(?:${ALLOWED_CAPS.join("|")})(?!\\p{L}))\\p{Lu}{3,}(?!\\p{L})`, "u");
    add("caps_word", caps);
    if (lang !== "de") {
      // Majuscule sur chaque mot : plus d'un mot (hors premier et noms propres).
      const words = [...text.matchAll(/[\p{L}][\p{L}'-]*/gu)];
      const capped = words.slice(1).filter((w) => /^\p{Lu}\p{Ll}/u.test(w[0]) && !proper.has(w[0].toLocaleLowerCase(lang)) && !ALLOWED_CAPS.includes(w[0].toUpperCase()) && w[0] !== "Property");
      if (capped.length >= 2) issues.push({ code: "title_case", excerpt: capped.map((w) => w[0]).join(", ") });
    }
  }

  const lower = text.toLocaleLowerCase(lang);
  for (const phrase of FORBIDDEN_PHRASES[lang]) {
    // "*" final : toutes les terminaisons (atemberaubend, atemberaubende...).
    const prefix = phrase.endsWith("*");
    const p = phrase.replace(/\*$/, "").toLocaleLowerCase(lang);
    const body = p.split("'").map(escapeRe).join("['’]");
    const re = new RegExp(`(?<![\\p{L}])${body}${prefix ? "\\p{L}*" : "(?![\\p{L}])"}`, "u");
    const m = re.exec(lower);
    if (m) issues.push({ code: "forbidden", excerpt: text.slice(m.index, m.index + m[0].length) });
  }
  for (const verb of BARE_VERBS[lang]) {
    const re = new RegExp(`(?<![\\p{L}])${escapeRe(verb)}(?=\\s*(?:[.?!:;,]|$))`, "mu");
    const m = re.exec(lower);
    if (m) issues.push({ code: "bare_verb", excerpt: excerptAt(text, m.index, m[0].length) });
  }
  const three = threeAdjectives(text, lang);
  if (three) issues.push({ code: "three_adjectives", excerpt: three });

  if (lang === "fr") {
    if (/'/.test(text) && /’/.test(text)) {
      const m = firstMatch(text, /’/);
      issues.push({ code: "apostrophes", excerpt: m ? excerptAt(text, m.index, 1) : "’" });
    }
    // Espace avant : ; ? (et !, deja interdit). Heures et adresses web exclues.
    // Heures (10:30) et adresses web (https://) exclues.
    add("space_before", /(?:[\p{L})»\]](?<!https?)[:;?](?!\/\/))|(?:\d[;?])|(?:\d:(?!\d))/u);
    // Montants : 1 200 000 € (milliers separes par une espace, espace avant €).
    add("amount", /\d{4,}(?:[.,]\d+)?\s?€|\d{1,3}(?:[.,]\d{3})+(?:\s?€)|€\s?\d|\d€|\d\s?(?:eur|euros?)(?!\p{L})/iu);
    // Surfaces : 115 m² (espace, exposant).
    add("area", /\d\s?(?:m2|mq|sqm)(?!\p{L})|\dm²/iu);
  }
  return issues;
}

/** Champ par champ, pour l'action serveur et l'ecran. */
export type FieldIssues = { field: string; lang: ListingLang; issues: WritingIssue[] };

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Texte des corrections (cles admin_listing chk_*), un champ par ligne. */
export function describeIssues(fields: FieldIssues[], t: Translate, label: (field: string) => string, max = 8): string[] {
  const out: string[] = [];
  for (const f of fields) for (const i of f.issues) out.push(t("chk_field", { field: label(f.field), issue: t(`chk_${i.code}`, { excerpt: i.excerpt }) }));
  return out.length > max ? [...out.slice(0, max), t("chk_more", { count: out.length - max })] : out;
}

/** Controle d'une liste de champs { nom, langue, texte, titre ? }. */
export function checkFields(items: { field: string; lang: ListingLang; text: string; title?: boolean }[], properNouns: string[] = []): FieldIssues[] {
  return items
    .map((it) => ({ field: it.field, lang: it.lang, issues: checkWriting(it.text, it.lang, { title: it.title, properNouns }) }))
    .filter((f) => f.issues.length > 0);
}

/** Texte litteral d'un modele (reperes et segments retires) pour le controle. */
export function templateLiteral(tpl: string): string {
  return String(tpl ?? "")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/\[\[|\]\]/g, "")
    .replace(/[ \t]{2,}/g, " ");
}
