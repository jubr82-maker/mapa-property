"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Délai d'entrée en ms (stagger sur les listes). */
  delay?: number;
  className?: string;
  /** Durée transition en ms (default 700ms, même easing que FadeInOnScroll). */
  duration?: number;
}

/**
 * Variante "safe" de FadeInOnScroll : fade-in en OPACITY SEULE.
 *
 * AUCUN `transform`, AUCUN `scale`, AUCUN `translate3d`. Le wrapper de
 * fade-in standard (FadeInOnScroll) applique `transform: translate3d(...)
 * scale(...)` même en état final "visible", ce qui crée un containing
 * block et CASSE `position: sticky` sur les descendants (référence :
 * spec CSS Transforms, sticky pin par rapport à l'ancêtre transformé
 * et non au viewport).
 *
 * Ce wrapper utilise uniquement la transition `opacity`, n'établit aucun
 * containing block, et préserve donc le sticky/pin des descendants.
 *
 * IntersectionObserver one-shot (idem FadeInOnScroll). Désactivé si
 * `prefers-reduced-motion: reduce` → contenu visible immédiat.
 */
export function FadeInOnScrollSafe({
  children,
  delay = 0,
  className = "",
  duration = 700,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" },
    );
    const el = ref.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
        transitionProperty: "opacity",
        opacity: visible ? 1 : 0,
        willChange: visible ? "auto" : "opacity",
      }}
      className={className}
    >
      {children}
    </div>
  );
}
