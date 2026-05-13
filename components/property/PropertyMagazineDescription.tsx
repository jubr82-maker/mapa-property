/**
 * PropertyMagazineDescription
 *
 * Rendu éditorial niveau Architectural Digest / Cabana / Sotheby's :
 *   - intro lead (lettrine copper sur la 1re lettre via CSS `.magazine-lead`)
 *   - sections h3/h4 + ul/ol structurées générées par le parser
 *   - conclusion optionnelle
 *
 * Server Component. Le HTML rendu est sécurisé (texte échappé côté parser,
 * balises générées par notre code uniquement).
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

  if (!data.html && !data.intro && data.chapters.length === 0) return null;

  return (
    <div className="magazine mx-auto max-w-[720px]">
      <div
        className="magazine-content"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: data.html }}
      />
    </div>
  );
}
