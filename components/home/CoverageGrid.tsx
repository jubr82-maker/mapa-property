"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { HoverFlipCard } from "@/components/ui/HoverFlipCard";
import { SignatureLine } from "@/components/ui/SignatureLine";

const typologies = [
  {
    key: "luxembourg",
    items: ["luxembourg_1", "luxembourg_2", "luxembourg_3", "luxembourg_4"],
  },
  {
    key: "trophy",
    items: ["trophy_1", "trophy_2", "trophy_3", "trophy_4"],
  },
  {
    key: "secondary",
    items: ["secondary_1", "secondary_2", "secondary_3", "secondary_4"],
  },
  {
    key: "investment",
    items: ["investment_1", "investment_2", "investment_3", "investment_4"],
  },
] as const;

type TypoKey = (typeof typologies)[number]["key"];

export function CoverageGrid() {
  const t = useTranslations("coverage");
  const [expandedKey, setExpandedKey] = useState<TypoKey | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(hover: none), (max-width: 767px)");
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return (
    <section className="bg-bg px-6 py-5 md:py-20 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-4 max-w-2xl md:mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 t-h2">
            {t("title")}
          </h2>
          <SignatureLine />
          <p className="mt-3 text-sm text-ink-mid md:text-base">{t("subtitle")}</p>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-5 lg:grid-cols-4">
          {typologies.map((typo) => {
            const isFlipped = isMobile && expandedKey === typo.key;
            return (
              <HoverFlipCard
                key={typo.key}
                height="h-40 sm:h-52 md:h-64"
                flipped={isMobile ? expandedKey === typo.key : undefined}
                onFlipToggle={
                  isMobile
                    ? () =>
                        setExpandedKey((prev) =>
                          prev === typo.key ? null : typo.key,
                        )
                    : undefined
                }
                ariaLabel={`${t(`${typo.key}_title`)} — ${
                  isFlipped ? t("show_less") : t("show_more")
                }`}
                front={
                  <div className="flex size-full flex-col justify-between rounded-xl border border-border-subtle bg-bg p-5 md:p-6">
                    <span className="font-mono text-[10px] font-light uppercase tracking-[0.3em] text-gold-deep">
                      {t(`${typo.key}_label`)}
                    </span>
                    <h3 className="font-display text-lg font-black leading-tight text-ink sm:text-2xl md:text-3xl">
                      {t(`${typo.key}_title`)}
                    </h3>
                    {/* Desktop: hint discret "Survolez →" */}
                    <span className="hidden self-end font-mono text-xs uppercase tracking-[0.25em] text-ink-soft md:block">
                      {t("hover_hint")} →
                    </span>
                    {/* Mobile: CTA accordéon "+" / VOIR PLUS */}
                    <span className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-gold-deep md:hidden">
                      <span>{t("show_more")}</span>
                      <span
                        aria-hidden
                        className="flex size-6 items-center justify-center rounded-full border border-gold/60 text-base leading-none"
                      >
                        +
                      </span>
                    </span>
                  </div>
                }
                back={
                  <div className="flex size-full flex-col gap-2 rounded-xl border border-gold bg-bg-contrast p-5 text-text-contrast md:gap-3 md:p-6">
                    <span className="font-mono text-[10px] font-light uppercase tracking-[0.3em] text-gold-bright">
                      {t(`${typo.key}_label`)}
                    </span>
                    <h3 className="font-display text-xl font-black leading-tight md:text-2xl">
                      {t(`${typo.key}_title`)}
                    </h3>
                    <ul className="mt-1 space-y-1 text-xs text-text-contrast/85 md:mt-2 md:space-y-1.5 md:text-sm">
                      {typo.items.map((it) => (
                        <li key={it} className="flex gap-2 leading-snug">
                          <span aria-hidden className="text-gold-bright">
                            ›
                          </span>
                          {t(it)}
                        </li>
                      ))}
                    </ul>
                    {/* Mobile: CTA fermer "−" / FERMER */}
                    <span className="mt-auto flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.25em] text-gold-bright md:hidden">
                      <span>{t("show_less")}</span>
                      <span
                        aria-hidden
                        className="flex size-6 items-center justify-center rounded-full border border-gold-bright/60 text-base leading-none"
                      >
                        −
                      </span>
                    </span>
                  </div>
                }
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
