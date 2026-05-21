"use client";

/**
 * SPRINT1 — Featured polish desktop : ralenti + parallax lateral + bidirectionnel.
 *
 * Comportement (ordre temporel) :
 *  1. Stagger d'apparition : cards en opacity 0 + translateX -80px,
 *     IntersectionObserver à threshold 0.15. À l'entrée → reveal
 *     stagger 600ms (vs 300ms STEP3c-RECODE), transition CSS 1000ms
 *     (vs 700ms). Bidirectionnel : à la sortie viewport, disparition
 *     stagger inverse 200ms (droite→gauche).
 *  2. Parallax X scroll-piloté : un wrapper [data-featured-inner] reçoit
 *     translateX -200px max selon la position de la section dans le
 *     viewport. Le track parent garde son scroll horizontal natif
 *     (overflow-x), le parallax X se compose dessus.
 *  3. Bouton CTA hors [data-featured-inner] → ne subit pas le parallax,
 *     reste atteignable à droite après scroll natif.
 *
 * Pill OFF-MARKET : couleur custom palette Forêt (cuivre citron #D4A574,
 * background rgba 0.15, border rgba 0.5) — appliquée dans FeaturedCard.
 */

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { HomeFeatured } from "@/lib/data";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { OffmarketPlaceholder } from "@/components/property/OffmarketPlaceholder";

interface Props {
  items: HomeFeatured[];
}

export function FeaturedCarousel({ items }: Props) {
  const t = useTranslations("featured");
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  // Stagger d'apparition + bidirectionnel
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

    // SPRINT1 : bidirectionnel — observer reste actif (pas de disconnect).
    // À l'entrée : reveal stagger 600ms gauche→droite.
    // À la sortie : hide stagger inverse 200ms (droite→gauche s'efface).
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

  // SPRINT1 : parallax X scroll-piloté sur [data-featured-inner].
  // Le track parent garde son scroll horizontal natif ; le parallax X
  // se compose dessus via transform sur l'inner.
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
        // Drift -200px de droite a gauche sur toute la traversee viewport
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

  if (items.length === 0) return null;

  return (
    <section ref={sectionRef} className="px-6 py-5 md:py-12 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
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
      </div>

      {/* Track : overflow-x natif scroll-snap. L'inner [data-featured-inner]
          reçoit le parallax X au scroll vertical. Le CTA est OUT de l'inner
          pour ne pas subir le drift et rester atteignable à droite. */}
      <div
        ref={trackRef}
        className="mt-6 flex gap-5 overflow-x-auto pb-4 md:mt-8 md:gap-6 lg:px-[8vw]"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
      >
        <div
          ref={innerRef}
          data-featured-inner
          className="flex gap-5 md:gap-6"
        >
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

function ViewAllCTA({ label }: { label: string }) {
  return (
    <div
      style={{ scrollSnapAlign: "start" }}
      className="flex w-[78vw] shrink-0 items-center justify-center sm:w-[48vw] lg:w-[400px]"
    >
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
          />
        ) : item.cover_url ? (
          <Image
            src={item.cover_url}
            alt={item.title ?? ""}
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 48vw, 78vw"
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
        {/* SPRINT1 : pill OFF-MARKET / APIMO — couleur palette Forêt
            cuivre citron #D4A574 inline (background rgba 0.15, border
            rgba 0.5, color D4A574). Pour APIMO : utilitaires Tailwind
            classiques (token text-text-contrast). */}
        {isOffmarket ? (
          <span
            className="absolute right-3 top-3 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.15em] backdrop-blur"
            style={{
              backgroundColor: "rgba(212, 165, 116, 0.15)",
              borderColor: "rgba(212, 165, 116, 0.5)",
              color: "#D4A574",
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
