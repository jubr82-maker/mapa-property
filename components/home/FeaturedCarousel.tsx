"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useCallback, useEffect, useState } from "react";
import type { HomeFeatured } from "@/lib/data";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { OffmarketPlaceholder } from "@/components/property/OffmarketPlaceholder";

interface Props {
  items: HomeFeatured[];
}

export function FeaturedCarousel({ items }: Props) {
  const t = useTranslations("featured");
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      dragFree: false,
      duration: 30,
    },
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  if (items.length === 0) return null;

  return (
    <section className="px-6 py-5 md:py-20 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
              {t("eyebrow")}
            </p>
            <h2 className="mt-2 t-h2">
              {t("title")}
            </h2>
            <SignatureLine />
            <p className="mt-3 max-w-xl text-sm text-ink-mid md:text-base">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            <CarouselButton dir="prev" onClick={() => emblaApi?.scrollPrev()} />
            <CarouselButton dir="next" onClick={() => emblaApi?.scrollNext()} />
            <Link
              href="/biens"
              className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep transition-colors hover:text-gold md:text-xs"
            >
              {t("see_all")} →
            </Link>
          </div>
        </div>

        <div ref={emblaRef} className="overflow-hidden">
          <div className="flex gap-3 md:gap-5">
            {items.map((item) => (
              <article
                key={`${item.kind}-${item.id}`}
                className="min-w-0 shrink-0 grow-0 basis-[85%] sm:basis-[50%] lg:basis-[33%]"
              >
                <FeaturedCard item={item} />
              </article>
            ))}
          </div>
        </div>

        {scrollSnaps.length > 1 && (
          <div className="mt-4 flex justify-center gap-2 md:mt-6">
            {scrollSnaps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Bien ${i + 1}`}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === selectedIndex ? "w-6 bg-gold" : "w-1.5 bg-line"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function FeaturedCard({ item }: { item: HomeFeatured }) {
  const tOff = useTranslations("offmarket");
  const isOffmarket = item.kind === "offmarket";
  const href = isOffmarket
    ? `/off-market/${item.id}`
    : item.slug
      ? `/biens/${item.slug}`
      : "/biens";

  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-bg transition-all hover:border-gold hover:shadow-lg hover:shadow-gold/10"
    >
      <div className="relative h-40 overflow-hidden bg-bg-deep sm:h-auto sm:aspect-[4/3]">
        {isOffmarket ? (
          /* Cover confidentiel standardisé (BUG 2) — jamais le visuel
             réel d'un bien off-market, même si une image custom existe. */
          <OffmarketPlaceholder
            compact
            title={tOff("cover_title")}
            subtitle={tOff("cover_subtitle")}
          />
        ) : item.cover_url ? (
          <Image
            src={item.cover_url}
            alt={item.title ?? ""}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 85vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: "radial-gradient(circle at center, #1a2332 0%, #0d1419 100%)",
            }}
          />
        )}
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] backdrop-blur ${
            isOffmarket
              ? "bg-gold-deep text-bg"
              : "bg-bg-contrast/70 text-text-contrast/90"
          }`}
        >
          {isOffmarket ? "Off-Market" : "Apimo"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4 md:gap-2 md:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
          {[item.country, item.city].filter(Boolean).join(" · ") || "—"}
        </p>
        <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight text-ink group-hover:text-gold-deep">
          {item.title ?? "—"}
        </h3>
        <div className="mt-auto flex items-baseline justify-between gap-3">
          <p className="font-display text-base font-bold gold-text">
            {item.price_label ?? "Prix sur demande"}
          </p>
          {(item.surface || item.bedrooms) && (
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
              {item.surface ? `${item.surface} m²` : ""}
              {item.surface && item.bedrooms ? " · " : ""}
              {item.bedrooms ? `${item.bedrooms} ch` : ""}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function CarouselButton({ dir, onClick }: { dir: "prev" | "next"; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={dir === "prev" ? "Précédent" : "Suivant"}
      className="inline-flex size-9 items-center justify-center rounded-full border border-line text-ink transition-colors hover:border-gold hover:text-gold"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {dir === "prev" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
      </svg>
    </button>
  );
}
