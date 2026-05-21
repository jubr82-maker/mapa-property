"use client";

/**
 * STEP3c-1 — Hero pin scroll cinematique renforce.
 *
 * Wrapper outer height = divisor * 100vh, Hero interne position
 * sticky top:0 height:100vh → la section reste pin pendant que le
 * scroll consume `divisor` viewports avant de passer au reste.
 *
 *  - desktop-A      : 2.5 viewports (latence cinematique "3 scrolls")
 *  - tablet-A-light : 2.0 viewports
 *  - mobile-B       : 1.5 viewport (UX preservee petit ecran)
 *
 * Amplitudes amplifiees (STEP3c-1) :
 *  - Wrapper opacity   : 1.0 → 0.6 (vs 0.7 STEP3b)
 *  - Video scale       : 1.0 → 0.92 (vs 0.95 STEP3b)
 *  - Texte (STEP3c-1-bis) :
 *      Phase 0 → 1 viewport   : IMMOBILE (translateY 0) — latence ressentie
 *      Phase 1 → divisor*vp   : -(y-vp)*0.5 — texte colle a la video et
 *        sort avec elle sur la suite du pin
 *  - Wrapper translateY: pas appliquee en mode sticky (sticky gere
 *    le pin) ; appliquee -y*0.5 en mode non-sticky (mobile-B fallback)
 *
 * Sticky activée seulement apres mount + mode != mobile-B. Au premier
 * SSR/CSR render : Hero rendu sans sticky (defaut mobile-B). Apres
 * detect : styles inline applique → layout reflow minimal.
 * prefers-reduced-motion respecte (aucun effet).
 */

import { useEffect, useRef } from "react";
import { useDeviceMode } from "@/hooks/useDeviceMode";

export function HeroScrollContainer({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLElement>(null);
  const { mode, mounted } = useDeviceMode();

  const divisor =
    mode === "desktop-A" ? 2.5 : mode === "tablet-A-light" ? 2.0 : 1.5;
  const useSticky = mode === "desktop-A" || mode === "tablet-A-light";

  // Application des styles sticky apres mount pour eviter hydration
  // mismatch (SSR rend toujours sans sticky).
  useEffect(() => {
    if (!mounted) return;
    if (!outerRef.current || !wrapperRef.current) return;

    if (useSticky) {
      outerRef.current.style.height = `${divisor * 100}vh`;
      outerRef.current.style.position = "relative";
      wrapperRef.current.style.position = "sticky";
      wrapperRef.current.style.top = "0";
      wrapperRef.current.style.height = "100vh";
    } else {
      outerRef.current.style.height = "";
      outerRef.current.style.position = "";
      wrapperRef.current.style.position = "";
      wrapperRef.current.style.top = "";
      wrapperRef.current.style.height = "";
    }
  }, [mounted, useSticky, divisor]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!wrapperRef.current) return;

    const wrapper = wrapperRef.current;
    const videoEl = wrapper.querySelector<HTMLElement>("[data-hero-video]");
    const textEl = wrapper.querySelector<HTMLElement>("[data-hero-text]");

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
      const progress = Math.min(1, Math.max(0, y / (h * divisor)));

      // En mode sticky : pas de translateY sur wrapper (sticky pin gere).
      // En mode non-sticky : translateY classique parallax wrapper.
      if (useSticky) {
        wrapper.style.transform = "";
      } else {
        wrapper.style.transform = `translate3d(0, ${-y * 0.5}px, 0)`;
      }
      wrapper.style.opacity = String(1 - progress * 0.4);

      // STEP3c-1-bis : texte IMMOBILE pendant le 1er viewport (latence
      // ressentie), puis colle a la video (vitesse -0.5) au-dela.
      let textY = 0;
      if (y > h) {
        textY = -(y - h) * 0.5;
      }
      if (textEl) {
        textEl.style.transform = `translate3d(0, ${textY}px, 0)`;
      }
      if (videoEl) {
        videoEl.style.transform = `scale(${1 - progress * 0.08})`;
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
  }, [divisor, useSticky]);

  return (
    <div ref={outerRef}>
      <section ref={wrapperRef} className={className} style={style}>
        {children}
      </section>
    </div>
  );
}
