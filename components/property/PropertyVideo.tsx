"use client";

// POL2-10 — Vidéo de présentation intégrée à la galerie.
//
// - Vignette ≈ 480px desktop / pleine largeur mobile, ratio 16:9.
// - Bouton lecture visible au survol ; clic ⇒ lightbox plein écran avec
//   contrôles natifs.
// - Lazy : la balise <video> n'est montée qu'à l'entrée dans le viewport
//   (IntersectionObserver). preload="metadata", playsInline, controls,
//   PAS d'autoplay (sauf dans la lightbox sur action utilisateur).
// - poster si fourni.
// - videoUrl null/absent ⇒ ne rend RIEN (aucun placeholder cassé).

import { useEffect, useRef, useState } from "react";

interface Props {
  videoUrl: string | null | undefined;
  poster?: string | null;
  /** Libellés localisés (next-intl côté appelant). Fallbacks FR de secours. */
  labels?: {
    eyebrow?: string;
    play?: string;
    close?: string;
  };
}

export function PropertyVideo({ videoUrl, poster, labels }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  const [open, setOpen] = useState(false);

  // Lazy mount via IntersectionObserver.
  useEffect(() => {
    if (!videoUrl) return;
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setInView(true);
            obs.disconnect();
          }
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [videoUrl]);

  // Lightbox : Escape ferme, lock scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  // Garde-fou : pas de vidéo ⇒ rien (aucun placeholder cassé).
  if (!videoUrl || !videoUrl.trim()) return null;

  const eyebrow = labels?.eyebrow ?? "Vidéo de présentation";
  const playLabel = labels?.play ?? "Lire la vidéo";
  const closeLabel = labels?.close ?? "Fermer";

  return (
    <section data-property-video className="mt-12">
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
        {eyebrow}
      </p>

      <div
        ref={containerRef}
        className="mx-auto w-full lg:max-w-[480px]"
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={playLabel}
          data-property-video-trigger
          className="group relative block w-full overflow-hidden rounded-2xl bg-bg-deep"
        >
          <div className="relative aspect-video">
            {inView ? (
              <video
                src={videoUrl}
                poster={poster ?? undefined}
                preload="metadata"
                playsInline
                muted
                controls={false}
                className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            ) : (
              <div
                className="size-full"
                style={
                  poster
                    ? {
                        backgroundImage: `url(${poster})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }
                    : undefined
                }
              />
            )}
            {/* Overlay + bouton lecture (visible, accentué au survol) */}
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center bg-bg-contrast/20 transition-colors group-hover:bg-bg-contrast/35"
            >
              <span className="inline-flex size-16 items-center justify-center rounded-full border border-white/70 bg-bg-contrast/40 text-white backdrop-blur transition-transform group-hover:scale-105">
                <svg viewBox="0 0 24 24" className="size-6" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </span>
          </div>
        </button>
      </div>

      {open && (
        <div
          data-property-video-lightbox
          className="fixed inset-0 z-[80] flex items-center justify-center bg-bg-contrast/95 p-4 backdrop-blur"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={closeLabel}
            className="absolute right-4 top-4 inline-flex size-12 items-center justify-center rounded-full border border-text-contrast/30 text-text-contrast transition-colors hover:border-gold hover:text-gold"
          >
            <svg
              viewBox="0 0 24 24"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <div
            className="relative size-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={videoUrl}
              poster={poster ?? undefined}
              controls
              autoPlay
              playsInline
              preload="metadata"
              className="size-full rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </section>
  );
}
