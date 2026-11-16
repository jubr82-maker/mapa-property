// Regles de FOND de la redaction (nov. 2026) : formules interdites et verbe
// sans complement. Module pur, ecran et serveur. Seules ces regles peuvent
// encore bloquer l'enregistrement ; chacune vient avec un remplacement pret
// a appliquer en un clic (lib/listing/writing-rules.ts).
// Fonctionne sur un texte brut comme sur le HTML de l'editeur (le texte
// entre les balises seulement ; apostrophe ecrite &#39; comprise).
import type { ListingLang } from "@/lib/listing/listing-data";
import { BARE_VERBS, BARE_VERB_REPLACEMENTS, FORBIDDEN_PHRASES, FORBIDDEN_REPLACEMENTS } from "@/lib/listing/writing-rules";

export type ContentHit = {
  code: "forbidden" | "bare_verb";
  start: number;
  end: number;
  /** Texte trouve, tel qu'ecrit. */
  match: string;
  /** Remplacement propose (majuscule initiale reportee). */
  replacement: string;
  /** Extrait autour, pour l'ecran. */
  excerpt: string;
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const APOS = "(?:['\\u2019]|&#39;|&apos;)";

function keepCase(found: string, replacement: string, lang: ListingLang): string {
  const first = found.charAt(0);
  if (first && first === first.toLocaleUpperCase(lang) && first !== first.toLocaleLowerCase(lang)) {
    return replacement.charAt(0).toLocaleUpperCase(lang) + replacement.slice(1);
  }
  return replacement;
}

/** Zones de balises HTML (a ne pas chercher dedans). */
function tagRanges(text: string): [number, number][] {
  return [...text.matchAll(/<[^>]*>/g)].map((m) => [m.index ?? 0, (m.index ?? 0) + m[0].length]);
}

function excerptOf(text: string, start: number, end: number): string {
  const plain = (s: string) => s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ");
  const a = Math.max(0, start - 30);
  const b = Math.min(text.length, end + 30);
  return ((a > 0 ? "..." : "") + plain(text.slice(a, b)) + (b < text.length ? "..." : "")).trim();
}

/** Formules interdites et verbes sans complement, avec leur remplacement. */
export function contentHits(input: string, lang: ListingLang): ContentHit[] {
  const text = String(input ?? "");
  if (!text.trim()) return [];
  const tags = tagRanges(text);
  const inTag = (i: number) => tags.some(([a, b]) => i >= a && i < b);
  const hits: ContentHit[] = [];
  for (const phrase of FORBIDDEN_PHRASES[lang]) {
    const prefix = phrase.endsWith("*");
    const p = phrase.replace(/\*$/, "");
    const body = p.split("'").map(escapeRe).join(APOS).replace(/ /g, "(?:\\s|&nbsp;)+");
    const re = new RegExp(`(?<![\\p{L}])${body}${prefix ? "(\\p{L}*)" : "(?![\\p{L}])"}`, "giu");
    const rule = FORBIDDEN_REPLACEMENTS[lang][phrase] ?? "";
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      if (inTag(start)) continue;
      const suffix = prefix ? (m[1] ?? "") : "";
      const repl = rule.endsWith("*") ? rule.slice(0, -1) + suffix : rule;
      hits.push({ code: "forbidden", start, end: start + m[0].length, match: m[0], replacement: keepCase(m[0], repl, lang), excerpt: excerptOf(text, start, start + m[0].length) });
    }
  }
  for (const verb of BARE_VERBS[lang]) {
    const re = new RegExp(`(?<![\\p{L}])${escapeRe(verb).replace(/ /g, "\\s+")}(?=\\s*(?:[.?!:;,]|<|$))`, "gimu");
    const rule = BARE_VERB_REPLACEMENTS[lang][verb] ?? "";
    for (const m of text.matchAll(re)) {
      const start = m.index ?? 0;
      if (inTag(start)) continue;
      hits.push({ code: "bare_verb", start, end: start + m[0].length, match: m[0], replacement: keepCase(m[0], rule, lang), excerpt: excerptOf(text, start, start + m[0].length) });
    }
  }
  // Chevauchements (ex. "a must" dans "a must-see") : la plus longue gagne.
  hits.sort((a, b) => a.start - b.start || b.end - a.end);
  const out: ContentHit[] = [];
  for (const h of hits) if (!out.some((o) => h.start < o.end && o.start < h.end)) out.push(h);
  return out;
}

/** Applique un remplacement (verifie que le texte n'a pas change entre-temps). */
export function applyHit(input: string, hit: Pick<ContentHit, "start" | "end" | "match" | "replacement">): string {
  const text = String(input ?? "");
  if (text.slice(hit.start, hit.end) !== hit.match) return text;
  return text.slice(0, hit.start) + hit.replacement + text.slice(hit.end);
}

/** Applique tous les remplacements proposes (de la fin vers le debut). */
export function applyAllHits(input: string, lang: ListingLang): string {
  let text = String(input ?? "");
  // Deux passes : un remplacement ne cree jamais de nouvelle formule, mais
  // un chevauchement ecarte a la premiere passe peut rester.
  for (let pass = 0; pass < 2; pass++) {
    const hits = contentHits(text, lang);
    if (!hits.length) break;
    for (const h of [...hits].sort((a, b) => b.start - a.start)) text = applyHit(text, h);
  }
  return text;
}
