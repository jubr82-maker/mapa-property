"use client";

/**
 * STEP3c-FIX2 — Featured horizontal pin scroll Apple Pro (refonte compacte).
 *
 * Mode 'desktop-A' (>=1280px + pointer fine + !touch) :
 *   - Header (titre + signature + subtitle) RENDU DANS le sticky wrapper
 *     pour eliminer le vide entre titre et cards (avant : header hors
 *     sticky → 1 viewport vide pendant le pin)
 *   - Wrapper outer height = max(2.5, cardsCount * 0.4 + 0.5) viewports
 *     (avant : *0.6+1 = trop long). 6 cards → 2.9vp (vs 4.6vp avant)
 *   - Section sticky top:0 height:100vh, flex column :
 *       [header flex-shrink:0 padding 64/32]
 *       [track horizontal flex:1 align-items:center]
 *   - Au scroll vertical : translateX du track de 0 → -(trackWidth - vpWidth)
 *   - Zoom dynamique cards : centrale 1.0/1.0, next/prev preview 0.6/0.9,
 *     lointaine 0.2/0.8 (3 zones via normalizedDistance)
 *   - Bouton [data-featured-cta] highlight dans le dernier 15%
 *
 * Mode 'tablet-A-light' / 'mobile-B' / pre-mount :
 *   - Header rendu avant le wrapper mobile (flow normal)
 *   - Track .featured-mobile-wrapper (overflow-x + scroll-snap CSS)
 *   - Cards reset opacity/transform (depuis style initial JSX)
 */

import { useEffect, useRef, useState } from "react";
import { useDeviceMode } from "@/hooks/useDeviceMode";

export function FeaturedPinScroll({
  children,
  cardsCount,
  header,
}: {
  children: React.ReactNode;
  cardsCount: number;
  header?: React.ReactNode;
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
      // Mobile / tablet : reset opacity/transform sur les cards (les
      // styles inline initiaux JSX opacity 0.2 / scale 0.8 disparaissent)
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

    // STEP3c-FIX2 : etat initial cards desktop — opacity 0.2 scale 0.8
    // (deja en JSX inline, on re-confirme + ajoute transition pour le
    // tick raf suivant).
    const initialCards = trackRef.current.querySelectorAll<HTMLElement>(
      "[data-featured-card]",
    );
    initialCards.forEach((card) => {
      card.style.opacity = "0.2";
      card.style.transform = "scale(0.8)";
      card.style.transition =
        "transform 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.4s cubic-bezier(0.22,1,0.36,1)";
      card.style.willChange = "transform, opacity";
    });

    // STEP3c-FIX2 : hauteur compactee — cards*0.4 + 0.5 (vs cards*0.6 + 1).
    const viewportsNeeded = Math.max(2.5, cardsCount * 0.4 + 0.5);
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

      // STEP3c-FIX2 : zoom dynamique 3 zones (centrale / next-prev / loin)
      // pour avoir une preview visible des cards adjacentes au lieu d'un
      // dropoff lineaire trop subtil.
      const viewportCenter = viewportWidth / 2;
      const halfVp = viewportWidth / 2;
      const cards = track.querySelectorAll<HTMLElement>(
        "[data-featured-card]",
      );
      cards.forEach((card) => {
        const cardRect = card.getBoundingClientRect();
        const cardCenter = cardRect.left + cardRect.width / 2;
        const normalized = Math.min(
          1,
          Math.abs(cardCenter - viewportCenter) / halfVp,
        );

        let scale: number;
        let opacity: number;
        if (normalized < 0.2) {
          // Card sous le centre : focus complet
          scale = 1.0;
          opacity = 1.0;
        } else if (normalized < 0.7) {
          // Card next/prev : preview visible (interpolation lineaire)
          const t = (normalized - 0.2) / 0.5; // 0 → 1
          scale = 0.9 - t * 0.1; // 0.9 → 0.8
          opacity = 0.6 - t * 0.4; // 0.6 → 0.2
        } else {
          // Card lointaine : tres translucide
          scale = 0.8;
          opacity = 0.2;
        }
        card.style.transform = `scale(${scale})`;
        card.style.opacity = String(opacity);
      });

      // STEP3c-2 : bouton highlight dans le dernier 15% du scroll
      const buttonEl = track.querySelector<HTMLElement>("[data-featured-cta]");
      if (buttonEl) {
        const buttonProgress = Math.max(
          0,
          Math.min(1, (progress - 0.85) / 0.15),
        );
        const buttonScale = 1 + buttonProgress * 0.4;
        const buttonOpacity = 0.7 + buttonProgress * 0.3;
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

  // Pre-mount OU tablet/mobile : header (si fourni) en flow normal,
  // puis wrapper swipe natif.
  if (!mounted || mode !== "desktop-A") {
    return (
      <>
        {header}
        <div className="featured-mobile-wrapper">
          <div className="featured-track-mobile" ref={trackRef}>
            {children}
          </div>
        </div>
      </>
    );
  }

  // Desktop-A : sticky flex column avec header en haut + track centre
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
          flexDirection: "column",
        }}
      >
        {header && (
          <div style={{ flexShrink: 0, padding: "64px 8vw 32px" }}>
            {header}
          </div>
        )}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            overflow: "hidden",
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
    </div>
  );
}
