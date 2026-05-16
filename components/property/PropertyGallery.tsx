"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface GalleryItem {
  type: "image" | "video";
  url: string;
  alt?: string;
}

interface Props {
  items: GalleryItem[];
  title: string;
}

export function PropertyGallery({ items, title }: Props) {
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowRight")
        setActive((a) => (a + 1) % items.length);
      if (e.key === "ArrowLeft")
        setActive((a) => (a - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, items.length]);

  if (items.length === 0) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-xl bg-bg-deep font-mono text-xs uppercase tracking-widest text-ink-soft">
        no images
      </div>
    );
  }

  const current = items[active];

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="block w-full overflow-hidden rounded-xl bg-bg-deep"
        >
          <div className="relative aspect-[16/9]">
            {current.type === "image" ? (
              <Image
                src={current.url}
                alt={current.alt ?? title}
                fill
                sizes="(min-width: 1280px) 75vw, 100vw"
                priority
                className="object-cover"
              />
            ) : (
              <video
                src={current.url}
                controls
                playsInline
                className="size-full object-cover"
              />
            )}
          </div>
        </button>

        {items.length > 1 && (
          <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((it, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-current={i === active}
                className={`relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md transition-opacity ${
                  i === active
                    ? "ring-2 ring-gold ring-offset-2 ring-offset-bg"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {it.type === "image" ? (
                  <Image
                    src={it.url}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center bg-bg-contrast text-text-contrast">
                    ▶
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-bg-contrast/95 p-4 backdrop-blur">
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label="Fermer"
            className="absolute right-4 top-4 inline-flex size-12 items-center justify-center rounded-full border border-text-contrast/30 text-text-contrast transition-colors hover:border-gold hover:text-gold"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          {items.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setActive((a) => (a - 1 + items.length) % items.length)}
                aria-label="Précédent"
                className="absolute left-4 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-text-contrast/30 text-text-contrast transition-colors hover:border-gold hover:text-gold"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => setActive((a) => (a + 1) % items.length)}
                aria-label="Suivant"
                className="absolute right-4 top-1/2 inline-flex size-12 -translate-y-1/2 items-center justify-center rounded-full border border-text-contrast/30 text-text-contrast transition-colors hover:border-gold hover:text-gold"
              >
                →
              </button>
            </>
          )}

          <div className="relative size-full max-w-6xl">
            {current.type === "image" ? (
              <Image
                src={current.url}
                alt={current.alt ?? title}
                fill
                sizes="100vw"
                className="object-contain"
              />
            ) : (
              <video
                src={current.url}
                controls
                autoPlay
                playsInline
                className="size-full object-contain"
              />
            )}
          </div>

          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-xs uppercase tracking-[0.3em] text-text-contrast/70">
            {active + 1} / {items.length}
          </span>
        </div>
      )}
    </>
  );
}
