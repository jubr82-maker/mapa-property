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
    "écrins",
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
    "eingebettet*",
    "oase der ruhe",
    "ruheoase",
    "wartet auf sie",
    "erwartet sie",
    "ideal für familien",
    "perfekt für familien",
    "perfekte verbindung",
    "perfekt vereint",
    "atemberaubend*",
    "ein muss",
    "tauchen sie ein",
    "lassen sie sich verzaubern",
    "lassen sie sich begeistern",
    "wahres juwel",
    "schmuckstück*",
    "kleinod",
    "traumhaft*",
  ],
};

/** Verbe interdit sans complement ("Decouvrez." ou "Decouvrez !"). */
export const BARE_VERBS: Record<ListingLang, string[]> = {
  fr: ["découvrez"],
  en: ["discover"],
  de: ["entdecken sie"],
};

/**
 * Remplacement propose pour chaque formule interdite (nov. 2026), applique
 * en un clic ("Appliquer") : meme cle que FORBIDDEN_PHRASES ; un "*" final
 * reporte la terminaison du mot remplace (atemberaubende -> bemerkenswerte).
 * La majuscule initiale du texte remplace est gardee.
 */
export const FORBIDDEN_REPLACEMENTS: Record<ListingLang, Record<string, string>> = {
  fr: {
    "niché": "situé",
    "nichée": "située",
    "nichés": "situés",
    "nichées": "situées",
    "havre de paix": "lieu calme",
    "n'attend que vous": "est disponible",
    "idéal pour les familles": "adapté à une famille",
    "idéale pour les familles": "adaptée à une famille",
    "alliant à la perfection": "associant",
    "à couper le souffle": "remarquable",
    "un must": "un atout",
    "plongez": "entrez",
    "laissez-vous séduire": "appréciez",
    "véritable joyau": "bien rare",
    "écrin": "cadre",
    "écrins": "cadres",
  },
  en: {
    "nestled": "located",
    "haven of peace": "quiet setting",
    "haven of tranquillity": "quiet setting",
    "awaits you": "is available",
    "is waiting for you": "is available",
    "ideal for families": "suited to a family",
    "perfect for families": "suited to a family",
    "perfectly combines": "combines",
    "perfect blend": "combination",
    "breathtaking": "remarkable",
    "a must-see": "worth a visit",
    "a must": "an asset",
    "dive into": "explore",
    "immerse yourself": "take your time",
    "let yourself be seduced": "enjoy",
    "let yourself be charmed": "enjoy",
    "true gem": "rare property",
    "hidden gem": "rare property",
    "jewel": "rare property",
    "showcase": "present",
    "stunning": "remarkable",
    "boasts": "offers",
  },
  de: {
    "eingebettet*": "gelegen*",
    "oase der ruhe": "ruhige Lage",
    "ruheoase": "ruhige Lage",
    "wartet auf sie": "ist verfügbar",
    "erwartet sie": "bietet Ihnen",
    "ideal für familien": "für eine Familie geeignet",
    "perfekt für familien": "für eine Familie geeignet",
    "perfekte verbindung": "gelungene Verbindung",
    "perfekt vereint": "vereint",
    "atemberaubend*": "bemerkenswert*",
    "ein muss": "ein Vorteil",
    "tauchen sie ein": "nehmen Sie sich Zeit",
    "lassen sie sich verzaubern": "genießen Sie",
    "lassen sie sich begeistern": "genießen Sie",
    "wahres juwel": "seltene Immobilie",
    "schmuckstück*": "besondere Immobilie",
    "kleinod": "besondere Immobilie",
    "traumhaft*": "reizvoll*",
  },
};

/** Remplacement propose pour un verbe employe sans complement. */
export const BARE_VERB_REPLACEMENTS: Record<ListingLang, Record<string, string>> = {
  fr: { "découvrez": "visite sur rendez-vous" },
  en: { "discover": "viewings by appointment" },
  de: { "entdecken sie": "Besichtigung nach Vereinbarung" },
};

/** Sigles autorises en capitales dans un titre. */
export const ALLOWED_CAPS = ["MAPA", "PAG", "PAP", "TVA", "RDC", "LU", "CPE", "WC", "HAB", "MIX", "BEP", "ZAE"];

/** Consigne ajoutee a la traduction des annonces (Mistral). */
export function listingWritingPrompt(target: ListingLang): string {
  const list = FORBIDDEN_PHRASES[target].map((p) => `"${p.replace(/\*$/, "")}"`).join(", ");
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
- Never use these phrases, nor their inflected forms: ${list}.
- Never use ${bare} without a direct object.
- Keep the exact line structure: each "- " list line stays a "- " list line.${french}`;
}
