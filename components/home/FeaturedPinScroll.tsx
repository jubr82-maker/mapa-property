"use client";

/**
 * STEP3c-2 — Featured pin scroll horizontal style Apple Pro.
 *
 * Mode 'desktop-A' (>=1280px + pointer fine + !touch) :
 *   - Wrapper outer height = ~(cardsCount * 0.6 + 1) viewports, min 2.5
 *   - Section sticky top:0 height:100vh contient un track horizontal
 *   - Au scroll vertical : translateX du track de 0 → -(trackWidth - viewportWidth)
 *   - Dans le dernier 15% du scroll : le bouton [data-featured-cta] grossit
 *     (scale 1.0 → 1.4) + halo box-shadow lime mur #CFE542 intensifie
 *
 * Mode 'tablet-A-light' / 'mobile-B' :
 *   - Pas de pin scroll, rendu direct dans .featured-mobile-wrapper
 *     (overflow-x:auto + scroll-snap CSS — defini globals.css)
 *   - Swipe natif touch, bouton CTA visible a la fin du track
 *
 * Pre-mount (SSR/CSR initial) : rendu mobile-safe (overflow-x), evite
 * hydration mismatch en attendant detect. prefers-reduced-motion :
 * pas d'effet pin (rendu mobile fallback).
 */

import { useEffect, useRef, useState } from "react";
import { useDeviceMode } from "@/hooks/useDeviceMode";

export function FeaturedPinScroll({
  children,
  cardsCount,
}: {
  children: React.ReactNode;
  cardsCount: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { mode, mounted } = useDeviceMode();
  const [pinHeight, setPinHeight] = useState<string>("100vh");

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (mode !== "desktop-A") {
      // Mobile / tablet : reset eventuel transform si on a switche depuis desktop
      if (trackRef.current) trackRef.current.style.transform = "";
      return;
    }
    if (!wrapperRef.current || !trackRef.current) return;

    // ~0.6 viewport de scroll par carte + 1 viewport reserve pour
    // l'apogee du bouton highlight, minimum 2.5 vp.
    const viewportsNeeded = Math.max(2.5, cardsCount * 0.6 + 1);
    setPinHeight(`${viewportsNeeded * 100}vh`);

    const wrapper = wrapperRef.current;
    const track = trackRef.current;
    track.style.willChange = "transform";

    let raf = 0;
    let lastY = Number.NaN;

    const tick = () => {
      const rect = wrapper.getBoundingClientRect();
      const y = -rect.top;
      const totalScroll = wrapper.offsetHeight - window.innerHeight;

      if (y === lastY) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      lastY = y;

      let progress = 0;
      if (y > 0 && totalScroll > 0) {
        progress = Math.min(1, Math.max(0, y / totalScroll));
      }

      const trackWidth = track.scrollWidth;
      const viewportWidth = window.innerWidth;
      const maxTranslate = Math.max(0, trackWidth - viewportWidth);
      const translateX = -progress * maxTranslate;
      track.style.transform = `translate3d(${translateX}px, 0, 0)`;
      track.dataset.scrollProgress = String(progress);

      // STEP3c-2 : bouton highlight dans le dernier 15% du scroll
      const buttonEl = track.querySelector<HTMLElement>("[data-featured-cta]");
      if (buttonEl) {
        const buttonProgress = Math.max(
          0,
          Math.min(1, (progress - 0.85) / 0.15),
        );
        const buttonScale = 1 + buttonProgress * 0.4; // 1.0 → 1.4
        const buttonOpacity = 0.7 + buttonProgress * 0.3; // 0.7 → 1.0
        buttonEl.style.transform = `scale(${buttonScale})`;
        buttonEl.style.opacity = String(buttonOpacity);
        buttonEl.style.boxShadow =
          buttonProgress > 0
            ? `0 0 ${30 + buttonProgress * 40}px rgba(207, 229, 66, ${0.3 + buttonProgress * 0.5})`
            : "none";
      }

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      track.style.willChange = "";
    };
  }, [mode, mounted, cardsCount]);

  // Pre-mount OU tablet/mobile : rendu swipe natif (overflow-x).
  if (!mounted || mode !== "desktop-A") {
    return (
      <div className="featured-mobile-wrapper">
        <div className="featured-track-mobile" ref={trackRef}>
          {children}
        </div>
      </div>
    );
  }

  // Desktop-A : pin scroll horizontal
  return (
    <div ref={wrapperRef} style={{ height: pinHeight, position: "relative" }}>
      <div
        ref={stickyRef}
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          ref={trackRef}
          style={{
            display: "flex",
            gap: "32px",
            paddingLeft: "8vw",
            paddingRight: "8vw",
            willChange: "transform",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
