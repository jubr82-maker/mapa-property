import { useTranslations } from "next-intl";

const services = [
  "transaction",
  "search",
  "international",
  "negotiation",
  "rental",
  "valuation",
] as const;

export function ServicesTable() {
  const t = useTranslations("services_home");

  return (
    <section className="px-6 py-6 md:py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6 max-w-2xl md:mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-black leading-tight tracking-tight text-ink md:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-xs text-ink-mid md:text-base">{t("subtitle")}</p>
        </header>

        <div className="grid divide-y divide-line border-y border-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {services.map((s, idx) => (
            <article
              key={s}
              className="group flex items-start gap-3 py-4 md:gap-6 md:py-7 lg:px-8"
            >
              <span className="font-mono text-[10px] text-ink-soft shrink-0 w-8 pt-1 md:w-10 md:text-xs">
                0{idx + 1}.
              </span>
              <div className="flex-1">
                <h3 className="font-display text-base font-bold leading-tight text-ink group-hover:text-gold-deep md:text-2xl">
                  {t(`${s}_title`)}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-ink-mid md:text-sm">
                  {t(`${s}_text`)}
                </p>
              </div>
              <span
                aria-hidden
                className="font-display text-base text-gold-deep opacity-0 transition-opacity group-hover:opacity-100 md:text-xl"
              >
                →
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
