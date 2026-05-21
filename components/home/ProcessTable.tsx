import { useTranslations } from "next-intl";
import { FadeInOnScroll } from "@/components/ui/FadeInOnScroll";

const steps = ["one", "two", "three"] as const;

export function ProcessTable() {
  const t = useTranslations("process");

  return (
    <section className="px-6 py-5 md:py-20 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-4 max-w-2xl md:mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 t-h2">
            {t("title")}
          </h2>
        </header>

        {/* STEP3b : sémantique liste préservée via role=list/listitem
            (FadeInOnScroll = div wrapper) — divide-x/divide-y s'appliquent
            sur enfants directs FadeInOnScroll. */}
        <div
          role="list"
          className="grid divide-y divide-line border-y border-line lg:grid-cols-3 lg:divide-x lg:divide-y-0"
        >
          {/* STEP3c-1 : slide-up stagger 400ms par etape (ralenti cinematique). */}
          {steps.map((s, idx) => (
            <FadeInOnScroll key={s} delay={idx * 400} y={40}>
              <div
                role="listitem"
                className="grid grid-cols-[auto_1fr] items-baseline gap-x-4 gap-y-1 py-4 md:flex md:flex-col md:gap-3 md:py-6 lg:px-8"
              >
                <span className="font-display text-5xl font-black leading-none gold-text md:text-6xl">
                  0{idx + 1}
                </span>
                <h3 className="font-display text-lg font-medium text-ink md:text-2xl">
                  {t(`step_${s}_title`)}
                </h3>
                <p className="col-span-2 text-sm leading-relaxed text-ink-mid md:col-span-1">
                  {t(`step_${s}_text`)}
                </p>
              </div>
            </FadeInOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
