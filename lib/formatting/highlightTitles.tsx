/**
 * highlightTitles — POL3-P1
 *
 * Détecte automatiquement les "titres internes" d'une description bien
 * (pattern `^Mot/groupe :` en début de ligne, ex. "Description :",
 * "Prestations :", "Surface totale brute :"…) et les wrappe en <strong>
 * non-italique. Le reste du paragraphe (s'il y en a après le `:`) reste
 * en corps normal. Les paragraphes sans titre sont rendus tels quels.
 *
 * Aucune italique. Aucune lettrine. Police héritée du wrapper (serif,
 * non-italique).
 *
 * Décision Julien : appliqué uniformément aux fiches /biens/[slug] et
 * /off-market/[id] (même composant PropertyMagazineDescription).
 */
import type { ReactNode } from "react";

// "<mot/groupe d'au plus 60 chars en lettres/espaces/apostrophes/tirets> :
//   (reste optionnel)". On accepte aussi l'apostrophe typographique U+2019.
const TITLE_REGEX = /^([A-Za-zÀ-ÿ'’\- ]{3,60})\s*:\s*(.*)$/;

export function highlightTitles(text: string | null | undefined): ReactNode {
  if (!text) return null;
  const paragraphs = text
    .split(/\n\s*\n|\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.map((para, i) => {
    const m = para.match(TITLE_REGEX);
    if (m) {
      const title = m[1].trim();
      const rest = m[2]?.trim();
      // Heuristique : titre seulement si <= 60 chars ET commence par
      // majuscule (sinon on évite de bolder une question, un bullet, etc.).
      if (title.length <= 60 && /^[A-ZÀ-Ý]/.test(title)) {
        return (
          <p key={i} className="mb-4">
            <strong className="font-serif font-medium not-italic">
              {title} :
            </strong>
            {rest ? <> {rest}</> : null}
          </p>
        );
      }
    }
    return (
      <p key={i} className="mb-4">
        {para}
      </p>
    );
  });
}
