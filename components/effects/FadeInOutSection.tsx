"use client";

/**
 * FadeInOutSection — POL3-7a (AGENT ANTOINE)
 *
 * Wrapper opacity dynamique BIDIRECTIONNEL (in ET out au scroll) — diffère
 * de FadeInOnScroll (POL3-7 sage one-shot in seulement). Calcule l'opacité
 * depuis intersectionRatio : section centrée viewport = pleine opacité
 * (1.0), section en bordure haute/basse = opacité réduite (0.3).
 * Transition CSS opacity 500 ms ease-out pour smoother le pas du callback IO.
 *
 * Cohabite avec FadeInOnScroll existant (double-wrap autour autorisé par
 * le brief Julien — fade-in first-shot puis modulation continue).
 *
 * prefers-reduced-motion → opacity figée à 1.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

export function FadeInOutSection({ children, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // Start at 1 to avoid invisible flash for SSR / first paint.
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      setOpacity(1);
      return;
    }
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const r = Math.min(1, Math.max(0, entry.intersectionRatio));
        // Map ratio [0..1] → opacity [0.3..1.0] (jamais totalement invisible
        // pour préserver la lisibilité — c'est une respiration, pas un masque).
        setOpacity(0.3 + r * 0.7);
      },
      { threshold: [0, 0.1, 0.3, 0.5, 0.7, 0.9, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-opacity duration-500 ease-out ${className}`}
      style={{ opacity }}
    >
      {children}
    </div>
  );
}
