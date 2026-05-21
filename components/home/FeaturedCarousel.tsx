"use client";

/**
 * STEP3c-RECODE — Featured carousel simple : scroll horizontal natif +
 * stagger IntersectionObserver.
 *
 * Embla + Autoplay supprimes (rollback decisions STEP3c-2 → 3c-FIX2).
 * Architecture epurée :
 *   - Layout : header compact + track horizontal overflow-x avec
 *     scroll-snap mandatory (swipe natif touch + scroll souris desktop)
 *   - Cards initiales (style inline) : opacity 0 + translateX -80px
 *     + transition CSS delayed (i * 0.3s)
 *   - IntersectionObserver : a l'entree dans le viewport (threshold 0.15),
 *     toggle opacity 1 + translateX 0 → chaque card glisse depuis la
 *     gauche en stagger 300ms
 *   - Bouton final 'Voir tous nos biens' lime mur #CFE542 avec halo
 *     permanent (.cta-lime-glow)
 *   - prefers-reduced-motion : cards visibles immediates (skip stagger)
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
  const trackRef = useRef<HTMLDivElement>(null);

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

    cards.forEach((card, i) => {
      card.style.opacity = "0";
      card.style.transform = "translateX(-80px)";
      card.style.transition =
        "opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1)";
      card.style.transitionDelay = `${i * 0.3}s`;
      card.style.willChange = "opacity, transform";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          cards.forEach((card) => {
            card.style.opacity = "1";
            card.style.transform = "translateX(0)";
          });
          observer.disconnect();
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -100px 0px" },
    );

    observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="px-6 py-5 md:py-12 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        {/* STEP3c-RECODE : compactage marges header (mb-4/mb-10 → mb-2/mb-4) */}
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

      {/* Track horizontal : overflow-x:auto + scroll-snap. Pas de pin scroll
          ni JS de translateX — scroll natif. */}
      <div
        ref={trackRef}
        className="mt-6 flex gap-5 overflow-x-auto pb-4 md:mt-8 md:gap-6 lg:px-[8vw]"
        style={{
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
        }}
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
        <ViewAllCTA label={t("see_all")} />
      </div>
    </section>
  );
}

function ViewAllCTA({ label }: { label: string }) {
  // Bouton 'Voir tous nos biens' rendu en fin de track — toujours visible
  // apres scroll horizontal. Halo lime mur permanent via .cta-lime-glow
  // (defini globals.css STEP3b).
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
