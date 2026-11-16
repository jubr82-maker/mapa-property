// Import d'une annonce collee (nov. 2026). Module pur : corrections de
// FORME des regles de redaction, par le meme code que l'enregistrement d'un
// bien (lib/listing/writing-autofix.ts) : tirets, puces et separateurs,
// espaces avant ":" ";" "?", "348 m²", "1 250 000 €", apostrophes, listes.
// Les formules interdites ne sont PAS remplacees : elles sont signalees
// (remainingIssues), Julien reformule lui-meme.
import { checkWriting, type WritingIssue } from "@/lib/listing/writing-check";
import { autoFixText } from "@/lib/listing/writing-autofix";
import type { ListingLang } from "@/lib/listing/listing-data";

/** Corrections de forme (meme code que l'enregistrement d'un bien). */
export function mechanicalFixes(input: string, lang: ListingLang = "fr"): string {
  return autoFixText(String(input ?? "").replace(/\r\n?/g, "\n"), lang).text;
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
