"use client";

import { useEffect, useRef } from "react";

/**
 * STEP3b — Hook reusable fade-in au scroll avec IntersectionObserver.
 *
 * Applique opacity 0 + translateY/scale au mount, transitionne vers
 * 1/0/1 quand l'element entre dans le viewport. One-shot (unobserve
 * apres trigger). prefers-reduced-motion respecte (skip animation,
 * affiche immediat).
 *
 * - delay (s) : retard apres entree viewport — utile pour stagger
 * - duration (s) : duree transition opacity + transform
 * - y (px) : amplitude translateY initiale (defaut 30)
 * - scale : facteur initial (1 = pas de scale, 0.95 = grossit a 1)
 * - threshold : ratio IntersectionObserver
 *
 * Note : co-existe avec FadeInOnScroll (composant wrapper). Choisir
 * le hook pour controle fin (ex: ref direct sur composant Embla,
 * GSAP, autre lib qui possede deja un wrapper).
 */

type Options = {
  delay?: number;
  duration?: number;
  y?: number;
  scale?: number;
  threshold?: number;
};

export function useScrollFadeIn<T extends HTMLElement = HTMLDivElement>(
  options?: Options,
) {
  const ref = useRef<T>(null);
  const {
    delay = 0,
    duration = 0.8,
    y = 30,
    scale = 1,
    threshold = 0.15,
  } = options ?? {};

  useEffect(() => {
    if (!ref.current) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ref.current.style.opacity = "1";
      ref.current.style.transform = "none";
      return;
    }

    const el = ref.current;
    const initialTransform =
      scale !== 1
        ? `translate3d(0, ${y}px, 0) scale(${scale})`
        : `translate3d(0, ${y}px, 0)`;
    el.style.opacity = "0";
    el.style.transform = initialTransform;
    el.style.transition = `opacity ${duration}s cubic-bezier(0.22,1,0.36,1), transform ${duration}s cubic-bezier(0.22,1,0.36,1)`;
    el.style.willChange = "opacity, transform";

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          window.setTimeout(() => {
            if (!ref.current) return;
            ref.current.style.opacity = "1";
            ref.current.style.transform = "translate3d(0,0,0) scale(1)";
          }, delay * 1000);
          observer.unobserve(entry.target);
        });
      },
      { threshold, rootMargin: "0px 0px -50px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, duration, y, scale, threshold]);

  return ref;
}
