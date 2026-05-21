"use client";

/**
 * STEP3c-3 — Coverage narratif card par card avec flip 3D + pin scroll.
 *
 * Mode 'desktop-A' :
 *   - Wrapper outer height = max(2, cardsCount * 1.5) viewports (4 cards
 *     → 6 viewports de scroll vertical pour reveler les 4 cards)
 *   - Section sticky top:0 height:100vh centre les cards
 *   - Chaque card [data-coverage-card] revele dans son segment :
 *       card index k → segment [k/N, (k+1)/N] du progress total
 *       sous-segment d'entree [segmentStart, segmentMid] : opacity 0→1,
 *         scale 0.9→1.0, rotateY -90→0deg (effet flip 3D)
 *       au-dela de segmentMid : card pleinement visible (1.0/1.0/0deg)
 *   - Une fois le pin termine, scroll vertical reprend → section suivante
 *
 * Mode 'tablet-A-light' / 'mobile-B' / pre-mount :
 *   - Passthrough (renvoie children tel quel)
 *   - Les cards conservent leur FadeInOnScroll wrap externe (STEP3b)
 *
 * prefers-reduced-motion : passthrough (skip pin scroll, rendu standard).
 */

import { useEffect, useRef, useState } from "react";
import { useDeviceMode } from "@/hooks/useDeviceMode";

export function CoverageNarrativeScroll({
  children,
  cardsCount = 4,
}: {
  children: React.ReactNode;
  cardsCount?: number;
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

    // 1.5 viewport par card pour rythme narratif lent, minimum 2 vp
    const viewportsNeeded = Math.max(2, cardsCount * 1.5);
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

        let cardOpacity = 0;
        let cardScale = 0.9;
        let cardRotateY = -90;

        if (progress >= segmentStart) {
          const localProgress = Math.min(
            1,
            (progress - segmentStart) / (segmentMid - segmentStart),
          );
          cardOpacity = localProgress;
          cardScale = 0.9 + localProgress * 0.1;
          cardRotateY = -90 + localProgress * 90;
        }
        if (progress >= segmentMid) {
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

  // Mobile/tablet/pre-mount/reduced-motion : passthrough
  if (!mounted || mode !== "desktop-A") {
    return <>{children}</>;
  }

  // FIX-3c : sticky wrapper NE PAS appliquer display:flex/center direct sur
  // les children — sinon le <div className="grid"> enfant devient un flex
  // item sans width et la grille s'effondre. Double wrapper interne : un
  // flex container vertical-center, et un inner width:100% qui preserve
  // le layout grid des enfants.
  return (
    <div ref={wrapperRef} style={{ height: pinHeight, position: "relative" }}>
      <div
        ref={stickyRef}
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
          }}
        >
          <div style={{ width: "100%" }}>{children}</div>
        </div>
      </div>
    </div>
  );
}
