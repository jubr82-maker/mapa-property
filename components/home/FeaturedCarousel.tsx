"use client";

/**
 * SPRINT3 T4 — Featured dispatcher device-aware.
 *
 *  - desktop-A (>=1280px pointer fine) / pre-mount : FeaturedDesktop
 *    = comportement SPRINT1 (grid overflow-x scroll-snap + stagger
 *    IntersectionObserver gauche→droite + parallax X + bidirectionnel).
 *    INCHANGÉ.
 *  - mobile-B / tablet-A-light : FeaturedMobileEmbla = Embla pleine
 *    largeur 1 card + peek 8% du suivant, swipe natif, autoplay 4000ms,
 *    dots crème #F0E6CC inactif / cuivre citron #e0af6e actif.
 *
 * FeaturedCard + ViewAllCTA partages entre les deux rendus.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import type { HomeFeatured } from "@/lib/data";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { OffmarketPlaceholder } from "@/components/property/OffmarketPlaceholder";
import { useDeviceMode } from "@/hooks/useDeviceMode";

interface Props {
  items: HomeFeatured[];
}

export function FeaturedCarousel({ items }: Props) {
  const { mode, mounted } = useDeviceMode();
  if (items.length === 0) return null;
  // Pre-mount → desktop (SSR-safe, overflow-x natif marche aussi mobile).
  // Apres mount, mobile/tablet → Embla autoplay.
  if (mounted && mode !== "desktop-A") {
    return <FeaturedMobileEmbla items={items} />;
  }
  return <FeaturedDesktop items={items} />;
}

/* ──────────────────────── DESKTOP (SPRINT1 — inchangé) ──────────────── */

function FeaturedDesktop({ items }: Props) {
  const t = useTranslations("featured");
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!trackRef.current) return;
    const cards =
      trackRef.current.querySelectorAll<HTMLElement>("[data-featured-card]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;

    if (reduced) {
      cards.forEach((card) => {
        card.style.opacity = "1";
        card.style.transform = "translateX(0)";
      });
      return;
    }

    cards.forEach((card) => {
      card.style.opacity = "0";
      card.style.transform = "translateX(-80px)";
      card.style.transition =
        "opacity 1s cubic-bezier(0.22,1,0.36,1), transform 1s cubic-bezier(0.22,1,0.36,1)";
      card.style.willChange = "opacity, transform";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          cards.forEach((card, i) => {
            if (entry.isIntersecting) {
              window.setTimeout(() => {
                card.style.opacity = "1";
                card.style.transform = "translateX(0)";
              }, i * 600);
            } else {
              const reverseIdx = cards.length - 1 - i;
              window.setTimeout(() => {
                card.style.opacity = "0";
                card.style.transform = "translateX(-80px)";
              }, reverseIdx * 200);
            }
          });
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -100px 0px" },
    );

    observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sectionRef.current || !innerRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const section = sectionRef.current;
    const inner = innerRef.current;
    inner.style.willChange = "transform";

    let raf = 0;
    let lastProgress = -1;

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const rect = section.getBoundingClientRect();
        const vh = window.innerHeight;
        if (rect.top >= vh || rect.bottom <= 0) return;
        const totalRange = vh + rect.height;
        const scrolled = vh - rect.top;
        const progress = Math.max(0, Math.min(1, scrolled / totalRange));
        if (Math.abs(progress - lastProgress) < 0.001) return;
        lastProgress = progress;
        inner.style.transform = `translateX(${-200 * progress}px)`;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
      inner.style.willChange = "";
    };
  }, []);

  return (
    <section ref={sectionRef} className="px-6 py-5 md:py-12 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <FeaturedHeader t={t} />
      </div>
      <div
        ref={trackRef}
        className="mt-6 flex gap-5 overflow-x-auto pb-4 md:mt-8 md:gap-6 lg:px-[8vw]"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <div ref={innerRef} data-featured-inner className="flex gap-5 md:gap-6">
          {items.map((item) => (
            <article
              key={`${item.kind}-${item.id}`}
              data-featured-card
              style={{ scrollSnapAlign: "start" }}
              className="w-[78vw] shrink-0 sm:w-[48vw] lg:w-[400px]"
            >
              <FeaturedCard item={item} />
            </article>
          ))}
        </div>
        <ViewAllCTA label={t("see_all")} />
      </div>
    </section>
  );
}

/* ──────────────────────── MOBILE (Embla autoplay) ──────────────────── */

function FeaturedMobileEmbla({ items }: Props) {
  const t = useTranslations("featured");
  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: "center", containScroll: false },
    // Autoplay 4s — stopOnInteraction false : le swipe interrompt
    // momentanement, l'autoplay reprend au tick suivant (~equivalent
    // "pause au touch, reprend").
    [Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: false })],
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

  return (
    <section className="px-6 py-5">
      <div className="mx-auto max-w-[1400px]">
        <FeaturedHeader t={t} />
      </div>

      {/* Embla : 1 card visible (92%) + peek 8% suivant via basis-[92%]. */}
      <div ref={emblaRef} className="mt-6 overflow-hidden">
        <div className="flex">
          {items.map((item) => (
            <div
              key={`${item.kind}-${item.id}`}
              className="min-w-0 shrink-0 grow-0 basis-[92%] pl-3 first:pl-0"
            >
              <FeaturedCard item={item} />
            </div>
          ))}
        </div>
      </div>

      {/* Dots — crème inactif / cuivre citron actif */}
      {scrollSnaps.length > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {scrollSnaps.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Bien ${i + 1}`}
              onClick={() => emblaApi?.scrollTo(i)}
              className="size-2 rounded-full transition-colors"
              style={{
                backgroundColor: i === selectedIndex ? "#e0af6e" : "#F0E6CC",
                opacity: i === selectedIndex ? 1 : 0.5,
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-center">
        <ViewAllCTA label={t("see_all")} inline />
      </div>
    </section>
  );
}

/* ──────────────────────── Partagés ──────────────────── */

function FeaturedHeader({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="mb-2 md:mb-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
        {t("eyebrow")}
      </p>
      <h2 className="mt-2 t-h2">{t("title")}</h2>
      <SignatureLine />
      <p className="mt-3 max-w-xl text-sm text-ink-mid md:text-base">
        {t("subtitle")}
      </p>
    </div>
  );
}

function ViewAllCTA({ label, inline = false }: { label: string; inline?: boolean }) {
  const wrapperCls = inline
    ? ""
    : "flex w-[78vw] shrink-0 items-center justify-center sm:w-[48vw] lg:w-[400px]";
  return (
    <div style={inline ? undefined : { scrollSnapAlign: "start" }} className={wrapperCls}>
      <Link
        href="/biens"
        className="cta-lime-glow inline-flex items-center gap-3 rounded-full bg-[#CFE542] px-8 py-5 font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#1F221A]"
      >
        {label}
        <span aria-hidden>→</span>
      </Link>
    </div>
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
          <OffmarketPlaceholder
            compact
            title={tOff("cover_title")}
            subtitle={tOff("cover_subtitle")}
            invertOnDark
          />
        ) : item.cover_url ? (
          <Image
            src={item.cover_url}
            alt={item.title ?? ""}
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 48vw, 92vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at center, #262A1F 0%, #1F221A 100%)",
            }}
          />
        )}
        {isOffmarket ? (
          <span
            className="absolute right-3 top-3 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] backdrop-blur"
            style={{
              backgroundColor: "rgba(224, 175, 110, 0.15)",
              borderColor: "rgba(224, 175, 110, 0.5)",
              color: "#e0af6e",
            }}
          >
            Off-Market
          </span>
        ) : (
          <span className="absolute right-3 top-3 rounded-full bg-bg-contrast/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-text-contrast/90 backdrop-blur">
            Apimo
          </span>
        )}
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
