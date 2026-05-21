"use client";

/**
 * ScrollProgressBar — POL3-7a (AGENT ANTOINE)
 *
 * Barre cuivre citron #D4A574 de 2 px en haut du viewport, largeur en % du
 * scroll vertical (scrollY / (scrollHeight − innerHeight)). Fixed, z-[60]
 * — au-dessus du Header (z-50). Passive scroll listener + rAF throttle
 * pour ne jamais bloquer le main thread.
 *
 * prefers-reduced-motion → progress affichée mais pas d'écoute scroll
 * dynamique (valeur à 0 stable, n'attire pas l'attention).
 */

import { useEffect, useState } from "react";

const COPPER = "#D4A574";

export function ScrollProgressBar() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let ticking = false;
    const update = () => {
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? (window.scrollY / max) * 100 : 0;
      setPct(Math.min(100, Math.max(0, p)));
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };
    update();
    if (prefersReduced) return;
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[60] h-[2px]"
      style={{ width: `${pct}%`, backgroundColor: COPPER }}
    />
  );
}
