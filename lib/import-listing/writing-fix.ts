// Import d'une annonce collee (nov. 2026). Module pur : corrections
// MECANIQUES demandees par les regles de redaction (lib/listing/
// writing-rules.ts), sans jamais changer un mot :
//   - francais : espace (insecable) avant ":" ";" "?" ;
//   - surfaces "348 m²" ; montants "1 250 000 €" ;
//   - une seule apostrophe (droite) ;
//   - listes en "- " (puces, asterisques, tirets longs ou colles en debut de ligne).
// Les formules interdites ne sont PAS remplacees : elles sont signalees
// (remainingIssues), Julien reformule lui-meme.
import { checkWriting, type WritingIssue } from "@/lib/listing/writing-check";
import type { ListingLang } from "@/lib/listing/listing-data";

const NBSP = "\u00A0";

// Marques de liste en debut de ligne : puces, fleches, coches, asterisque,
// plus, tirets longs ou moyens, tiret colle au mot.
const LIST_MARK = /^([ \t]*)(?:[\u2022\u2023\u2043\u2219\u25AA\u25AB\u25CF\u25CB\u25E6\u25A0\u25A1\u25C6\u25C7\u00B7\u2027\u27A4\u27A2\u25BA\u25B6\u2713\u2714\u2717\u2718\u2192\u21D2*\u2013\u2014\u2012\u2015\u2212]+[ \t]*|[+>][ \t]+(?=\D)|-(?=[^\s\d-]))/gmu;

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export function mechanicalFixes(input: string, lang: ListingLang = "fr"): string {
  let s = String(input ?? "").replace(/\r\n?/g, "\n");
  // Listes en "- ".
  s = s.replace(LIST_MARK, "$1- ");
  // Surfaces : 348m2, 348 m2, 348 mq, 348 sqm, 348m² -> 348 m².
  s = s.replace(/(\d)[ \u00A0\u202F]?(?:m2|m²|mq|sqm)(?![\p{L}\d])/giu, `$1${NBSP}m²`);
  if (lang === "fr") {
    // Apostrophe unique (droite).
    s = s.replace(/[\u2019\u2018]/g, "'");
    // Montants : 1250000 € / 1.250.000€ / 1 250 000 EUR -> 1 250 000 €.
    s = s.replace(/(?<![\d.,])(\d{1,3}(?:[.,\u00A0\u202F ]\d{3})+|\d{4,})(?:[ \u00A0\u202F]?(?:€|eur(?:os?)?(?![\p{L}])))/giu, (_m, n: string) => `${groupThousands(n.replace(/[.,\u00A0\u202F ]/g, ""))}${NBSP}€`);
    s = s.replace(/€[ \u00A0\u202F]?(\d{1,3}(?:[.,\u00A0\u202F ]\d{3})+|\d+)(?![\d.,])/gu, (_m, n: string) => `${groupThousands(n.replace(/[.,\u00A0\u202F ]/g, ""))}${NBSP}€`);
    s = s.replace(/(\d)€/g, `$1${NBSP}€`);
    // Espace avant : ; ? (adresses web et heures exclues), comme le controle.
    s = s
      .split(/(\b(?:https?:\/\/|www\.)[^\s<>"]+)/)
      .map((part, i) =>
        i % 2 === 1
          ? part
          : part
              .replace(/([\p{L})»\]²])([:;?])/gu, `$1${NBSP}$2`)
              .replace(/(\d)([;?])/g, `$1${NBSP}$2`)
              .replace(/(\d):(?!\d)/g, `$1${NBSP}:`),
      )
      .join("");
  }
  return s;
}

/** Ce qui reste a corriger a la main (formules interdites comprises). */
export function remainingIssues(text: string, lang: ListingLang, title = false): WritingIssue[] {
  return checkWriting(text, lang, { title });
}

/** Texte brut (lignes) vers le HTML de l'editeur : paragraphes et retours a la ligne. */
export function plainToHtml(text: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return String(text ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.split("\n").map((l) => esc(l.trim())).join("<br>")}</p>`)
    .join("");
}
