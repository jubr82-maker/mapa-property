// lib/admin/exports/theme.ts : couleurs de marque pour les exports PDF et
// Excel. DÉCISION JULIEN (2026-09-22) : ces documents représentent MAPA
// Property vers l'extérieur, pas la console d'administration : on utilise
// la charte officielle du site public (palette "Forêt Luxembourgeoise",
// app/globals.css), jamais le bleu ardoise utilisé dans l'outil d'admin.
//
// AUCUNE couleur ne doit être codée en dur ailleurs dans le module
// d'export (pdf.ts, excel.ts, les routes app/api/admin/exports/*) : tout
// passe par les constantes ci-dessous.
//
// Sources : valeurs lues telles quelles dans le thème, jamais inventées :
//   DARK  = --bg-contrast   PROUVÉ app/globals.css:83  "sapin profond : FIGÉ jour=nuit"
//   GOLD  = --gold          PROUVÉ app/globals.css:72  "cuivre citron : accent unique 4 couleurs strictes"
//   CREAM = --bg (light)    PROUVÉ app/globals.css:63  "crème velin : fond principal jour"
//
// DARK est pris sur le token FIGÉ (invariant jour/nuit) plutôt que sur
// --ink (qui s'inverse en mode sombre) : un PDF statique n'a pas de
// bascule de thème, il lui faut une valeur qui ne dépend d'aucun mode.
//
// Deux nuances supplémentaires, ABSENTES du thème par conception : la
// palette est explicitement "4 couleurs strictes" (app/globals.css:5-11)
// : --gold-deep/--gold-bright/--gold-shine (globals.css:73-75) sont tous
// des alias EXACTS de --gold (aucune variation de doré n'existe), et
// --bg-soft/--bg-deep (globals.css:64-65) sont PLUS FONCÉS que --bg,
// jamais plus clairs. Dérivées ici, méthode documentée :
//
//   CREAM_VERY_LIGHT : mélange 50 % blanc / 50 % CREAM (#F0E6CC),
//     moyenne composante RGB par composante -> #F8F3E6.
//     Usage : fond des lignes alternées (jamais de texte dessus autre
//     que l'encre sombre standard).
//
//   GOLD_DARK : GOLD (#e0af6e) assombri à 50 % (chaque canal RGB × 0.5)
//     -> #705837. Usage : la SEULE écriture dorée sur fond clair
//     (libellés petites capitales des cartouches/sections/tableaux) ,
//     le doré de base est trop clair pour ce cas, cf. contrôle ci-dessous.
//
//   Contrôle de contraste (WCAG 2.x, ratio de luminance relative,
//   calcul exécuté localement avec node -e, cf. rapport de mission) :
//     #e0af6e (GOLD)       sur #F0E6CC (CREAM) -> ratio 1.61:1  (illisible, très en dessous du seuil AA 4.5:1)
//     #705837 (GOLD_DARK)  sur #F0E6CC (CREAM) -> ratio 5.41:1  (passe le seuil AA texte normal 4.5:1)
//   -> GOLD_DARK est utilisé partout où du texte doré doit rester lisible
//   sur un fond clair (crème ou crème très clair). GOLD (le doré clair)
//   reste réservé aux éléments sur fond sombre (bandeau) ou aux filets
//   (traits, pas de texte).
//
//   BORDER : dérivé de --line = rgba(31,34,26,0.14) PROUVÉ
//   app/globals.css:77, mélangé à 14 % sur blanc -> #E0E0DF. Usage :
//   bordure fine sous chaque cellule Excel.

export const DARK = "#1F221A";
export const GOLD = "#e0af6e";
export const CREAM = "#F0E6CC";
export const CREAM_VERY_LIGHT = "#F8F3E6";
export const GOLD_DARK = "#705837";
export const BORDER = "#E0E0DF";

/** Couleurs converties en ARGB hex (exceljs) : "FF" + RRGGBB sans "#". */
export function toArgb(hex: string): string {
  return `FF${hex.replace("#", "").toUpperCase()}`;
}
