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
 *   - STEP3c-2-bis : chaque [data-featured-card] calcule sa distance au
 *     centre du viewport et adapte scale/opacity en temps reel — la
 *     card centrale est en focus (scale 1.0, opacity 1.0), les voisines
 *     sont legerement reduites et translucides (scale 0.85, opacity 0.5
 *     a 1 viewport de distance)
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
      if (trackRef.current) {
        trackRef.current.style.transform = "";
        const cards = trackRef.current.querySelectorAll<HTMLElement>(
          "[data-featured-card]",
        );
        cards.forEach((card) => {
          card.style.opacity = "";
          card.style.transform = "";
          card.style.transition = "";
        });
      }
      return;
    }
    if (!wrapperRef.current || !trackRef.current) return;

    // STEP3c-2-bis : etat initial des cards en mode desktop-A — transparence
    // visible (opacity 0.3, scale 0.85). Le premier tick raf calculera la
    // position reelle (proche/loin du centre viewport) et ajustera.
    const initialCards = trackRef.current.querySelectorAll<HTMLElement>(
      "[data-featured-card]",
    );
    initialCards.forEach((card) => {
      card.style.opacity = "0.3";
      card.style.transform = "scale(0.85)";
      card.style.transition =
        "transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.4s cubic-bezier(0.22,1,0.36,1)";
      card.style.willChange = "transform, opacity";
    });

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

      // STEP3c-2-bis : chaque card → distance au centre viewport →
      // scale/opacity dynamique. La card sous le centre est en focus.
      const viewportCenter = viewportWidth / 2;
      const cards = track.querySelectorAll<HTMLElement>(
        "[data-featured-card]",
      );
      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(cardCenter - viewportCenter);
        const normalizedDistance = Math.min(1, distance / viewportCenter);
        const cardScale = 1.0 - normalizedDistance * 0.15;
        const cardOpacity = Math.max(0.3, 1.0 - normalizedDistance * 0.5);
        card.style.transform = `scale(${cardScale})`;
        card.style.opacity = String(cardOpacity);
      });

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
