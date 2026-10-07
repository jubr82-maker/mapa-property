"use client";

/**
 * AmbientBackgroundLite — STEP3a-FORET
 *
 * 4 courbes line-art cuivre citron (var(--ambient-stroke) =
 * #e0af6e) très fines (stroke 0.6) à opacité 0.42. Les `d` sont
 * animés en SMIL avec vague océanique : 4 keyframes (start /
 * crest+ / crest- / start), variations ±60-100 sur points de
 * contrôle Bézier → respiration marquée.
 *
 * Translate3d réactif à la souris : lerp 0.02 toujours doux,
 * amplitudes ±80-110 px (vs ±30-50 STEP2) — réaction plus
 * spectaculaire au survol large.
 *
 * Fixed inset 0, z 0, pointer-events-none, aria-hidden.
 *
 * Oct. 2026 : un calque <svg> par filament. Ordinateur : morphing SMIL
 * (lance apres l'hydratation) et reaction a la souris. Telephone (768 px
 * et moins) : jamais de SMIL (il redessine la forme a chaque image), une derive
 * lente en CSS (transform uniquement : calcul et affichage par le
 * compositeur du navigateur, sans redessin de la page ni JavaScript par
 * image). Elle ne demarre qu'une fois la page chargee et le navigateur au
 * repos, se met en pause quand l'onglet est cache ou le fond hors de
 * l'ecran. "Reduire les animations" : tout reste immobile, partout.
 *
 * Cleanup au démontage : retire listener + cancelAnimationFrame.
 */

import { useEffect, useRef } from "react";

export function AmbientBackgroundLite() {
  const containerRef = useRef<HTMLDivElement>(null);
  const path1Ref = useRef<SVGPathElement>(null);
  const path2Ref = useRef<SVGPathElement>(null);
  const path3Ref = useRef<SVGPathElement>(null);
  const path4Ref = useRef<SVGPathElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Perf (oct. 2026) : le morphing SMIL ne demarre plus tout seul
    // (begin="indefinite"). Avant, les quatre calques plein ecran
    // redessinaient l'ecran a chaque image des l'analyse du HTML, jusqu'a
    // l'hydratation, en concurrence avec l'affichage de l'element principal.
    if (reduced) return; // Immobiles : ni SMIL, ni derive, ni souris.
    if (window.matchMedia("(max-width: 768px)").matches) {
      // Telephone : jamais de SMIL ; derive CSS seulement.
      // Derive CSS demarree apres l'affichage de la page.
      let idleId = 0;
      let timerId = 0;
      const start = () => {
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        if (w.requestIdleCallback) idleId = w.requestIdleCallback(() => container.setAttribute("data-filaments", "on"), { timeout: 3000 });
        else timerId = window.setTimeout(() => container.setAttribute("data-filaments", "on"), 1500);
      };
      if (document.readyState === "complete") start();
      else window.addEventListener("load", start, { once: true });
      // Pause : onglet cache ou fond hors de l'ecran.
      let visible = true;
      let onScreen = true;
      const sync = () => container.toggleAttribute("data-paused", !(visible && onScreen));
      const onVisibility = () => {
        visible = document.visibilityState === "visible";
        sync();
      };
      document.addEventListener("visibilitychange", onVisibility);
      const io = new IntersectionObserver((entries) => {
        onScreen = entries.some((e) => e.isIntersecting);
        sync();
      });
      io.observe(container);
      return () => {
        window.removeEventListener("load", start);
        document.removeEventListener("visibilitychange", onVisibility);
        io.disconnect();
        const w = window as Window & { cancelIdleCallback?: (id: number) => void };
        if (idleId && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
        if (timerId) window.clearTimeout(timerId);
      };
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let p1X = 0;
    let p1Y = 0;
    let p2X = 0;
    let p2Y = 0;
    let p3X = 0;
    let p3Y = 0;
    let p4X = 0;
    let p4Y = 0;
    const lerp = 0.02;
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

      const t1X = -offsetX * 100;
      const t1Y = -offsetY * 80;
      const t2X = offsetX * 110;
      const t2Y = offsetY * 90;
      const t3X = -offsetX * 80;
      const t3Y = offsetY * 85;
      const t4X = offsetX * 90;
      const t4Y = -offsetY * 95;

      p1X += (t1X - p1X) * lerp;
      p1Y += (t1Y - p1Y) * lerp;
      p2X += (t2X - p2X) * lerp;
      p2Y += (t2Y - p2Y) * lerp;
      p3X += (t3X - p3X) * lerp;
      p3Y += (t3Y - p3Y) * lerp;
      p4X += (t4X - p4X) * lerp;
      p4Y += (t4Y - p4Y) * lerp;

      if (path1Ref.current)
        path1Ref.current.style.transform = `translate3d(${p1X}px, ${p1Y}px, 0)`;
      if (path2Ref.current)
        path2Ref.current.style.transform = `translate3d(${p2X}px, ${p2Y}px, 0)`;
      if (path3Ref.current)
        path3Ref.current.style.transform = `translate3d(${p3X}px, ${p3Y}px, 0)`;
      if (path4Ref.current)
        path4Ref.current.style.transform = `translate3d(${p4X}px, ${p4Y}px, 0)`;

      rafId = requestAnimationFrame(tick);
    };

    // Ordinateur : morphing SMIL lance apres l'hydratation.
    container.querySelectorAll("animate").forEach((el) => (el as SVGAnimationElement).beginElement());
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
        backgroundColor: "var(--ambient-bg)",
        transition: "background-color 0.4s ease",
      }}
    >
      <svg
        className="ambient-filament"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ ["--dx" as string]: "-34px", ["--dy" as string]: "22px", ["--drift-dur" as string]: "41s" }}
      >
        <g
          fill="none"
          stroke="var(--ambient-stroke)"
          strokeWidth="0.6"
          opacity="0.42"
          style={{ transition: "stroke 0.4s ease" }}
        >
        <path
          ref={path1Ref}
          d="M -100,200 C 300,100 700,400 1100,250 S 1700,450 1900,300"
        >
          <animate
            attributeName="d"
            dur="38s"
            repeatCount="indefinite"
            begin="indefinite"
            values="M -100,200 C 300,100 700,400 1100,250 S 1700,450 1900,300;
                    M -100,260 C 350,170 770,330 1170,300 S 1770,380 1900,360;
                    M -100,160 C 250,40 630,470 1030,200 S 1630,520 1900,240;
                    M -100,200 C 300,100 700,400 1100,250 S 1700,450 1900,300"
          />
        </path>
        </g>
      </svg>
      <svg
        className="ambient-filament"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ ["--dx" as string]: "28px", ["--dy" as string]: "-26px", ["--drift-dur" as string]: "47s" }}
      >
        <g
          fill="none"
          stroke="var(--ambient-stroke)"
          strokeWidth="0.6"
          opacity="0.42"
          style={{ transition: "stroke 0.4s ease" }}
        >
        <path
          ref={path2Ref}
          d="M -100,600 C 400,450 800,750 1300,600 S 1800,500 1900,650"
        >
          <animate
            attributeName="d"
            dur="46s"
            repeatCount="indefinite"
            begin="indefinite"
            values="M -100,600 C 400,450 800,750 1300,600 S 1800,500 1900,650;
                    M -100,680 C 460,520 860,820 1360,660 S 1860,560 1900,720;
                    M -100,540 C 340,390 740,690 1240,540 S 1740,440 1900,580;
                    M -100,600 C 400,450 800,750 1300,600 S 1800,500 1900,650"
          />
        </path>
        </g>
      </svg>
      <svg
        className="ambient-filament"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ ["--dx" as string]: "-22px", ["--dy" as string]: "-30px", ["--drift-dur" as string]: "53s" }}
      >
        <g
          fill="none"
          stroke="var(--ambient-stroke)"
          strokeWidth="0.6"
          opacity="0.42"
          style={{ transition: "stroke 0.4s ease" }}
        >
        <path
          ref={path3Ref}
          d="M 200,-100 C 300,300 500,500 800,400 S 1100,700 1400,500 S 1700,800 1900,600"
        >
          <animate
            attributeName="d"
            dur="52s"
            repeatCount="indefinite"
            begin="indefinite"
            values="M 200,-100 C 300,300 500,500 800,400 S 1100,700 1400,500 S 1700,800 1900,600;
                    M 240,-100 C 360,370 580,580 880,470 S 1180,770 1480,570 S 1780,870 1900,680;
                    M 160,-100 C 240,230 420,430 720,330 S 1020,630 1320,430 S 1620,730 1900,520;
                    M 200,-100 C 300,300 500,500 800,400 S 1100,700 1400,500 S 1700,800 1900,600"
          />
        </path>
        </g>
      </svg>
      <svg
        className="ambient-filament"
        viewBox="0 0 1600 1000"
        preserveAspectRatio="xMidYMid slice"
        style={{ ["--dx" as string]: "30px", ["--dy" as string]: "18px", ["--drift-dur" as string]: "44s" }}
      >
        <g
          fill="none"
          stroke="var(--ambient-stroke)"
          strokeWidth="0.6"
          opacity="0.42"
          style={{ transition: "stroke 0.4s ease" }}
        >
        <path
          ref={path4Ref}
          d="M -100,900 C 200,800 500,950 900,820 S 1400,950 1900,850"
        >
          <animate
            attributeName="d"
            dur="44s"
            repeatCount="indefinite"
            begin="indefinite"
            values="M -100,900 C 200,800 500,950 900,820 S 1400,950 1900,850;
                    M -100,960 C 260,860 560,910 960,880 S 1460,920 1900,910;
                    M -100,840 C 140,740 440,990 840,760 S 1340,990 1900,790;
                    M -100,900 C 200,800 500,950 900,820 S 1400,950 1900,850"
          />
        </path>
        </g>
      </svg>
    </div>
  );
}
