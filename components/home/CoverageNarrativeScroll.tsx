"use client";

/**
 * STEP3c-FIX2 — Coverage narratif card par card avec flip 3D + pin scroll
 * (refonte compacte).
 *
 * Mode 'desktop-A' :
 *   - Header (titre + signature + subtitle) RENDU DANS le sticky wrapper
 *     pour eliminer le vide entre titre et cards (avant : header hors
 *     sticky → 1 viewport vide pendant le pin)
 *   - Wrapper outer height = max(2, cardsCount * 0.5) viewports — 4
 *     cards → 2vp (vs 6vp avant). Defilement nettement plus rapide.
 *   - Section sticky top:0 height:100vh, flex column :
 *       [header flex-shrink:0 padding 64/32]
 *       [grid flex:1 centre vertical, width:100% pour preserver grid-cols-N]
 *   - Chaque card [data-coverage-card] revele dans son segment de progress
 *     avec PRELOAD : la card N+1 commence a apparaitre en transparence
 *     legere dans les 10% qui precedent son segment, evite l'effet 'pop'
 *
 * Mode 'tablet-A-light' / 'mobile-B' / pre-mount :
 *   - Header avant les children (fragment), pas de pin
 *   - Cards conservent FadeInOnScroll wrap externe (STEP3b stagger 300ms)
 *
 * prefers-reduced-motion : passthrough.
 */

import { useEffect, useRef, useState } from "react";
import { useDeviceMode } from "@/hooks/useDeviceMode";

export function CoverageNarrativeScroll({
  children,
  cardsCount = 4,
  header,
}: {
  children: React.ReactNode;
  cardsCount?: number;
  header?: React.ReactNode;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const { mode, mounted } = useDeviceMode();
  const [pinHeight, setPinHeight] = useState<string>("100vh");

  useEffect(() => {
    if (!mounted) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (mode !== "desktop-A") return;
    if (!wrapperRef.current || !stickyRef.current) return;

    // STEP3c-FIX2 : 0.5 viewport par card (vs 1.5 avant), minimum 2 vp
    const viewportsNeeded = Math.max(2, cardsCount * 0.5);
    setPinHeight(`${viewportsNeeded * 100}vh`);

    const wrapper = wrapperRef.current;
    const sticky = stickyRef.current;

    // Etat initial des cards : invisibles + flip latéral
    const initialCards = sticky.querySelectorAll<HTMLElement>(
      "[data-coverage-card]",
    );
    initialCards.forEach((card) => {
      card.style.opacity = "0";
      card.style.transform =
        "perspective(1000px) rotateY(-90deg) scale(0.9)";
      card.style.transition = "none";
      card.style.willChange = "opacity, transform";
    });

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

      const cards = sticky.querySelectorAll<HTMLElement>(
        "[data-coverage-card]",
      );
      cards.forEach((card, index) => {
        const segmentStart = index / cardsCount;
        const segmentEnd = (index + 1) / cardsCount;
        const segmentMid = (segmentStart + segmentEnd) / 2;
        // STEP3c-FIX2 : preload — la card N commence a apparaitre 10%
        // avant son segment, pour amorcer la visibilite avant le 'pop'.
        const previewStart = Math.max(0, segmentStart - 0.1);

        let cardOpacity = 0;
        let cardScale = 0.9;
        let cardRotateY = -90;

        if (progress >= previewStart && progress < segmentStart) {
          // Phase preview : card monte de 0 → 0.3 opacity, micro-rotation
          const previewProgress = (progress - previewStart) / 0.1;
          cardOpacity = previewProgress * 0.3;
          cardScale = 0.9 + previewProgress * 0.02;
          cardRotateY = -90 + previewProgress * 30;
        } else if (progress >= segmentStart && progress < segmentMid) {
          // Phase apparition complete : 0.3 → 1.0 opacity, rotateY -60 → 0
          const localProgress =
            (progress - segmentStart) / (segmentMid - segmentStart);
          cardOpacity = 0.3 + localProgress * 0.7;
          cardScale = 0.92 + localProgress * 0.08;
          cardRotateY = -60 + localProgress * 60;
        } else if (progress >= segmentMid) {
          // Card pleinement visible
          cardOpacity = 1;
          cardScale = 1;
          cardRotateY = 0;
        }

        card.style.opacity = String(cardOpacity);
        card.style.transform = `perspective(1000px) rotateY(${cardRotateY}deg) scale(${cardScale})`;
      });

      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(raf);
      initialCards.forEach((card) => {
        card.style.willChange = "";
      });
    };
  }, [mode, mounted, cardsCount]);

  // Mobile/tablet/pre-mount/reduced-motion : header en flow puis children
  if (!mounted || mode !== "desktop-A") {
    return (
      <>
        {header}
        {children}
      </>
    );
  }

  // Desktop-A : sticky flex column avec header + grid centre (width 100%
  // preserve grid-cols-N — fix BUG1 STEP3c-FIX gardé)
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
          }}
        >
          <div style={{ width: "100%", padding: "0 8vw" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
