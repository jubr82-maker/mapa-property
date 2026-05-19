"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Amplitude du décalage parallax (fraction de la distance au centre). */
  intensity?: number;
  className?: string;
}

/**
 * Parallax vertical DESKTOP ONLY (translateY proportionnel à la distance
 * au centre du viewport). Désactivé si prefers-reduced-motion: reduce ou
 * largeur < 768px. Passive scroll + requestAnimationFrame.
 * POL3-7 — AUCUN zoom / Ken Burns (refusé Julien).
 */
export function ParallaxImage({
  children,
  intensity = 0.08,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isMobile = window.innerWidth < 768;
    if (prefersReduced || isMobile) return;

    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            const center = rect.top + rect.height / 2;
            const viewportCenter = window.innerHeight / 2;
            const distance = center - viewportCenter;
            setOffset(distance * intensity);
          }
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [intensity]);

  return (
    <div ref={ref} className={`overflow-hidden ${className}`}>
      <div
        className="h-full"
        style={{
          transform: `translateY(${offset}px)`,
          transition: "transform 100ms linear",
        }}
      >
        {children}
      </div>
    </div>
  );
}
