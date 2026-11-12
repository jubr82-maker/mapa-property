"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { PropertyLightbox } from "@/components/property/PropertyLightbox";
import { StatusBanner } from "@/components/property/StatusBanner";
import type { PropertyBanner } from "@/lib/property-banner";

interface GalleryItem {
  type: "image" | "video";
  url: string;
  alt?: string;
}

interface Props {
  items: GalleryItem[];
  title: string;
  /** Bandeau Sous compromis, Vendu, Loue (SQL 35) : premiere photo seulement. */
  banner?: PropertyBanner | null;
}

// Zone principale (oct. 2026) : la photo est posee DIRECTEMENT dans le
// bouton qui porte lui-meme le ratio 16/9 et position: relative, comme les
// vignettes (qui s'affichent en production). Aucune opacite initiale ni
// animation d'apparition : l'image est visible des le HTML servi.
// Robustesse : si l'optimiseur d'images (/_next/image) echoue pour une
// photo, elle est rechargee directement depuis son adresse d'origine
// (unoptimized) au lieu de laisser une zone vide.
export function PropertyGallery({ items, title, banner = null }: Props) {
  const t = useTranslations("property");
  const tAi = useTranslations("ai_transparency");
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [direct, setDirect] = useState<ReadonlySet<string>>(() => new Set());

  const mainRef = useRef<HTMLButtonElement | null>(null);
  const fallbackToDirect = useCallback(
    (url: string) => setDirect((prev) => (prev.has(url) ? prev : new Set(prev).add(url))),
    [],
  );
  const closeLightbox = useCallback(() => setLightbox(false), []);

  // Une erreur de chargement survenue AVANT l'hydratation n'atteint pas
  // onError : on verifie donc l'etat reel de la photo principale apres
  // montage (chargement termine sans pixel = echec).
  const currentUrl = items[Math.min(active, items.length - 1)]?.url;
  useEffect(() => {
    const img = mainRef.current?.querySelector("img");
    if (!img || !currentUrl) return;
    const check = () => {
      if (img.complete && img.naturalWidth === 0) {
        setDirect((prev) => (prev.has(currentUrl) ? prev : new Set(prev).add(currentUrl)));
      }
    };
    check();
    img.addEventListener("error", check);
    return () => img.removeEventListener("error", check);
  }, [currentUrl, direct]);

  if (items.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-bg-deep font-mono text-xs uppercase tracking-widest text-ink-soft">
        {t("gallery_empty")}
      </div>
    );
  }

  const current = items[Math.min(active, items.length - 1)];

  return (
    <>
      <div className="relative">
        <button
          type="button"
          ref={mainRef}
          onClick={() => setLightbox(true)}
          aria-label={t("gallery_open")}
          data-gallery-main
          className="relative block aspect-[16/9] w-full overflow-hidden rounded-xl bg-bg-deep"
        >
          {current.type === "image" ? (
            <Image
              key={current.url}
              src={current.url}
              alt={current.alt ?? title}
              fill
              sizes="(min-width: 1440px) 1100px, (min-width: 1024px) 70vw, 100vw"
              loading="eager"
              fetchPriority={active === 0 ? "high" : "auto"}
              unoptimized={direct.has(current.url)}
              onError={() => fallbackToDirect(current.url)}
              className="object-cover"
            />
          ) : (
            <video
              src={current.url}
              controls
              playsInline
              className="absolute inset-0 size-full object-cover"
            />
          )}
          {banner && active === 0 && current.type === "image" && <StatusBanner banner={banner} variant="gallery" />}
        </button>

        {items.length > 1 && (
          <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((it, i) => (
              <button
                key={`${i}-${it.url}`}
                type="button"
                onClick={() => setActive(i)}
                aria-current={i === active}
                aria-label={t("gallery_thumb", { n: i + 1 })}
                className={`relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md transition-opacity ${
                  i === active
                    ? "ring-2 ring-gold ring-offset-2 ring-offset-bg"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                {it.type === "image" ? (
                  <Image
                    src={it.url}
                    // Texte genere de la photo (type, localite, piece), pour
                    // les moteurs ; le bouton garde son libelle "Photo n".
                    alt={it.alt ?? title}
                    fill
                    sizes="96px"
                    unoptimized={direct.has(it.url)}
                    onError={() => fallbackToDirect(it.url)}
                    className="object-cover"
                  />
                ) : (
                  <span className="flex size-full items-center justify-center bg-bg-contrast text-text-contrast">
                    <PlayIcon />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 font-mono text-[10px] leading-snug text-ink-soft">
        <Link href="/legal/intelligence-artificielle" className="hover:underline">
          {tAi("note_gallery")}
        </Link>
      </p>

      {lightbox && (
        <PropertyLightbox
          items={items}
          title={title}
          startIndex={Math.min(active, items.length - 1)}
          direct={direct}
          onDirect={fallbackToDirect}
          onIndexChange={setActive}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
