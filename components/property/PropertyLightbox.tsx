"use client";

// Visionneuse plein ecran des fiches de biens (oct. 2026).
//
// - Glisser horizontalement : photo suivante ou precedente, l'image suit le
//   doigt (embla-carousel, deja utilise par le site : aucune nouvelle
//   bibliotheque).
// - Pincer pour zoomer : zoom natif du navigateur. Embla abandonne le
//   glissement des qu'un second doigt touche l'ecran, et aucun glissement
//   ne demarre tant que la page est zoomee (deplacement dans la photo
//   agrandie sans changer de photo).
// - Glisser vers le bas : la photo suit le doigt puis la visionneuse se
//   ferme au-dela d'un seuil ; sinon elle revient en place.
// - Ordinateur : fleches a l'ecran, touches Gauche, Droite et Echap.
// - Compteur "3 sur 28", bouton Fermer large et contraste.
// - Photos voisines prechargees (chargement immediat de la photo affichee
//   et des deux de chaque cote).
// - La page derriere ne defile pas (corps fige a sa position, restaure a
//   la fermeture, sans decalage lateral).
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

export interface LightboxItem {
  type: "image" | "video";
  url: string;
  alt?: string;
}

interface Props {
  items: LightboxItem[];
  title: string;
  startIndex: number;
  /** Photos a charger sans optimiseur (repli deja decide par la galerie). */
  direct: ReadonlySet<string>;
  onDirect: (url: string) => void;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

/** Distance verticale (px) au-dela de laquelle un glissement vers le bas ferme. */
const CLOSE_DISTANCE = 120;
/** Photos chargees de chaque cote de la photo affichee. */
const PRELOAD_RADIUS = 2;

function isPageZoomed(): boolean {
  const vv = typeof window !== "undefined" ? window.visualViewport : null;
  return !!vv && vv.scale > 1.01;
}

export function PropertyLightbox({ items, title, startIndex, direct, onDirect, onIndexChange, onClose }: Props) {
  const t = useTranslations("property");
  const [index, setIndex] = useState(startIndex);
  const [dragY, setDragY] = useState(0);
  const [releasing, setReleasing] = useState(false);
  // Page zoomee (pincement) : le navigateur gere seul tous les deplacements.
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setZoomed(isPageZoomed());
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex,
    loop: items.length > 1,
    duration: 22,
    // Pas de glissement si plusieurs doigts (pincement) ou page zoomee.
    watchDrag: (_api, evt) => {
      const touches = (evt as TouchEvent).touches;
      if (touches && touches.length > 1) return false;
      return !isPageZoomed();
    },
  });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const i = emblaApi.selectedScrollSnap();
      setIndex(i);
      onIndexChange(i);
    };
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onIndexChange]);

  const prev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const next = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Clavier.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  // Page derriere figee (iOS ignore overflow:hidden seul sur body).
  useEffect(() => {
    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const saved = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
      overscroll: documentElement.style.overscrollBehavior,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    documentElement.style.overscrollBehavior = "none";
    closeRef.current?.focus();
    return () => {
      body.style.position = saved.position;
      body.style.top = saved.top;
      body.style.left = saved.left;
      body.style.right = saved.right;
      body.style.width = saved.width;
      body.style.overflow = saved.overflow;
      documentElement.style.overscrollBehavior = saved.overscroll;
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Glissement vers le bas pour fermer (un doigt, page non zoomee,
  // mouvement plus vertical qu'horizontal).
  const touchStart = useRef<{ x: number; y: number; axis: "x" | "y" | null } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1 || isPageZoomed()) {
      touchStart.current = null;
      return;
    }
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null };
    setReleasing(false);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = touchStart.current;
    if (!s) return;
    if (e.touches.length !== 1) {
      touchStart.current = null;
      setDragY(0);
      return;
    }
    const dx = e.touches[0].clientX - s.x;
    const dy = e.touches[0].clientY - s.y;
    if (!s.axis && Math.hypot(dx, dy) > 8) s.axis = Math.abs(dy) > Math.abs(dx) ? "y" : "x";
    if (s.axis === "y") setDragY(Math.max(0, dy));
  };
  const onTouchEnd = () => {
    const s = touchStart.current;
    touchStart.current = null;
    if (s?.axis === "y" && dragY > CLOSE_DISTANCE) {
      onClose();
      return;
    }
    setReleasing(true);
    setDragY(0);
  };

  const fade = Math.max(0.35, 1 - dragY / 400);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-property-lightbox
      className="fixed inset-0 z-[80] flex flex-col overscroll-contain text-text-contrast"
    >
      {/* Fond : s'eclaircit pendant le glissement vers le bas. */}
      <div aria-hidden className="absolute inset-0 bg-bg-contrast" style={{ opacity: fade }} />
      <div className="relative z-10 flex items-center justify-between gap-4 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-text-contrast/80" aria-live="polite">
          {t("gallery_counter", { current: index + 1, total: items.length })}
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("gallery_close")}
          className="inline-flex size-12 items-center justify-center rounded-full border border-text-contrast/60 bg-bg-contrast/70 text-text-contrast transition-colors hover:border-gold hover:text-gold"
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <div
        className="relative z-10 min-h-0 flex-1"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: releasing ? "transform 200ms ease-out" : undefined,
        }}
      >
        <div ref={emblaRef} className="size-full overflow-hidden" style={{ touchAction: zoomed ? "auto" : "pinch-zoom" }}>
          <div className="flex h-full">
            {items.map((it, i) => {
              const distance = Math.min(Math.abs(i - index), items.length - Math.abs(i - index));
              const near = distance <= PRELOAD_RADIUS;
              return (
                <div key={`${i}-${it.url}`} className="h-full min-w-0 shrink-0 grow-0 basis-full px-2 sm:px-16">
                  <div className="relative size-full">
                  {it.type === "image" ? (
                    near ? (
                      <Image
                        src={it.url}
                        alt={it.alt ?? title}
                        fill
                        sizes="100vw"
                        loading="eager"
                        unoptimized={direct.has(it.url)}
                        onError={() => onDirect(it.url)}
                        className="object-contain"
                        draggable={false}
                      />
                    ) : null
                  ) : near ? (
                    <video src={it.url} controls playsInline className="size-full object-contain" />
                  ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label={t("gallery_prev")}
              className="absolute left-4 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-text-contrast/40 bg-bg-contrast/60 text-text-contrast transition-colors hover:border-gold hover:text-gold md:inline-flex"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              aria-label={t("gallery_next")}
              className="absolute right-4 top-1/2 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border border-text-contrast/40 bg-bg-contrast/60 text-text-contrast transition-colors hover:border-gold hover:text-gold md:inline-flex"
            >
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      <p className="relative z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-text-contrast/60 [@media(pointer:fine)]:invisible">
        {t("gallery_swipe_hint")}
      </p>
    </div>
  );
}
