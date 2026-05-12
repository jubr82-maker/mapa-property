/**
 * PropertyMagazineDescription
 *
 * Rendu éditorial niveau Architectural Digest / Cabana / Sotheby's :
 *   - intro en italique font-display avec lettrine copper sur la 1re lettre
 *   - chapitres structurés (titre tracking étendu, filet copper, corps justifié)
 *   - conclusion optionnelle en small caps
 *
 * Server Component (aucun hook). Reçoit soit le texte brut, soit une
 * `parsed: ParsedDescription` déjà calculée en amont (recommandé pour partager
 * le parsing avec d'autres composants ou la SEO).
 *
 * Les classes utilitaires `.magazine-*` sont définies dans app/globals.css.
 */
import {
  parseApimoDescription,
  type ParsedDescription,
} from "@/lib/property-description-parser";

interface Props {
  description: string;
  parsed?: ParsedDescription;
}

export function PropertyMagazineDescription({ description, parsed }: Props) {
  const data: ParsedDescription = parsed ?? parseApimoDescription(description);

  if (!data.intro && data.chapters.length === 0) return null;

  return (
    <div className="magazine mx-auto max-w-[720px]">
      {data.intro && (
        <div className="magazine-intro">
          {data.intro.split(/\n\s*\n/).map((para, i) => (
            <p
              key={`intro-${i}`}
              className={i === 0 ? "magazine-lead" : "magazine-lead-cont"}
            >
              {para}
            </p>
          ))}
        </div>
      )}

      {data.chapters.length > 0 && (
        <div className="magazine-chapters">
          {data.chapters.map((c, i) => (
            <section key={`ch-${i}`} className="magazine-chapter">
              <h3 className="magazine-h2">
                <span aria-hidden className="magazine-h2-rule" />
                <span className="magazine-h2-text">{c.title}</span>
              </h3>
              {c.body.split(/\n\s*\n/).map((para, j) => (
                <p key={`p-${j}`} className="magazine-body">
                  {para}
                </p>
              ))}
            </section>
          ))}
        </div>
      )}

      {data.conclusion && (
        <p className="magazine-conclusion">{data.conclusion}</p>
      )}
    </div>
  );
}
