"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MandateDetailModal, type MandateModalData } from "@/components/MandateDetailModal";

type MandateId = "exclusif" | "semi" | "simple" | "autonome";

type MandateCard = {
  id: MandateId;
  slug: string;
  accent: string;
  accentDark: string;
  isFeatured: boolean;
};

const CARDS: MandateCard[] = [
  {
    id: "exclusif",
    slug: "exclusif",
    accent: "#B8865A",
    accentDark: "#8B6635",
    isFeatured: true,
  },
  {
    id: "semi",
    slug: "semi-exclusif",
    accent: "#3D4F63",
    accentDark: "#2A3848",
    isFeatured: false,
  },
  {
    id: "simple",
    slug: "simple",
    accent: "#3D4F63",
    accentDark: "#2A3848",
    isFeatured: false,
  },
  {
    id: "autonome",
    slug: "autonome",
    accent: "#3D4F63",
    accentDark: "#2A3848",
    isFeatured: false,
  },
];

export function MandatesPremium() {
  const t = useTranslations("mandates_premium");
  const [openId, setOpenId] = useState<MandateId | null>(null);

  const cards = CARDS.map((card) => {
    const ns = card.id; // exclusif | semi | simple | autonome
    const bullets = [
      t(`${ns}.bullet_1`),
      t(`${ns}.bullet_2`),
      t(`${ns}.bullet_3`),
      t(`${ns}.bullet_4`),
    ];
    return {
      ...card,
      eyebrow: t(`${ns}.eyebrow`),
      title: t(`${ns}.title`),
      rate: t(`${ns}.rate`),
      rateSuffix: t(`${ns}.rate_suffix`),
      shortDesc: t(`${ns}.short_desc`),
      longDesc: t(`${ns}.long_desc`),
      bullets,
    };
  });

  const activeCard = cards.find((c) => c.id === openId) ?? null;
  const modalData: MandateModalData | null = activeCard
    ? {
        id: activeCard.id,
        eyebrow: activeCard.eyebrow,
        title: activeCard.title,
        rate: activeCard.rate,
        rateSuffix: activeCard.rateSuffix,
        longDesc: activeCard.longDesc,
        bullets: activeCard.bullets,
        ctaHref: `/mandats/${activeCard.slug}`,
        ctaLabel: t("modal_cta"),
        closeLabel: t("modal_close"),
        accent: activeCard.accent,
      }
    : null;

  return (
    <section className="px-6 py-6 md:py-20 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-8 max-w-3xl md:mb-12">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-black leading-tight tracking-tight text-ink md:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-sm text-ink-mid md:text-base">
            {t("subtitle")}
          </p>
        </header>

        <div className="grid gap-3 md:grid-cols-2 md:gap-5 lg:grid-cols-4">
          {cards.map((card) => {
            const isCopper = card.isFeatured;
            return (
              <article
                key={card.id}
                className="relative flex h-[280px] flex-col gap-3 overflow-hidden rounded-2xl p-5 text-white shadow-lg md:h-[320px] md:p-6"
                style={{
                  backgroundImage: `linear-gradient(135deg, ${card.accent} 0%, ${card.accentDark} 100%)`,
                  border: isCopper ? undefined : "2px solid #B8865A",
                }}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full blur-3xl"
                  style={{
                    backgroundColor: isCopper
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(184, 134, 90, 0.15)",
                  }}
                />

                <span
                  className="relative inline-flex w-fit items-center font-mono text-[10px] font-semibold uppercase tracking-[0.3em]"
                  style={{ color: isCopper ? "#ffffff" : "#B8865A" }}
                >
                  {card.eyebrow}
                </span>

                <h3 className="relative font-display text-2xl font-black leading-tight text-white md:text-3xl">
                  {card.title}
                </h3>

                <div className="relative flex items-baseline gap-2">
                  <span
                    className="font-display text-4xl font-black md:text-5xl"
                    style={{ color: isCopper ? "#ffffff" : "#B8865A" }}
                  >
                    {card.rate}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/75 md:text-[10px]">
                    {card.rateSuffix}
                  </span>
                </div>

                <p className="relative line-clamp-2 text-xs leading-relaxed text-white/85 md:text-sm">
                  {card.shortDesc}
                </p>

                <button
                  type="button"
                  onClick={() => setOpenId(card.id)}
                  className="relative mt-auto inline-flex w-fit items-center gap-2 rounded-full border border-white/40 bg-white/0 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition-all hover:border-white hover:bg-white/10 md:text-[11px]"
                  aria-haspopup="dialog"
                  aria-expanded={openId === card.id}
                >
                  {t("more_info")}
                  <span aria-hidden>→</span>
                </button>
              </article>
            );
          })}
        </div>
      </div>

      <MandateDetailModal
        mandate={modalData}
        open={openId !== null}
        onClose={() => setOpenId(null)}
      />
    </section>
  );
}
