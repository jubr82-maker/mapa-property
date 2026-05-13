import { useTranslations } from "next-intl";

const steps = ["one", "two", "three"] as const;

export function ProcessTable() {
  const t = useTranslations("process");

  return (
    <section className="px-6 py-6 md:py-20 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-6 max-w-2xl md:mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
            {t("eyebrow")}
          </p>
          <h2 className="mt-2 font-display text-2xl font-black leading-tight tracking-tight text-ink md:text-5xl">
            {t("title")}
          </h2>
        </header>

        <ol className="grid divide-y divide-line border-y border-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {steps.map((s, idx) => (
            <li key={s} className="flex flex-col gap-3 py-5 md:gap-3 md:py-6 lg:px-8">
              <span className="font-display text-5xl font-black leading-none gold-text md:text-6xl">
                0{idx + 1}
              </span>
              <h3 className="font-display text-xl font-medium text-ink md:text-2xl">
                {t(`step_${s}_title`)}
              </h3>
              <p className="text-xs leading-relaxed text-ink-mid md:text-sm">
                {t(`step_${s}_text`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
