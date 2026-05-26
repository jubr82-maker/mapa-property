/**
 * highlightTitles — POL3-P1-FIX + POL4-A4 (MARC)
 *
 * Deux modes selon le contenu entrant :
 *  1. HTML formaté (commence par `<`) — descriptions saisies via TipTap
 *     dans l'admin (off-market ELISE / Apimo CAMILLE). On sanitize
 *     strictement (whitelist p/strong/em/br) et on rend tel quel.
 *     Pas de re-détection de titres : l'admin a déjà mis en gras ce
 *     qu'il voulait via Cmd+B.
 *  2. Texte brut Apimo (legacy) — détecte les "titres internes"
 *     (pattern `^Mot/groupe :` en début de ligne) et les wrappe en
 *     <strong> font-semibold. Logique POL3-P1-FIX préservée intacte.
 *
 * Aucune police hardcodée ici : <strong>/<em> héritent de la police du
 * wrapper parent (PropertyMagazineDescription → Archivo sans-serif).
 */
import sanitizeHtml from "sanitize-html";
import type { ReactNode } from "react";

// "<mot/groupe d'au plus 60 chars en lettres/espaces/apostrophes/tirets> :
//   (reste optionnel)". Accepte l'apostrophe typographique U+2019.
const TITLE_REGEX = /^([A-Za-zÀ-ÿ'’\- ]{3,60})\s*:\s*(.*)$/;

export function highlightTitles(text: string | null | undefined): ReactNode {
  if (!text) return null;
  // POL4-A4 (MARC) : HTML formaté (TipTap) → sanitize strict, pas de
  // re-détection regex (l'admin a déjà mis en gras manuellement).
  // Sprint HTML-RENDERING C2 : whitelist elargie aux listes (ul/ol/li)
  // + tags alternatifs (b/i, alias de strong/em utilises par certains
  // editeurs WYSIWYG et par Apimo). Aucun attribut. Tout le reste stripe.
  if (text.trim().startsWith("<")) {
    const clean = sanitizeHtml(text, {
      allowedTags: ["p", "strong", "em", "b", "i", "br", "ul", "ol", "li"],
      allowedAttributes: {},
    });
    return <div dangerouslySetInnerHTML={{ __html: clean }} />;
  }
  // Texte brut Apimo (legacy) — logique POL3-P1-FIX préservée :
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
