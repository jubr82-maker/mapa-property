// Correction automatique des regles de FORME de la redaction (nov. 2026).
// Module pur, meme code a l'ecran et dans les actions serveur : au lieu de
// bloquer l'enregistrement, le texte est corrige, et chaque correction est
// rapportee (avant / apres) pour le message vert de la fiche.
//
// Corrige (toutes les regles de forme de lib/listing/writing-check.ts) :
//   - tirets longs et moyens, tiret droit employe comme ponctuation :
//     virgule, deux-points ou parentheses selon le contexte ; tiret entre
//     deux chiffres ou colle entre deux mots : trait d'union ;
//   - point median ou puce au milieu d'une ligne : separateur, remplace par
//     une virgule (point-virgule si la ligne contient deja des virgules) ;
//     en debut de ligne seulement : puce, convertie en "- " ;
//   - puces, asterisques, fleches et coches de debut de ligne : "- " ;
//   - emoji et symboles decoratifs : retires ; point d'exclamation : point ;
//   - titres : mots en capitales et majuscules decoratives ;
//   - francais : espace avant ":" ";" "?", "1 250 000 €", une seule
//     apostrophe ; toutes langues : "348 m²".
// Ne touche JAMAIS aux formules interdites (regles de fond) : elles sont
// proposees au remplacement par lib/listing/writing-suggest.ts.
// Adresses web, e-mails, balises HTML et (option) reperes de modele sont
// proteges : remplaces par des caracteres d'usage prive pendant le travail.
import type { ListingLang } from "@/lib/listing/listing-data";
import type { WritingIssueCode } from "@/lib/listing/writing-check";
import { ALLOWED_CAPS } from "@/lib/listing/writing-rules";

export type FixChange = { code: WritingIssueCode; before: string; after: string };
export type FixResult = { text: string; changes: FixChange[] };
export type FixOptions = {
  /** Le texte est un titre (capitales et majuscules decoratives). */
  title?: boolean;
  /** Noms propres permis en majuscule (commune, localites). */
  properNouns?: string[];
  /** Segments a ne jamais modifier (ex. reperes {{cle}} d'un modele). */
  protect?: RegExp;
};

/** Interne : reperes des balises <li> (une puce y est retiree, pas doublee). */
type InternalOptions = FixOptions & { listItemMarks?: Set<string> };

/** Regles de fond : seules a pouvoir encore bloquer l'enregistrement. */
export const CONTENT_CODES: readonly WritingIssueCode[] = ["forbidden", "bare_verb"];
export const isContentCode = (code: WritingIssueCode) => CONTENT_CODES.includes(code);

const NBSP = "\u00A0";
const SP = "[ \\t\\u00A0\\u202F]";
const DASH_CHARS = "\\u2012\\u2013\\u2014\\u2015\\u2212";
const BULLET_CHARS = "\\u2022\\u2023\\u2043\\u2219\\u25AA\\u25AB\\u25CF\\u25CB\\u25E6\\u25A0\\u25A1\\u25C6\\u25C7\\u00B7\\u2027";
const ARROW_CHARS = "\\u2190-\\u21FF\\u27A1\\u27F5-\\u27FF\\u2900-\\u297F\\u2B05-\\u2B07\\u25B6\\u25C0\\u25BA\\u25C4";
const SYMBOL_CHARS =
  "\\u2605\\u2606\\u2713\\u2714\\u2716\\u2717\\u2718\\u2726\\u2727\\u2728\\u2756\\u2764\\u2665\\u2666\\u2663\\u2660\\u203B\\u00A7\\u00A4\\u261E\\u261B\\u2600-\\u26FF\\u2700-\\u27BF";
// Reperes internes (balises, adresses protegees) : usage prive.
const MARK_FIRST = 0xe100;
const MARK_CLASS = "\\uE100-\\uF8FF";
const MARKS_G = new RegExp(`[${MARK_CLASS}]`, "g");
/** Vide une fois les reperes retires. */
const blank = (s: string) => !s.replace(MARKS_G, "").trim();

// --- Journal des corrections -------------------------------------------------

type Ctx = { changes: FixChange[] };

function excerpt(s: string, start: number, end: number, middle: string): string {
  const a = Math.max(0, start - 22);
  const b = Math.min(s.length, end + 22);
  return ((a > 0 ? "..." : "") + s.slice(a, start) + middle + s.slice(end, b) + (b < s.length ? "..." : "")).replace(/[ \t]*\n[ \t]*/g, " / ");
}

const visible = (s: string) => s.replace(/[\u00A0\u202F]/g, " ");

/** Remplacement journalise : chaque occurrence modifiee est rapportee. */
function rep(ctx: Ctx, code: WritingIssueCode, s: string, re: RegExp, fn: (m: string, groups: string[], offset: number, whole: string) => string): string {
  return s.replace(re, (...args: unknown[]) => {
    const m = args[0] as string;
    let i = args.length - 1;
    while (i > 0 && typeof args[i] !== "number") i--;
    const offset = args[i] as number;
    const groups = args.slice(1, i).map((g) => (typeof g === "string" ? g : ""));
    const out = fn(m, groups, offset, s);
    if (out !== m) {
      const before = excerpt(s, offset, offset + m.length, m);
      const after = excerpt(s, offset, offset + m.length, out);
      if (visible(before) !== visible(after)) ctx.changes.push({ code, before, after });
    }
    return out;
  });
}

// --- Protection (adresses web, e-mails, reperes) ----------------------------

type Shield = { text: string; restore: (s: string) => string };

/** Remplace les segments proteges par des reperes a partir de `base`. */
function shield(text: string, protect: RegExp | undefined, base: number): Shield {
  const saved: string[] = [];
  const keep = (m: string) => {
    saved.push(m);
    return String.fromCharCode(base + saved.length - 1);
  };
  let s = text;
  if (protect) s = s.replace(new RegExp(protect.source, protect.flags.includes("g") ? protect.flags : protect.flags + "g"), keep);
  s = s.replace(new RegExp(`\\b(?:https?:\\/\\/|www\\.)[^\\s<>"${MARK_CLASS}]+|[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+`, "g"), keep);
  const restore = (s2: string) =>
    s2.replace(MARKS_G, (c) => {
      const k = c.charCodeAt(0) - base;
      return k >= 0 && k < saved.length ? saved[k] : c;
    });
  return { text: s, restore };
}

// --- Regles ------------------------------------------------------------------

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** Espace laissee par un caractere retire (pas de double espace, pas d'espace avant ponctuation). */
function removalGap(whole: string, offset: number, length: number): string {
  const before = whole.slice(0, offset).replace(MARKS_G, "").slice(-1);
  const after = whole.slice(offset + length).replace(MARKS_G, "").slice(0, 1);
  if (!before || before === "\n" || before === " " || !after || after === "\n" || after === " ") return "";
  if (/[,.;:!?)\]»]/.test(after) || /[(\[«]/.test(before)) return "";
  return " ";
}

// Debut de ligne (reperes de balise permis devant) : puces, fleches,
// coches, asterisque, plus suivi d'une espace, tirets longs, tiret colle au
// mot ou double tiret.
const LIST_MARK = new RegExp(
  `^([ \\t${MARK_CLASS}]*)(?:[${BULLET_CHARS}${ARROW_CHARS}${SYMBOL_CHARS}*${DASH_CHARS}]+${SP}*|[+>]${SP}+(?=\\D)|-{2,}${SP}*|-(?=[^\\s\\d-]))`,
  "gmu",
);
const LIST_PREFIX = new RegExp(`^[ \\t${MARK_CLASS}]*- `);

const DETERMINERS: Record<ListingLang, string[]> = {
  fr: ["un", "une", "des", "le", "la", "les", "l'", "du", "ce", "cet", "cette", "ces", "son", "sa", "ses", "tout", "toute", "tous", "toutes"],
  en: ["a", "an", "the", "this", "these", "its", "all", "every"],
  de: ["ein", "eine", "einen", "einem", "der", "die", "das", "den", "dem", "des", "dieser", "diese", "dieses", "alle"],
};

function colon(lang: ListingLang): string {
  return lang === "fr" ? `${NBSP}: ` : ": ";
}

/** Tirets de ponctuation d'une ligne : virgule, deux-points ou parentheses. */
function fixDashLine(ctx: Ctx, line: string, lang: ListingLang): string {
  // Prefixe de liste "- " garde tel quel.
  const prefix = LIST_PREFIX.exec(line)?.[0] ?? "";
  const body = line.slice(prefix.length);
  const source = `(${SP}*)([${DASH_CHARS}]+|-{2,}|(?<=${SP})-(?=${SP}))(${SP}*)`;
  type Hit = { start: number; end: number; lead: string; trail: string };
  const hits: Hit[] = [];
  for (const m of body.matchAll(new RegExp(source, "gu"))) hits.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, lead: m[1], trail: m[3] });
  if (!hits.length) return line;
  const out: (string | undefined)[] = new Array(hits.length).fill(undefined);
  const sentenceEnd = (from: number) => {
    const r = /[.?!](?=\s|$)/g;
    r.lastIndex = from;
    const m = r.exec(body);
    return m ? m.index : body.length;
  };
  for (let i = 0; i < hits.length; i++) {
    if (out[i] !== undefined) continue;
    const h = hits[i];
    const prev = body.slice(0, h.start);
    const next = body.slice(h.end);
    if (blank(prev) || blank(next)) {
      out[i] = "";
      continue;
    }
    const spaced = h.lead.length > 0 || h.trail.length > 0;
    // Plage de chiffres ou mot compose : trait d'union.
    if (!spaced || (/\d$/.test(prev) && /^\d/.test(next) && h.lead.length + h.trail.length <= 2)) {
      out[i] = "-";
      continue;
    }
    if (/[,;:.(]$/.test(prev.trimEnd())) {
      out[i] = " ";
      continue;
    }
    // Incise entre deux tirets dans la meme phrase : parentheses, ou
    // virgules si l'incise contient deja une ponctuation.
    const j = hits[i + 1];
    if (j && j.start < sentenceEnd(h.end) && (j.lead.length > 0 || j.trail.length > 0) && !blank(body.slice(j.end))) {
      const inner = body.slice(h.end, j.start);
      if (!blank(inner) && inner.length <= 80) {
        const after = body.slice(j.end);
        if (/[,;:]/.test(inner)) {
          out[i] = ", ";
          out[i + 1] = /^[,.;:?!)]/.test(after) ? "" : ", ";
        } else {
          out[i] = " (";
          out[i + 1] = /^[,.;:?!)]/.test(after) ? ")" : ") ";
        }
        continue;
      }
    }
    // Tiret seul : deux-points s'il annonce une explication ou une liste,
    // sinon virgule.
    const rest = body.slice(h.end, sentenceEnd(h.end)).replace(MARKS_G, "");
    const firstWord = (/^[\p{L}']+/u.exec(rest)?.[0] ?? "").toLocaleLowerCase(lang);
    const announces =
      DETERMINERS[lang].includes(firstWord) ||
      DETERMINERS[lang].some((d) => d.endsWith("'") && firstWord.startsWith(d)) ||
      (rest.match(/,/g)?.length ?? 0) >= 2;
    out[i] = announces ? colon(lang) : ", ";
  }
  let k = 0;
  return prefix + rep(ctx, "dash", body, new RegExp(source, "gu"), () => out[k++] ?? "");
}

/** Point median, puce ou fleche au milieu d'une ligne : virgule (ou point-virgule). */
function fixMidBullets(ctx: Ctx, line: string): string {
  const prefix = LIST_PREFIX.exec(line)?.[0] ?? "";
  const body = line.slice(prefix.length);
  const source = `${SP}*[${BULLET_CHARS}${ARROW_CHARS}]+${SP}*`;
  if (!new RegExp(source, "u").test(body)) return line;
  const sep = /,/.test(body.replace(new RegExp(source, "gu"), " ")) ? "; " : ", ";
  return (
    prefix +
    rep(ctx, "bullet", body, new RegExp(source, "gu"), (m, _g, offset, whole) => {
      const before = whole.slice(0, offset);
      const after = whole.slice(offset + m.length);
      if (blank(before) || blank(after)) return "";
      if (/[,;:.]$/.test(before.replace(MARKS_G, "").trimEnd())) return " ";
      return sep;
    })
  );
}

function capitalize(w: string, lang: ListingLang): string {
  return w.charAt(0).toLocaleUpperCase(lang) + w.slice(1).toLocaleLowerCase(lang);
}

const DE_SMALL = new Set(["mit", "und", "in", "im", "am", "an", "auf", "für", "zu", "zum", "zur", "von", "vom", "der", "die", "das", "den", "dem", "des", "ein", "eine", "bei", "nahe", "oder", "ohne", "aus", "nach"]);

function fixTitle(ctx: Ctx, s: string, lang: ListingLang, proper: Set<string>): string {
  const allowed = ALLOWED_CAPS.join("|");
  const sentenceStart = (before: string) => blank(before) || /[.?!:]\s*$/.test(before.replace(MARKS_G, ""));
  // Mots en capitales (3 lettres ou plus, sigles permis exclus).
  let capsFixed = 0;
  let out = rep(ctx, "caps_word", s, new RegExp(`(?<!\\p{L})(?:\\p{Lu}['\\u2019])?(?!(?:${allowed})(?!\\p{L}))\\p{Lu}{3,}(?!\\p{L})`, "gu"), (m, _g, offset, whole) => {
    capsFixed++;
    const lower = m.toLocaleLowerCase(lang);
    const first = sentenceStart(whole.slice(0, offset));
    if (proper.has(lower)) return capitalize(m, lang);
    if (lang === "de") return DE_SMALL.has(lower) && !first ? lower : capitalize(m, lang);
    return first ? capitalize(m, lang) : lower;
  });
  // Titre ecrit en capitales : petits mots d'une lettre ("À", "A") aussi.
  if (capsFixed > 0 && lang !== "de") {
    out = rep(ctx, "caps_word", out, /(?<!\p{L})[ÀA](?![\p{L}'\u2019])/gu, (m, _g, offset, whole) => (sentenceStart(whole.slice(0, offset)) ? m : m.toLocaleLowerCase(lang)));
  }
  if (lang !== "de") {
    const words = [...out.matchAll(/[\p{L}][\p{L}'-]*/gu)];
    const isCapped = (w: string) => /^\p{Lu}\p{Ll}/u.test(w) && !proper.has(w.toLocaleLowerCase(lang)) && !ALLOWED_CAPS.includes(w.toUpperCase()) && w !== "Property";
    const capped = words.slice(1).filter((w) => isCapped(w[0]));
    if (capped.length >= 2) {
      const targets = new Set(capped.map((w) => w.index));
      out = rep(ctx, "title_case", out, /[\p{L}][\p{L}'-]*/gu, (m, _g, offset, whole) => {
        if (!targets.has(offset) || sentenceStart(whole.slice(0, offset))) return m;
        return m.toLocaleLowerCase(lang);
      });
    }
  }
  return out;
}

function fixText(ctx: Ctx, input: string, lang: ListingLang, opts: InternalOptions): string {
  let s = input;

  // 0. Signe moins devant un chiffre (-5 °C) : trait d'union, pas une ponctuation.
  s = rep(ctx, "dash", s, /\u2212(?=\d)/g, () => "-");

  // 1. Emoji (et selecteurs de variante) : retires ; en debut de ligne
  // devant du texte, ils servaient de puce : "- ".
  s = rep(ctx, "emoji", s, /[ \t]*(?:\p{Extended_Pictographic}\uFE0F?\u20E3?)+[ \t]*/gu, (m, _g, offset, whole) => {
    const lineStart = blank(whole.slice(whole.lastIndexOf("\n", offset - 1) + 1, offset));
    const after = whole.slice(offset + m.length);
    if (lineStart && after && !blank(after.split("\n")[0])) return "- ";
    return removalGap(whole, offset, m.length);
  });

  // 2. Marques de liste en debut de ligne : "- ".
  // Dans un element de liste HTML, la puce est retiree (la liste en a deja une).
  // (Le repere <li> est en fin de ligne precedente : balise de bloc suivie d'un retour.)
  s = rep(ctx, "bullet", s, LIST_MARK, (_m, g, offset, whole) => {
    const inItem = [...g[0], whole[offset - 2] ?? ""].some((c) => opts.listItemMarks?.has(c));
    return inItem ? g[0] : `${g[0]}- `;
  });

  // 3. Point median, puces et fleches au milieu d'une ligne : separateur.
  s = s
    .split("\n")
    .map((line) => fixMidBullets(ctx, line))
    .join("\n");

  // 4. Symboles decoratifs restants : retires.
  s = rep(ctx, "symbol", s, new RegExp(`[ \\t]*[${SYMBOL_CHARS}]+[ \\t]*`, "gu"), (m, _g, offset, whole) => removalGap(whole, offset, m.length));

  // 5. Tirets de ponctuation.
  s = s
    .split("\n")
    .map((line) => fixDashLine(ctx, line, lang))
    .join("\n");

  // 6. Point d'exclamation : point (ou point d'interrogation seul).
  s = rep(ctx, "exclamation", s, new RegExp(`${SP}*(?:\\?!+|!+\\?)`, "gu"), () => "?");
  s = rep(ctx, "exclamation", s, new RegExp(`${SP}*!+`, "gu"), (_m, _g, offset, whole) => (/[.?]$/.test(whole.slice(0, offset)) ? "" : "."));

  // 7. Titres : capitales et majuscules decoratives.
  if (opts.title) {
    const proper = new Set((opts.properNouns ?? []).flatMap((p) => [p, ...p.split(/[\s-]+/)]).map((p) => p.toLocaleLowerCase(lang)));
    s = fixTitle(ctx, s, lang, proper);
  }

  // 8. Surfaces : 348m2, 348 m2, 348 mq, 348 sqm, 348m² -> 348 m².
  s = rep(ctx, "area", s, /(\d)[ \u00A0\u202F]?(?:m2|m²|mq|sqm)(?![\p{L}\d])/giu, (_m, g) => `${g[0]}${NBSP}m²`);

  if (lang === "fr") {
    // 9. Une seule apostrophe (droite).
    s = rep(ctx, "apostrophes", s, /[\u2019\u2018]/g, () => "'");
    // 10. Montants : 1250000 € / 1.250.000€ / 1 250 000 EUR / € 500 -> 1 250 000 €.
    const NUM = "(\\d{1,3}(?:[.,\\u00A0\\u202F ]\\d{3})+|\\d+)((?:,\\d{1,2})?)";
    const money = (n: string, dec: string) => `${groupThousands(n.replace(/[.,\u00A0\u202F ]/g, ""))}${dec}${NBSP}€`;
    s = rep(ctx, "amount", s, new RegExp(`(?<![\\d.,])${NUM}(?:[ \\u00A0\\u202F]?(?:\\u20AC|eur(?:os?)?(?![\\p{L}])))`, "giu"), (_m, g) => money(g[0], g[1]));
    s = rep(ctx, "amount", s, new RegExp(`\\u20AC[ \\u00A0\\u202F]?${NUM}(?![\\d.,])`, "gu"), (_m, g) => money(g[0], g[1]));
    // 11. Espace avant : ; ? (heures 10:30 exclues ; adresses deja protegees).
    s = rep(ctx, "space_before", s, /([\p{L})»\]²])([:;?])/gu, (_m, g) => `${g[0]}${NBSP}${g[1]}`);
    s = rep(ctx, "space_before", s, /(\d)([;?])/g, (_m, g) => `${g[0]}${NBSP}${g[1]}`);
    s = rep(ctx, "space_before", s, /(\d):(?!\d)/g, (_m, g) => `${g[0]}${NBSP}:`);
  }
  return s;
}

/** Corrige un texte brut (titre, accroche, critere...). */
export function autoFixText(input: string, lang: ListingLang, opts: FixOptions = {}): FixResult {
  const original = String(input ?? "");
  const text = original.replace(/\r\n?/g, "\n").replace(MARKS_G, "");
  if (!text.trim()) return { text: original, changes: [] };
  const sh = shield(text, opts.protect, MARK_FIRST);
  const ctx: Ctx = { changes: [] };
  const fixed = sh.restore(fixText(ctx, sh.text, lang, opts));
  if (!ctx.changes.length) return { text: original, changes: [] };
  return { text: fixed, changes: ctx.changes.map((c) => ({ ...c, before: sh.restore(c.before), after: sh.restore(c.after) })) };
}

const BLOCK_TAG = /^<\/?(?:p|div|li|ul|ol|h[1-6]|br|blockquote|tr|td|table)\b/i;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, NBSP)
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (m, n: string) => {
      const c = Number(n);
      // Valeurs invalides ou d'usage prive (reperes internes) : laissees telles quelles.
      return c > 0 && c <= 0x10ffff && !(c >= 0xe000 && c <= 0xf8ff) && !(c >= 0xd800 && c <= 0xdfff) ? String.fromCodePoint(c) : m;
    })
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/**
 * Corrige le HTML de l'editeur (description) : seul le texte est modifie,
 * jamais les balises. Une balise de bloc (p, br, li...) ouvre une ligne.
 */
export function autoFixHtml(html: string, lang: ListingLang, opts: FixOptions = {}): FixResult {
  const src = String(html ?? "");
  if (!src.trim()) return { text: src, changes: [] };
  const tags: string[] = [];
  const listItemMarks = new Set<string>();
  // Balises remplacees par un repere ; une balise de bloc est suivie d'un
  // retour a la ligne, retire a la restitution.
  let virtual = src
    .replace(/\r\n?/g, "\n")
    .replace(MARKS_G, "")
    // Balises, et entites autres que les plus courantes (gardees telles quelles).
    .replace(/<[^>]*>|&(?!(?:nbsp|quot|apos|amp|lt|gt|#39);)(?:[a-zA-Z][a-zA-Z0-9]*|#\d+|#x[0-9a-fA-F]+);/g, (tag) => {
      const mark = String.fromCharCode(MARK_FIRST + tags.length);
      tags.push(tag);
      if (/^<li\b/i.test(tag)) listItemMarks.add(mark);
      return BLOCK_TAG.test(tag) ? `${mark}\n` : mark;
    });
  if (tags.length > 0x1000) return { text: src, changes: [] };
  virtual = decodeEntities(virtual);
  const sh = shield(virtual, opts.protect, MARK_FIRST + tags.length);
  const ctx: Ctx = { changes: [] };
  const fixed = fixText(ctx, sh.text, lang, { ...opts, listItemMarks });
  if (!ctx.changes.length) return { text: src, changes: [] };
  const isTag = (c: string) => c.charCodeAt(0) - MARK_FIRST < tags.length;
  const tagOf = (c: string) => tags[c.charCodeAt(0) - MARK_FIRST] ?? "";
  const restoreHtml = (s: string) =>
    sh
      .restore(s)
      .replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"))
      .replace(new RegExp(`([${MARK_CLASS}])(\\n?)`, "g"), (_m, c: string, nl: string) => {
        if (!isTag(c)) return c + nl;
        const tag = tagOf(c);
        return BLOCK_TAG.test(tag) ? tag : tag + nl;
      });
  const display = (s: string) =>
    sh
      .restore(s)
      .replace(new RegExp(`([${MARK_CLASS}])( \\/ )?`, "g"), (_m, c: string) => (isTag(c) ? (BLOCK_TAG.test(tagOf(c)) ? " / " : "") : c))
      .replace(/(?: \/ )+/g, " / ")
      .replace(/^ \/ | \/ $/g, "")
      .replace(/[ \t]{2,}/g, " ");
  return { text: restoreHtml(fixed), changes: ctx.changes.map((c) => ({ ...c, before: display(c.before), after: display(c.after) })) };
}
