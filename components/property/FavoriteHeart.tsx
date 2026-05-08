"use client";

import { useFavorites } from "@/lib/use-favorites";

interface Props {
  propertyId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
} as const;

const iconSizes = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
} as const;

export function FavoriteHeart({ propertyId, size = "md", className = "" }: Props) {
  const { has, toggle, hydrated } = useFavorites();
  const active = hydrated && has(propertyId);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(propertyId);
      }}
      aria-pressed={active}
      aria-label={active ? "Retirer des favoris" : "Ajouter aux favoris"}
      className={`inline-flex ${sizes[size]} items-center justify-center rounded-full border backdrop-blur transition-all ${
        active
          ? "border-gold bg-gold/10 text-gold-deep"
          : "border-line bg-bg/80 text-ink-mid hover:border-gold hover:text-gold"
      } ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className={`${iconSizes[size]} transition-transform ${active ? "scale-110" : ""}`}
        fill={active ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={active ? "0" : "1.6"}
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 20.5s-7-4.4-7-10.2A4.3 4.3 0 0 1 9.3 6c1.6 0 2.7.9 2.7.9s1.1-.9 2.7-.9A4.3 4.3 0 0 1 19 10.3c0 5.8-7 10.2-7 10.2Z" />
      </svg>
    </button>
  );
}
