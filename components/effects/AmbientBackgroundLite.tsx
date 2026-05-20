"use client";

/**
 * AmbientBackgroundLite — Étape 1 petit pas
 *
 * Remplace LivingBackground POL3-7a (3 photos Luxembourg rotation
 * jugées trop visibles). Ici : fond uni blanc cassé #FAF8F2 + 3
 * blobs SVG copper/gold très flous (filter blur 120) qui dérivent
 * en boucle SMIL (animate) et se décalent légèrement selon la
 * position de la souris (lerp 0.025, amplitude 30-60 px).
 *
 * Fixed inset 0, z 0, pointer-events-none, aria-hidden. Désactivé
 * sur mobile (<768) côté useEffect : pas d'écoute mousemove, blobs
 * uniquement animés via SMIL.
 *
 * Cleanup au démontage : retire listener + cancelAnimationFrame.
 */

import { useEffect, useRef } from "react";

export function AmbientBackgroundLite() {
  const containerRef = useRef<HTMLDivElement>(null);
  const blob1Ref = useRef<SVGEllipseElement>(null);
  const blob2Ref = useRef<SVGEllipseElement>(null);
  const blob3Ref = useRef<SVGEllipseElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (typeof window === "undefined") return;
    if (window.matchMedia("(max-width: 768px)").matches) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let blob1X = 0;
    let blob1Y = 0;
    let blob2X = 0;
    let blob2Y = 0;
    let blob3X = 0;
    let blob3Y = 0;
    const lerp = 0.025;
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const tick = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const cx = w / 2;
      const cy = h / 2;
      const offsetX = (mouseX - cx) / cx;
      const offsetY = (mouseY - cy) / cy;

      const target1X = -offsetX * 40;
      const target1Y = -offsetY * 40;
      const target2X = offsetX * 60;
      const target2Y = offsetY * 60;
      const target3X = -offsetX * 30;
      const target3Y = offsetY * 50;

      blob1X += (target1X - blob1X) * lerp;
      blob1Y += (target1Y - blob1Y) * lerp;
      blob2X += (target2X - blob2X) * lerp;
      blob2Y += (target2Y - blob2Y) * lerp;
      blob3X += (target3X - blob3X) * lerp;
      blob3Y += (target3Y - blob3Y) * lerp;

      if (blob1Ref.current)
        blob1Ref.current.style.transform = `translate3d(${blob1X}px, ${blob1Y}px, 0)`;
      if (blob2Ref.current)
        blob2Ref.current.style.transform = `translate3d(${blob2X}px, ${blob2Y}px, 0)`;
      if (blob3Ref.current)
        blob3Ref.current.style.transform = `translate3d(${blob3X}px, ${blob3Y}px, 0)`;

      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove);
    rafId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        backgroundColor: "#FAF8F2",
      }}
    >
      <svg
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ width: "100%", height: "100%" }}
      >
        <defs>
          <filter id="ambient-soft-blur">
            <feGaussianBlur stdDeviation="120" />
          </filter>
        </defs>
        <g filter="url(#ambient-soft-blur)">
          <ellipse
            ref={blob1Ref}
            cx="300"
            cy="250"
            rx="280"
            ry="220"
            fill="#B8865A"
            opacity="0.10"
          >
            <animate attributeName="cx" values="300;480;320;300" dur="48s" repeatCount="indefinite" />
            <animate attributeName="cy" values="250;380;200;250" dur="42s" repeatCount="indefinite" />
            <animate attributeName="rx" values="280;320;260;280" dur="36s" repeatCount="indefinite" />
          </ellipse>
          <ellipse
            ref={blob2Ref}
            cx="1300"
            cy="700"
            rx="320"
            ry="260"
            fill="#C8A04A"
            opacity="0.08"
          >
            <animate attributeName="cx" values="1300;1100;1350;1300" dur="54s" repeatCount="indefinite" />
            <animate attributeName="cy" values="700;520;680;700" dur="46s" repeatCount="indefinite" />
            <animate attributeName="rx" values="320;380;300;320" dur="40s" repeatCount="indefinite" />
          </ellipse>
          <ellipse
            ref={blob3Ref}
            cx="800"
            cy="900"
            rx="240"
            ry="200"
            fill="#B8865A"
            opacity="0.06"
          >
            <animate attributeName="cx" values="800;620;860;800" dur="58s" repeatCount="indefinite" />
            <animate attributeName="cy" values="900;780;920;900" dur="50s" repeatCount="indefinite" />
            <animate attributeName="ry" values="200;240;180;200" dur="44s" repeatCount="indefinite" />
          </ellipse>
        </g>
      </svg>
    </div>
  );
}
