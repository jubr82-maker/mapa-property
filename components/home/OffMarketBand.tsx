import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function OffMarketBand() {
  const t = useTranslations("offmarket_band");

  return (
    <section className="relative overflow-hidden bg-ink px-6 py-6 text-bg md:py-20 lg:px-10 lg:py-20">
      <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-32 -bottom-32 size-96 rounded-full bg-accent-warm/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-[1400px] gap-3 md:gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-bright md:text-xs">
            {t("eyebrow")}
          </p>
          <h2 className="mt-3 font-display text-2xl font-black leading-tight tracking-tight md:text-5xl lg:text-6xl">
            {t("title")}
          </h2>
          <p className="mt-3 max-w-xl text-xs leading-relaxed text-bg/80 md:mt-5 md:text-base">
            {t("description")}
          </p>
        </div>

        <div className="flex flex-col gap-3 md:gap-4 lg:items-end">
          <ul className="space-y-2 font-mono text-[10px] uppercase tracking-[0.2em] text-bg/70 md:space-y-3 md:text-xs">
            <li className="flex items-center gap-3 lg:justify-end">
              <span className="size-1.5 rounded-full bg-gold-bright" />
              {t("benefit_1")}
            </li>
            <li className="flex items-center gap-3 lg:justify-end">
              <span className="size-1.5 rounded-full bg-gold-bright" />
              {t("benefit_2")}
            </li>
            <li className="flex items-center gap-3 lg:justify-end">
              <span className="size-1.5 rounded-full bg-gold-bright" />
              {t("benefit_3")}
            </li>
          </ul>

          <Link
            href="/off-market"
            className="gold-shine-bg inline-flex items-center gap-2 self-start rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] lg:self-end"
          >
            {t("cta")}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
