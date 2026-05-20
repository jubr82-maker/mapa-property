"use client";

/**
 * LivingBackground — POL3-7a (AGENT ANTOINE)
 *
 * Fond vivant : 3 images Luxembourg (URLs Unsplash) en rotation continue
 * 18 s avec fondu enchaîné (transition opacity 2 s ease-in-out). Fixed,
 * z-0, pointer-events-none, aria-hidden. Image active à opacity 0.18,
 * voile copper #B8865A à 0.04 par-dessus pour ancrer la marque.
 *
 * NB : positionné en z-0, sous les sections opaques de la home (bg-bg,
 * bg-bg-soft, bg-bg-contrast, etc.) — visible donc principalement sur
 * les zones transparentes / gaps. C'est le rendu attendu par le brief
 * Julien (référence "awwwards hubtown" — fond vivant subtil, non
 * obstructif). Si visibilité jugée insuffisante : POL3-7b ou Supabase
 * Storage upload (POL3-7a-2).
 *
 * Dégradation gracieuse : prefers-reduced-motion → pas de rotation
 * (1ʳᵉ image figée). URL Unsplash inaccessible → onError masque le <img>
 * sans crasher la page.
 */

import { useEffect, useState } from "react";

const IMAGES = [
  "https://images.unsplash.com/photo-1592486058517-36236ba247c8?w=1920&q=70",
  "https://images.unsplash.com/photo-1612988697908-7d6c97a18b18?w=1920&q=70",
  "https://images.unsplash.com/photo-1601228040516-66e83e29c9ab?w=1920&q=70",
];
const ROTATION_MS = 18_000;
const COPPER = "#B8865A";

export function LivingBackground() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % IMAGES.length),
      ROTATION_MS,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {IMAGES.map((src, i) => (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          className="absolute inset-0 size-full object-cover transition-opacity duration-[2000ms] ease-in-out"
          style={{ opacity: i === index ? 0.18 : 0 }}
        />
      ))}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundColor: COPPER, opacity: 0.04 }}
      />
    </div>
  );
}
