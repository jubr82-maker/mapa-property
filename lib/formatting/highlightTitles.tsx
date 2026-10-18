/**
 * highlightTitles : rendu des descriptions de biens et d'off-market.
 *
 * Oct. 2026 : un seul chemin pour le texte brut Apimo et le HTML de
 * l'editeur admin, via lib/listing/description-text.ts (intertitres,
 * paragraphes, listes a puces, gras, italique ; hashtags retires). Tout
 * est rendu comme du texte par React : aucun HTML de la base n'est injecte.
 * Le label "Mot/groupe :" en debut de paragraphe reste en gras (ancien
 * rendu POL3-P1-FIX).
 *
 * Aucune police ici : <strong>/<em> heritent du conteneur parent
 * (PropertyMagazineDescription, pitch off-market).
 */
import type { ReactNode } from "react";
import { descriptionBlocks, type Run } from "@/lib/listing/description-text";

function runs(list: Run[]): ReactNode {
  return list.map((r, i) => {
    let node: ReactNode = r.text;
    if (r.italic) node = <em>{node}</em>;
    if (r.bold) node = <strong className="font-semibold">{node}</strong>;
    return <span key={i}>{node}</span>;
  });
}

export function highlightTitles(text: string | null | undefined): ReactNode {
  const blocks = descriptionBlocks(text);
  if (!blocks.length) return null;
  return blocks.map((b, i) => {
    if (b.kind === "heading") {
      return (
        <h3 key={i} className="mb-2 font-semibold">
          {b.text}
        </h3>
      );
    }
    if (b.kind === "ul") {
      return (
        <ul key={i} className="mb-4 list-disc space-y-1 pl-5">
          {b.items.map((it, j) => (
            <li key={j}>{runs(it)}</li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="mb-4">
        {runs(b.runs)}
      </p>
    );
  });
}
