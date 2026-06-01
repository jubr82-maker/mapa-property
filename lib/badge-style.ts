/**
 * Système de badges commerciaux — mappings partagés.
 *
 * Extrait depuis components/property/PropertyCard.tsx pour réutilisation
 * sur les autres surfaces (FeaturedCarousel, etc.). Couleurs FIXES par
 * libellé, dérivées côté code, jamais stockées en DB. Texte BLANC sauf
 * Opportunité (cuivre -> sapin) et À découvrir (sapin -> cuivre + filet
 * cuivre 1px). Tokens --badge-* définis dans app/globals.css.
 *
 * Allowlist serveur : app/admin/properties/actions.ts BADGE_LABELS /
 * BADGE_SIZES / BADGE_POSITIONS — toute valeur hors liste -> null avant
 * écriture DB.
 */

export type BadgeStyle = {
  backgroundColor: string;
  color: string;
  border?: string;
};

export const BADGE_STYLE_MAP: Record<string, BadgeStyle> = {
  Exclusivité: { backgroundColor: "var(--badge-exclu)", color: "#FFFFFF" },
  Nouveau: { backgroundColor: "var(--badge-nouveau)", color: "#FFFFFF" },
  "Nouveau prix": {
    backgroundColor: "var(--badge-nouveau-prix)",
    color: "#FFFFFF",
  },
  Opportunité: {
    backgroundColor: "var(--badge-opportunite)",
    color: "#1F221A",
  },
  Investissement: {
    backgroundColor: "var(--badge-investment)",
    color: "#FFFFFF",
  },
  "À découvrir": {
    backgroundColor: "var(--badge-discover)",
    color: "#e0af6e",
    border: "1px solid #e0af6e",
  },
};

export const BADGE_SIZE_CLASS: Record<string, string> = {
  S: "px-2 py-0.5 text-[9px] tracking-[0.15em]",
  M: "px-3 py-1 text-[10px] tracking-[0.2em]",
  L: "px-4 py-1.5 text-[12px] tracking-[0.22em]",
};

export const BADGE_POSITION_CLASS: Record<string, string> = {
  "top-left": "left-3 top-3",
  "top-right": "right-3 top-3",
  "bottom-left": "left-3 bottom-3",
  "bottom-right": "right-3 bottom-3",
};

/**
 * Résout les classes + style inline d'un badge depuis ses 3 attributs DB.
 * Retourne null si le libellé n'est pas dans l'allowlist (rendu rien).
 * Défauts : size=M, position=top-left si valeurs absentes.
 */
export function resolveBadgeStyles(
  badge: string | null | undefined,
  size: string | null | undefined,
  position: string | null | undefined,
): {
  inlineStyle: BadgeStyle;
  sizeClass: string;
  positionClass: string;
} | null {
  if (!badge) return null;
  const inlineStyle = BADGE_STYLE_MAP[badge];
  if (!inlineStyle) return null;
  return {
    inlineStyle,
    sizeClass: BADGE_SIZE_CLASS[size ?? "M"] ?? BADGE_SIZE_CLASS.M,
    positionClass:
      BADGE_POSITION_CLASS[position ?? "top-left"] ??
      BADGE_POSITION_CLASS["top-left"],
  };
}
