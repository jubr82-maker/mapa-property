"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Délai d'entrée en ms (stagger sur les listes). */
  delay?: number;
  className?: string;
  /** STEP3b : translateY initial en px (defaut 16). */
  y?: number;
  /** STEP3b : scale initial (defaut 1 = pas de scale). */
  scale?: number;
  /** STEP3c-1 : duree transition en ms (defaut 1200 — ralenti cinematique). */
  duration?: number;
}

/**
 * Fade-in + translateY/scale au scroll (IntersectionObserver, one-shot).
 * Désactivé si prefers-reduced-motion: reduce (contenu visible immédiat).
 * POL3-7 — animations UI globales. STEP3b : enrichi y/scale/duration.
 */
export function FadeInOnScroll({
  children,
  delay = 0,
  className = "",
  y = 16,
  scale = 1,
  duration = 1200,
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

  const initialTransform =
    scale !== 1
      ? `translate3d(0, ${y}px, 0) scale(${scale})`
      : `translate3d(0, ${y}px, 0)`;
  const finalTransform = "translate3d(0, 0, 0) scale(1)";

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`,
        transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
        transitionProperty: "opacity, transform",
        opacity: visible ? 1 : 0,
        transform: visible ? finalTransform : initialTransform,
        willChange: visible ? "auto" : "opacity, transform",
      }}
      className={className}
    >
      {children}
    </div>
  );
}
