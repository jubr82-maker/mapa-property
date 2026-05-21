import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { HoverFlipCard } from "@/components/ui/HoverFlipCard";
import { FadeInOnScroll } from "@/components/ui/FadeInOnScroll";

const mandates = [
  { key: "exclusive", href: "/mandats/exclusif", rate: "3%", featured: true },
  { key: "semi", href: "/mandats/semi-exclusif", rate: "4%", featured: false },
  { key: "simple", href: "/mandats/simple", rate: "5%", featured: false },
  { key: "autonomous", href: "/mandats/autonome", rate: "1%", featured: false },
] as const;

export function MandatesGrid() {
  const t = useTranslations("mandates_home");

  return (
    <section className="px-6 py-5 md:py-16 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-5 max-w-2xl md:mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 t-h2">
            {t("title")}
          </h2>
          <p className="mt-2 text-sm text-ink-mid">{t("subtitle")}</p>
        </header>

        <div className="grid grid-cols-2 gap-2 md:gap-3 lg:grid-cols-4">
          {/* STEP3c-1 : stagger 250ms par carte (ralenti cinematique). */}
          {mandates.map((m, idx) => (
            <FadeInOnScroll key={m.key} delay={idx * 250} y={30}>
            <HoverFlipCard
              height="h-36 sm:h-44 md:h-48"
              front={
                <div
                  className={`relative flex size-full flex-col justify-between rounded-lg p-3 md:p-4 ${
                    m.featured
                      ? "border-2 border-gold bg-bg-contrast text-text-contrast"
                      : "border border-border-subtle bg-bg"
                  }`}
                >
                  {m.featured && (
                    <span className="absolute -top-2 left-3 rounded-full bg-gold px-2 py-0.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-bg">
                      {t("featured_badge")}
                    </span>
                  )}
                  <div>
                    <span
                      className={`font-mono text-[9px] uppercase tracking-[0.25em] ${
                        m.featured ? "text-gold-bright" : "text-gold-deep"
                      }`}
                    >
                      {t("type_label")}
                    </span>
                    <h3
                      className={`mt-1 font-display text-lg font-black leading-tight md:text-xl ${
                        m.featured ? "text-text-contrast" : "text-ink"
                      }`}
                    >
                      {t(`${m.key}_title`)}
                    </h3>
                  </div>
                  <div>
                    <span
                      className={`block font-mono text-[8px] uppercase tracking-[0.25em] ${
                        m.featured ? "text-text-contrast/60" : "text-ink-soft"
                      }`}
                    >
                      {t("rate_label")}
                    </span>
                    <span
                      className={`mt-0.5 block font-display text-2xl font-black md:text-3xl ${
                        m.featured ? "text-gold-bright" : "gold-text"
                      }`}
                    >
                      {m.rate}
                    </span>
                  </div>
                </div>
              }
              back={
                <div
                  className={`flex size-full flex-col gap-1.5 rounded-lg p-3 md:p-4 ${
                    m.featured
                      ? "border-2 border-gold bg-bg-contrast text-text-contrast"
                      : "border border-gold bg-bg-contrast text-text-contrast"
                  }`}
                >
                  <h3 className="font-display text-base font-black leading-tight md:text-lg">
                    {t(`${m.key}_title`)}
                  </h3>
                  <p className="text-[11px] leading-snug text-text-contrast/80 md:text-xs">
                    {t(`${m.key}_text`)}
                  </p>
                  <Link
                    href={m.href}
                    className="mt-auto inline-flex items-center gap-1 self-start font-mono text-[9px] uppercase tracking-[0.2em] text-gold-bright hover:text-text-contrast md:text-[10px]"
                  >
                    {t("learn_more")} →
                  </Link>
                </div>
              }
            />
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
