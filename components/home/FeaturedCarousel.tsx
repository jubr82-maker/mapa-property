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
import { resolveBadgeStyles } from "@/lib/badge-style";
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

/* ──────────────────────── DESKTOP (Sprint PIN-FIXED) ────────────────── */

type PinState = "before" | "during" | "after";

function FeaturedDesktop({ items }: Props) {
  const t = useTranslations("featured");
  const outerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // Sprint PIN-FIXED — pin scroll-hijack robuste via position:fixed
  // piloté JS. Validé sur /fr/test-scroll (mesures Chrome devtools +
  // captures confirmant pin visuel à scrollY 800/1000/1500/2000/3000/
  // 5000/7500 + transition vers state AFTER à 8500). Pattern :
  //
  //  - Outer wrapper : height = DIVISOR * 100vh, position: relative.
  //  - Section : 3 états pilotés en JS (rAF, scrollY + outer rect) :
  //      * BEFORE : in-flow au top de l'outer (aucun override).
  //      * DURING : position:fixed; top:0; left:0; right:0; height:100vh.
  //      * AFTER  : position:absolute; bottom:0 (collée au fond outer).
  //  - Pendant DURING : translateX track = -progress * maxX avec
  //      progress = (-outerTop) / (outerHeight - vh) clampé [0..1].
  //
  // Robuste : insensible aux parents transformés / overflow (sticky CSS
  // échouait à cause d'ancêtres avec transform — diagnostic prod).
  //
  // Reduced-motion : pas de pin, fallback flux normal + scroll horizontal
  // manuel (overflow-x:auto par défaut CSS sur trackRef).
  // SSR-safe : tous les styles pin appliqués post-mount uniquement.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!outerRef.current || !sectionRef.current || !trackRef.current) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;
    if (reduced) return;

    const outer = outerRef.current;
    const section = sectionRef.current;
    const track = trackRef.current;

    const DIVISOR = 9;

    outer.style.position = "relative";
    outer.style.height = `${DIVISOR * 100}vh`;
    section.style.height = "100vh";
    section.style.width = "100%";
    track.style.overflowX = "visible";
    track.style.width = "max-content";
    track.style.willChange = "transform";

    let raf = 0;
    let resizeRaf = 0;
    let lastY = -1;
    let lastState: PinState | null = null;

    const applyState = (state: PinState) => {
      if (state === lastState) return;
      lastState = state;
      // Reset positioning props avant nouvelle pose.
      section.style.position = "";
      section.style.top = "";
      section.style.bottom = "";
      section.style.left = "";
      section.style.right = "";

      if (state === "before") {
        // In-flow au top de l'outer. Aucun override.
      } else if (state === "during") {
        section.style.position = "fixed";
        section.style.top = "0";
        section.style.left = "0";
        section.style.right = "0";
      } else {
        // after
        section.style.position = "absolute";
        section.style.bottom = "0";
        section.style.left = "0";
        section.style.right = "0";
      }
    };

    const tick = () => {
      const y = window.scrollY;
      if (y === lastY) {
        raf = window.requestAnimationFrame(tick);
        return;
      }
      lastY = y;

      const outerRect = outer.getBoundingClientRect();
      const vh = window.innerHeight;
      const outerHeight = outer.offsetHeight;

      // Détermine l'état du pin.
      let state: PinState;
      if (outerRect.top > 0) {
        state = "before";
      } else if (outerRect.bottom > vh) {
        state = "during";
      } else {
        state = "after";
      }
      applyState(state);

      // Progression et translateX.
      const courseLength = outerHeight - vh;
      const scrolledIntoOuter = -outerRect.top;
      const progress =
        courseLength > 0
          ? Math.max(0, Math.min(1, scrolledIntoOuter / courseLength))
          : 0;
      const maxX = Math.max(0, track.scrollWidth - window.innerWidth);
      track.style.transform = `translate3d(${-progress * maxX}px, 0, 0)`;

      raf = window.requestAnimationFrame(tick);
    };

    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = window.requestAnimationFrame(() => {
        resizeRaf = 0;
        lastY = -1; // force recompute au prochain tick
      });
    };

    window.addEventListener("resize", onResize, { passive: true });
    raf = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(raf);
      if (resizeRaf) window.cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onResize);
      outer.style.position = "";
      outer.style.height = "";
      section.style.position = "";
      section.style.top = "";
      section.style.bottom = "";
      section.style.left = "";
      section.style.right = "";
      section.style.height = "";
      section.style.width = "";
      track.style.overflowX = "";
      track.style.width = "";
      track.style.transform = "";
      track.style.willChange = "";
    };
  }, []);

  return (
    <div ref={outerRef}>
      <section
        ref={sectionRef}
        className="flex min-h-screen flex-col justify-center overflow-hidden bg-bg py-5 md:py-12"
      >
        <div className="mx-auto w-full max-w-[1400px] px-6 lg:px-10">
          <FeaturedHeader t={t} />
        </div>
        <div
          ref={trackRef}
          className="mt-6 flex gap-5 overflow-x-auto pb-4 md:mt-8 md:gap-6 lg:px-[8vw]"
          style={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          <div className="flex gap-5 md:gap-6">
            {items.map((item) => (
              <article
                key={`${item.kind}-${item.id}`}
                className="w-[78vw] shrink-0 sm:w-[48vw] lg:w-[400px]"
              >
                <FeaturedCard item={item} />
              </article>
            ))}
          </div>
          <ViewAllCTA label={t("see_all")} />
          {/* Sprint PIN-FIXED : marge de fin 22vw → CTA pleinement
              révélé à progress=1 (validé maquette + /test-scroll). */}
          <div aria-hidden className="w-[22vw] shrink-0" />
        </div>
      </section>
    </div>
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
      <div className="relative h-52 overflow-hidden bg-bg-deep sm:h-auto sm:aspect-[4/3]">
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
        {isOffmarket && (
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
        )}
        {/* Sprint badges commerciaux : badge admin-driven sur biens apimo
            uniquement (offmarket conserve sa pilule cuivre ci-dessus). */}
        {!isOffmarket && (() => {
          const b = resolveBadgeStyles(
            item.badge,
            item.badge_size,
            item.badge_position,
          );
          if (!b) return null;
          return (
            <span
              className={`absolute rounded-full font-mono uppercase backdrop-blur ${b.sizeClass} ${b.positionClass}`}
              style={b.inlineStyle}
            >
              {item.badge}
            </span>
          );
        })()}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5 md:gap-2 md:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
          {[item.country, item.city].filter(Boolean).join(" · ") || "—"}
        </p>
        <h3 className="line-clamp-2 font-display text-xl font-bold leading-tight text-ink group-hover:text-gold-deep">
          {item.title ?? "—"}
        </h3>
        <div className="mt-auto flex items-baseline justify-between gap-3">
          <p className="font-display text-lg font-bold gold-text">
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
