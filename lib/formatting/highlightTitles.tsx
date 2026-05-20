/**
 * highlightTitles — POL3-P1-FIX
 *
 * Détecte les "titres internes" d'une description bien (pattern
 * `^Mot/groupe :` en début de ligne) et les wrappe en <strong>
 * font-semibold. Le reste du paragraphe (après le `:`) reste en corps
 * normal. Les paragraphes sans titre sont rendus tels quels.
 *
 * Aucune police hardcodée ici : <strong> hérite de la police du wrapper
 * parent (PropertyMagazineDescription → Archivo sans-serif via le body).
 */
import type { ReactNode } from "react";

// "<mot/groupe d'au plus 60 chars en lettres/espaces/apostrophes/tirets> :
//   (reste optionnel)". Accepte l'apostrophe typographique U+2019.
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
      if (title.length <= 60 && /^[A-ZÀ-Ý]/.test(title)) {
        return (
          <p key={i} className="mb-4">
            <strong className="font-semibold">{title} :</strong>
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
