interface SignatureLineProps {
  /** Alignement horizontal. `left` par défaut ; `center` pour contextes centrés. */
  align?: "left" | "center";
  /** `default` = 2px de haut ; `thin` = 1px (variante discrète). */
  variant?: "default" | "thin";
  /** Largeur (utilitaire Tailwind). `w-12` (48px) par défaut, configurable. */
  width?: string;
  className?: string;
}

/**
 * SignatureLine — filet copper signature MAPA.
 *
 * Élément graphique transversal de l'identité MAPA (cf.
 * docs/design-system/SIGNATURE_MAPA.md). Utilise le token `--copper`
 * (bg-copper) : couleur FIXE, identique jour/nuit, jamais inversée.
 * Purement décoratif → aria-hidden. Aucune string UI, aucun hex en dur.
 *
 * Réservé aux H1/H2 majeurs. PAS sur les H3/H4 ni les eyebrows.
 */
export function SignatureLine({
  align = "left",
  variant = "default",
  width = "w-12",
  className = "",
}: SignatureLineProps) {
  return (
    <span
      aria-hidden="true"
      className={[
        "block bg-copper mt-4 mb-6",
        variant === "thin" ? "h-px" : "h-0.5",
        width,
        align === "center" ? "mx-auto" : "mx-0",
        className,
      ].join(" ")}
    />
  );
}
