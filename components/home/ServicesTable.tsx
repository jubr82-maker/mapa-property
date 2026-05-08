import { useTranslations } from "next-intl";

const services = [
  "valuation",
  "search",
  "negotiation",
  "transaction",
  "rental",
  "international",
] as const;

export function ServicesTable() {
  const t = useTranslations("services_home");

  return (
    <section className="px-6 py-20 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-12 max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-4xl font-black leading-tight tracking-tight text-ink sm:text-5xl">
            {t("title")}
          </h2>
          <p className="mt-3 text-base text-ink-mid">{t("subtitle")}</p>
        </header>

        <div className="grid divide-y divide-line border-y border-line lg:grid-cols-2 lg:divide-x lg:divide-y-0">
          {services.map((s, idx) => (
            <article
              key={s}
              className="group flex items-start gap-6 py-7 lg:px-8"
            >
              <span className="font-mono text-xs text-ink-soft shrink-0 w-10 pt-1">
                0{idx + 1}.
              </span>
              <div className="flex-1">
                <h3 className="font-display text-2xl font-bold leading-tight text-ink group-hover:text-gold-deep">
                  {t(`${s}_title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-mid">
                  {t(`${s}_text`)}
                </p>
              </div>
              <span
                aria-hidden
                className="font-display text-xl text-gold-deep opacity-0 transition-opacity group-hover:opacity-100"
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
