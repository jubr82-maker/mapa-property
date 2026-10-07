// Regles de redaction des annonces (oct. 2026), une seule source pour :
// le controle qui bloque l'enregistrement (lib/listing/writing-check.ts),
// la consigne donnee a Mistral pour la traduction des annonces
// (lib/translate.ts) et la liste affichee dans l'admin.
//
// Francais : liste fixee par Julien. Anglais et allemand : listes
// proposees (rapport du 2026-10-07), actives tant qu'elles ne sont pas
// modifiees ici.
import type { ListingLang } from "@/lib/listing/listing-data";

/** Formules interdites ; "*" en fin de mot couvre les terminaisons. */
export const FORBIDDEN_PHRASES: Record<ListingLang, string[]> = {
  fr: [
    "niché",
    "nichée",
    "nichés",
    "nichées",
    "havre de paix",
    "n'attend que vous",
    "idéal pour les familles",
    "idéale pour les familles",
    "alliant à la perfection",
    "à couper le souffle",
    "un must",
    "plongez",
    "laissez-vous séduire",
    "véritable joyau",
    "écrin",
  ],
  en: [
    "nestled",
    "haven of peace",
    "haven of tranquillity",
    "awaits you",
    "is waiting for you",
    "ideal for families",
    "perfect for families",
    "perfectly combines",
    "perfect blend",
    "breathtaking",
    "a must-see",
    "a must",
    "dive into",
    "immerse yourself",
    "let yourself be seduced",
    "let yourself be charmed",
    "true gem",
    "hidden gem",
    "jewel",
    "showcase",
    "stunning",
    "boasts",
  ],
  de: [
    "eingebettet",
    "oase der ruhe",
    "ruheoase",
    "wartet auf sie",
    "erwartet sie",
    "ideal für familien",
    "perfekt für familien",
    "perfekte verbindung",
    "perfekt vereint",
    "atemberaubend",
    "ein muss",
    "tauchen sie ein",
    "lassen sie sich verzaubern",
    "lassen sie sich begeistern",
    "wahres juwel",
    "schmuckstück",
    "kleinod",
    "traumhaft",
  ],
};

/** Verbe interdit sans complement ("Decouvrez." ou "Decouvrez !"). */
export const BARE_VERBS: Record<ListingLang, string[]> = {
  fr: ["découvrez"],
  en: ["discover"],
  de: ["entdecken sie"],
};

/** Sigles autorises en capitales dans un titre. */
export const ALLOWED_CAPS = ["MAPA", "PAG", "PAP", "TVA", "RDC", "LU", "CPE", "WC", "HAB", "MIX", "BEP", "ZAE"];

/** Consigne ajoutee a la traduction des annonces (Mistral). */
export function listingWritingPrompt(target: ListingLang): string {
  const list = FORBIDDEN_PHRASES[target].map((p) => `"${p}"`).join(", ");
  const bare = BARE_VERBS[target].map((p) => `"${p}"`).join(", ");
  const french =
    target === "fr"
      ? '\n- French typography: one apostrophe type only (straight \'), a space before ":" ";" "?", amounts as "1 200 000 €", areas as "115 m²".'
      : "";
  return `
LISTING WRITING RULES (mandatory, they override any stylistic habit):
- No em dash (U+2014) and no en dash (U+2013). The only dash allowed is "- " at the start of a list line.
- No decorative bullets, no emoji, no arrows, no decorative symbols.
- No exclamation mark. No decorative capitals in titles (sentence case, proper nouns excepted).
- Never use these phrases: ${list}.
- Never use ${bare} without a direct object.
- Never chain three adjectives in a row (e.g. "bright, spacious and warm").
- Keep the exact line structure: each "- " list line stays a "- " list line.${french}`;
}
