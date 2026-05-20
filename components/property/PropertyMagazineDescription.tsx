/**
 * PropertyMagazineDescription — POL3-P1-FIX
 *
 * Rendu UNIFORME des descriptions biens (utilisé sur /biens/[slug] ET
 * /off-market/[id]). Revert du wrapper font-serif Georgia + max-w-[720px]
 * + centre introduit par c381a78 (cassait le rendu) — retour à la base
 * correcte qui existait sur la prod Vercel :
 *   - Police : héritée du body (Archivo sans-serif).
 *   - Alignement : gauche.
 *   - Largeur : full (hérite du parent conteneur de la fiche, AUCUN
 *     max-width custom ici).
 *   - Style : normal (pas d'italique, pas de lettrine).
 *   - Titres internes détectés par highlightTitles wrappés en <strong>
 *     font-semibold (héritage police via le wrapper).
 *
 * Server Component. La prop `parsed` reste acceptée pour rétro-compat
 * (biens/[slug] la passe encore via parseApimoDescription) mais ignorée.
 */
import { highlightTitles } from "@/lib/formatting/highlightTitles";

interface Props {
  description?: string | null;
  /** Rétro-compat — ignoré depuis POL3-P1. */
  parsed?: unknown;
}

export function PropertyMagazineDescription({ description }: Props) {
  if (!description || !description.trim()) return null;
  return (
    <div className="w-full text-left text-[16px] leading-[1.7] not-italic">
      {highlightTitles(description)}
    </div>
  );
}
