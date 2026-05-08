import { useTranslations } from "next-intl";

export function QuoteBand() {
  const t = useTranslations("quote_band");

  return (
    <section className="bg-bg-soft px-6 py-24 lg:px-10 lg:py-32">
      <div className="mx-auto max-w-3xl text-center">
        <span aria-hidden className="font-display text-7xl text-gold-deep">
          “
        </span>
        <blockquote className="font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
          {t("text")}
        </blockquote>
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
          — {t("attribution")}
        </p>
      </div>
    </section>
  );
}
