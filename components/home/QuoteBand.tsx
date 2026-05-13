import { useTranslations } from "next-intl";

export function QuoteBand() {
  const t = useTranslations("quote_band");

  return (
    <section className="bg-bg-soft px-6 py-6 md:py-24 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <span aria-hidden className="font-display text-5xl text-gold-deep md:text-7xl">
          “
        </span>
        <blockquote className="font-display text-xl font-bold leading-tight text-ink md:text-3xl lg:text-4xl">
          {t("text")}
        </blockquote>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:mt-6 md:text-xs">
          — {t("attribution")}
        </p>
      </div>
    </section>
  );
}
