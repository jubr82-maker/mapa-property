"use client";

/**
 * STEP3c-2 — Featured horizontal pin scroll (Apple Pro style desktop-A).
 *
 * Embla + Autoplay supprimes : le defilement horizontal est desormais
 * pilote par le scroll vertical via FeaturedPinScroll (desktop-A) ou
 * via swipe natif touch + scroll-snap CSS (tablet-A-light, mobile-B).
 *
 * Le bouton final "Voir tous nos biens" est rendu en derniere card du
 * track avec data-featured-cta — FeaturedPinScroll lui applique scale
 * 1.0 → 1.4 + halo lime mur dans le dernier 15% du scroll desktop.
 */

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { HomeFeatured } from "@/lib/data";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { OffmarketPlaceholder } from "@/components/property/OffmarketPlaceholder";
import { FeaturedPinScroll } from "@/components/home/FeaturedPinScroll";

interface Props {
  items: HomeFeatured[];
}

export function FeaturedCarousel({ items }: Props) {
  const t = useTranslations("featured");

  if (items.length === 0) return null;

  return (
    <section className="px-6 py-5 md:py-12 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between md:mb-10">
          <div>
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
      </div>

      <FeaturedPinScroll cardsCount={items.length}>
        {items.map((item) => (
          <article
            key={`${item.kind}-${item.id}`}
            className="featured-card w-[78vw] shrink-0 sm:w-[48vw] lg:w-[420px]"
          >
            <FeaturedCard item={item} />
          </article>
        ))}
        <ViewAllCTA label={t("see_all")} />
      </FeaturedPinScroll>
    </section>
  );
}

function ViewAllCTA({ label }: { label: string }) {
  return (
    <div className="featured-cta-slot flex w-[78vw] shrink-0 items-center justify-center sm:w-[48vw] lg:w-[420px]">
      <Link
        href="/biens"
        data-featured-cta
        className="inline-flex items-center gap-3 rounded-full bg-[#CFE542] px-8 py-5 font-mono text-xs font-bold uppercase tracking-[0.25em] text-[#1F221A] transition-transform"
        style={{
          opacity: 0.7,
          willChange: "transform, opacity, box-shadow",
        }}
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
            sizes="(min-width: 1024px) 420px, (min-width: 640px) 48vw, 78vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at center, #1a2332 0%, #0d1419 100%)",
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
