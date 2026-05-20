/**
 * PropertyMagazineDescription — POL3-P1
 *
 * Rendu UNIFORME des descriptions biens (utilisé sur /biens/[slug] ET
 * /off-market/[id] — décision Julien : « format identique partout »).
 *
 * Règles validées Julien (20/05/2026) :
 *   - Corps : serif droit (non-italique), couleur ink, taille 17px,
 *     leading 1.7, aligné à gauche.
 *   - Lettrine décorative : SUPPRIMÉE (anciennement `::first-letter` via
 *     `.magazine-lead` / `.magazine-content`).
 *   - Italique : INTERDITE (corps + titres).
 *   - Titres internes : détectés par pattern `^Mot :` et wrappés en
 *     <strong> serif medium non-italique (cf. lib/formatting/highlightTitles).
 *
 * La prop `parsed` reste acceptée pour rétro-compat (biens/[slug]
 * l'utilise déjà via parseApimoDescription pour l'overview teaser et le
 * check hasDescription), mais elle est désormais ignorée ici : on rend
 * toujours le texte brut via highlightTitles.
 *
 * Server Component. Pas de dangerouslySetInnerHTML, pas de classes
 * `.magazine-*` (rendu HTML structuré abandonné — uniformité prime sur
 * la richesse éditoriale).
 */
import { highlightTitles } from "@/lib/formatting/highlightTitles";
import type { ParsedDescription } from "@/lib/property-description-parser";

interface Props {
  description: string;
  /** Rétro-compat — ignoré depuis POL3-P1. */
  parsed?: ParsedDescription;
}

export function PropertyMagazineDescription({ description }: Props) {
  if (!description || !description.trim()) return null;
  return (
    <div className="mx-auto max-w-[720px] font-serif text-[17px] not-italic leading-[1.7] text-ink text-left">
      {highlightTitles(description)}
    </div>
  );
}
