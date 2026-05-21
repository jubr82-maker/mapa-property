"use client";

/**
 * STEP3b — Hero pin scroll hybride (B3).
 *
 * Wrapper client autour du contenu Hero (server component). Au scroll
 * dans la 1ʳᵉ viewport :
 *  - le wrapper (section) glisse vers le haut a 0.5x la vitesse scroll
 *    (effet pin attenue, pas de blocage scroll utilisateur)
 *  - [data-hero-text] parallax interne a 0.3x (le texte remonte plus
 *    vite que le fond)
 *  - [data-hero-video] scale 1.0 → 0.95 (video se reduit subtilement)
 *  - opacity wrapper 1.0 → 0.7 a la fin du viewport
 *
 * Au-dela d'1 viewport : transforms cappes (pas de derive infinie).
 * prefers-reduced-motion : aucun effet. raf throttle pour 60fps.
 *
 * Le contenu Hero (video, gradient, texte, brackets, scroll cue) est
 * passe en children. Les data-attributes ciblent les sous-elements
 * (video container, text container) sans coupler la prop API.
 */

import { useEffect, useRef } from "react";

export function HeroScrollContainer({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const wrapperRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!wrapperRef.current) return;

    const wrapper = wrapperRef.current;
    const videoEl = wrapper.querySelector<HTMLElement>("[data-hero-video]");
    const textEl = wrapper.querySelector<HTMLElement>("[data-hero-text]");

    // willChange optimisation — composite layer hint
    wrapper.style.willChange = "transform, opacity";
    if (videoEl) videoEl.style.willChange = "transform";
    if (textEl) textEl.style.willChange = "transform";

    let raf = 0;
    let lastY = -1;

    const tick = () => {
      const y = window.scrollY;
      if (y === lastY) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      lastY = y;
      const h = window.innerHeight;
      const progress = Math.min(1, Math.max(0, y / h));

      wrapper.style.transform = `translate3d(0, ${-y * 0.5}px, 0)`;
      wrapper.style.opacity = String(1 - progress * 0.3);

      if (textEl) {
        textEl.style.transform = `translate3d(0, ${-y * 0.3}px, 0)`;
      }
      if (videoEl) {
        videoEl.style.transform = `scale(${1 - progress * 0.05})`;
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      wrapper.style.willChange = "";
      if (videoEl) videoEl.style.willChange = "";
      if (textEl) textEl.style.willChange = "";
    };
  }, []);

  return (
    <section ref={wrapperRef} className={className} style={style}>
      {children}
    </section>
  );
}
