"use client";

/**
 * STEP3c-1 — Detection device mode pour piloter le rendu/animations.
 *
 * 3 buckets :
 *  - desktop-A     : >= 1280px + pointer fine + pas de touch
 *  - tablet-A-light : >= 1024px + pointer fine ou any-pointer fine
 *  - mobile-B      : tout le reste (defaut)
 *
 * Premier render SSR/CSR initial → 'mobile-B' (safe defaut). Apres
 * mount + detect, mode reel applique. `mounted` flag pour les
 * composants qui veulent attendre la stabilisation avant d'appliquer
 * un layout dependant du mode (eviter hydration mismatch).
 *
 * Re-detect au resize (orientation change, fenetre redimensionnee).
 *
 * Utilise en STEP3c-1 par HeroScrollContainer (divisor scroll), prevu
 * pour STEP3c-2 (Featured horizontal desktop / swipe mobile) et
 * STEP3c-3 (narratif sections).
 */

import { useEffect, useState } from "react";

export type DeviceMode = "desktop-A" | "tablet-A-light" | "mobile-B";

export function useDeviceMode() {
  const [mode, setMode] = useState<DeviceMode>("mobile-B");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const detect = () => {
      const width = window.innerWidth;
      const pointerFine = window.matchMedia("(pointer: fine)").matches;
      const anyPointerFine = window.matchMedia("(any-pointer: fine)").matches;
      const hasTouch = navigator.maxTouchPoints > 0;

      if (width >= 1280 && pointerFine && !hasTouch) {
        setMode("desktop-A");
      } else if (width >= 1024 && (pointerFine || anyPointerFine)) {
        setMode("tablet-A-light");
      } else {
        setMode("mobile-B");
      }
    };

    detect();
    setMounted(true);
    window.addEventListener("resize", detect);
    return () => window.removeEventListener("resize", detect);
  }, []);

  return { mode, mounted };
}
