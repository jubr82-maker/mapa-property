// Regles de langue des modeles d'annonces (oct. 2026) : accords en genre et
// en nombre, formats des nombres, des montants et des dates. Les mots
// viennent du vocabulaire (messages, namespace listing_model.vocab) ; seules
// les regles de grammaire sont ici.
import type { ListingLang } from "@/lib/listing/listing-data";

export type Gender = "m" | "f" | "n";

/** Type de bien dans le vocabulaire : "genre|adjectif|nom". */
export type TypeNoun = { gender: Gender; adj: string; noun: string };

export function parseTypeNoun(raw: string | undefined): TypeNoun {
  const [g, adj = "", noun = ""] = String(raw ?? "").split("|");
  const gender: Gender = g === "f" || g === "n" ? g : "m";
  return { gender, adj: adj.trim(), noun: noun.trim() };
}

/** Choix "un|deux|plusieurs" ou "un|plusieurs" selon n, {n} remplace. */
export function plural(raw: string | undefined, n: number, fmt: (n: number) => string): string {
  const parts = String(raw ?? "").split("|");
  const pick = parts.length >= 3 ? (n === 1 ? parts[0] : n === 2 ? parts[1] : parts[2]) : n === 1 ? parts[0] : parts[1] ?? parts[0];
  return (pick ?? "").replace(/\{n\}/g, fmt(n));
}

/** Forme accordee "m|f|n" (n facultatif : reprend m). */
export function agree(raw: string | undefined, g: Gender): string {
  const [m = "", f = m, n = m] = String(raw ?? "").split("|");
  return g === "f" ? f : g === "n" ? n : m;
}

// --- Nombres -----------------------------------------------------------------

function group(intPart: string, sep: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
}

/** 1 200 000 (fr), 1,200,000 (en), 1.200.000 (de) ; decimales au besoin. */
export function formatNumber(n: number, lang: ListingLang, maxDecimals = 2): string {
  const neg = n < 0;
  const raw = Math.abs(n).toFixed(maxDecimals);
  const fixed = raw.includes(".") ? raw.replace(/\.?0+$/, "") : raw;
  const [i, d] = fixed.split(".");
  const sep = lang === "en" ? "," : lang === "de" ? "." : " ";
  const dec = lang === "en" ? "." : ",";
  return (neg ? "-" : "") + group(i, sep) + (d ? dec + d : "");
}

export function formatMoney(n: number, lang: ListingLang): string {
  const v = formatNumber(Math.round(n), lang, 0);
  return lang === "en" ? `€${v}` : `${v} €`;
}

export function formatArea(n: number, lang: ListingLang): string {
  return `${formatNumber(n, lang)} m²`;
}

/** Ordinal d'etage : 1er, 2e (fr) ; 1st, 2nd (en) ; 1., 2. (de). */
export function ordinal(n: number, lang: ListingLang): string {
  if (lang === "fr") return n === 1 ? "1er" : `${n}e`;
  if (lang === "de") return `${n}.`;
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
}

const MONTHS: Record<ListingLang, string[]> = {
  fr: ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  de: ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"],
};

/** Date AAAA-MM-JJ en toutes lettres : 1er novembre 2026, 1 November 2026, 1. November 2026. */
export function formatDate(iso: string, lang: ListingLang): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const month = MONTHS[lang][mo - 1];
  if (!month || d < 1 || d > 31) return "";
  if (lang === "fr") return `${d === 1 ? "1er" : d} ${month} ${y}`;
  if (lang === "de") return `${d}. ${month} ${y}`;
  return `${d} ${month} ${y}`;
}

// --- Accords du qualificatif --------------------------------------------------

const FR_VOWEL = /^[aeiouyàâäéèêëîïôöùûüœæ]/i;
// h muet des mots usuels d'une annonce ("cet historique", "cet hotel").
const FR_H_MUET = /^(hab|harmon|hist|hôt|hot|hect|hér|her|heur|horiz|honor|hum|hyg)/i;

export function frStartsWithVowelSound(word: string): boolean {
  const w = word.trim();
  return FR_VOWEL.test(w) || FR_H_MUET.test(w);
}

const FR_FEMININE: Record<string, string> = {
  beau: "belle",
  bel: "belle",
  nouveau: "nouvelle",
  nouvel: "nouvelle",
  vieux: "vieille",
  vieil: "vieille",
  long: "longue",
  gentil: "gentille",
  blanc: "blanche",
  franc: "franche",
  frais: "fraîche",
  sec: "sèche",
  public: "publique",
  complet: "complète",
  discret: "discrète",
  secret: "secrète",
  inquiet: "inquiète",
  doux: "douce",
  faux: "fausse",
  roux: "rousse",
  bon: "bonne",
  gros: "grosse",
  bas: "basse",
  épais: "épaisse",
  favori: "favorite",
  meilleur: "meilleure",
  supérieur: "supérieure",
  intérieur: "intérieure",
  extérieur: "extérieure",
  majeur: "majeure",
  mineur: "mineure",
  andalou: "andalouse",
};

// Masculin devant voyelle : "ce bel appartement".
const FR_MASC_BEFORE_VOWEL: Record<string, string> = { beau: "bel", nouveau: "nouvel", vieux: "vieil", fou: "fol", mou: "mol" };

/** Feminin d'un adjectif francais au masculin singulier. */
export function frFeminine(adj: string): string {
  const w = adj.trim();
  const lower = w.toLocaleLowerCase("fr");
  if (FR_FEMININE[lower]) return FR_FEMININE[lower];
  if (/e$/.test(lower)) return w;
  if (/eux$/.test(lower)) return w.slice(0, -1) + "se";
  if (/eur$/.test(lower)) return w.slice(0, -1) + "se";
  if (/f$/.test(lower)) return w.slice(0, -1) + "ve";
  if (/(el|eil|ul)$/.test(lower)) return w + "le";
  if (/(en|on)$/.test(lower)) return w + "ne";
  if (/et$/.test(lower)) return w + "te";
  if (/er$/.test(lower)) return w.slice(0, -2) + "ère";
  if (/c$/.test(lower)) return w + "que";
  return w + "e";
}

// Mots invariables d'un qualificatif compose ("tres beau").
const FR_ADVERBS = new Set(["très", "si", "plus", "bien", "fort", "tout", "particulièrement", "vraiment", "remarquablement", "parfaitement", "entièrement", "nouvellement"]);

// Adjectifs places avant le nom (usage courant des annonces), toutes formes.
const FR_PRENOMINAL = new Set([
  "superbe", "superbes", "beau", "bel", "belle", "beaux", "belles", "élégant", "élégante", "rare", "rares",
  "charmant", "charmante", "magnifique", "magnifiques", "joli", "jolie", "grand", "grande", "petit", "petite",
  "vaste", "vastes",
]);

/** Le qualificatif se place-t-il avant le nom ? (son dernier mot decide) */
export function frIsPrenominal(qualifier: string): boolean {
  const words = qualifier.trim().toLocaleLowerCase("fr").split(/\s+/).filter(Boolean);
  return words.length > 0 && FR_PRENOMINAL.has(words[words.length - 1]);
}

/** Qualificatif francais accorde au nom qui le suit. */
export function frQualifier(qualifier: string, g: Gender, nextWord: string): string {
  const words = qualifier.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  return words
    .map((w, i) => {
      const lower = w.toLocaleLowerCase("fr");
      if (FR_ADVERBS.has(lower)) return lower;
      if (g === "f") return frFeminine(lower);
      const isLast = i === words.length - 1;
      if (isLast && FR_MASC_BEFORE_VOWEL[lower] && frStartsWithVowelSound(nextWord)) return FR_MASC_BEFORE_VOWEL[lower];
      return lower;
    })
    .join(" ");
}

/** Determinant demonstratif francais : ce, cet, cette. */
export function frDemonstrative(g: Gender, nextWord: string, forms: { m: string; m_vowel: string; f: string }): string {
  if (g === "f") return forms.f;
  return frStartsWithVowelSound(nextWord) ? forms.m_vowel : forms.m;
}

/** Radical allemand avant terminaison : schön, dunkl(e), teur(e), hoh(e). */
function deStem(adj: string): string {
  const w = adj.trim();
  if (/^hoch$/i.test(w)) return w.slice(0, -2) + "h";
  if (/e$/.test(w)) return w.slice(0, -1);
  if (/[^aeiouäöü]el$/i.test(w)) return w.slice(0, -2) + "l";
  if (/(eu|au)er$/i.test(w)) return w.slice(0, -2) + "r";
  return w;
}

// Mots invariables d'un qualificatif compose ("sehr schön").
const DE_ADVERBS = new Set(["sehr", "besonders", "äußerst", "überaus", "wirklich", "ganz", "neu", "frisch", "hochwertig"]);

/**
 * Adjectif allemand decline. "weak_acc" : apres diesen/diese/dieses
 * (objet de "vorstellen") ; "weak_nom" : apres dieser/diese/dieses ;
 * "strong_nom" : sans article (titre).
 */
export function deAdjective(adj: string, g: Gender, mode: "weak_acc" | "weak_nom" | "strong_nom"): string {
  const words = adj.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const ending =
    mode === "weak_acc" ? (g === "m" ? "en" : "e") : mode === "weak_nom" ? "e" : g === "m" ? "er" : g === "f" ? "e" : "es";
  return words
    .map((w, i) => {
      const isLast = i === words.length - 1;
      // "neu" et "hochwertig" ne sont invariables qu'en tete d'un compose.
      if (!isLast && DE_ADVERBS.has(w.toLocaleLowerCase("de"))) return w.toLocaleLowerCase("de");
      return deStem(w.toLocaleLowerCase("de")) + ending;
    })
    .join(" ");
}
