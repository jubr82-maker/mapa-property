import { useTranslations } from "next-intl";

const steps = ["one", "two", "three"] as const;

export function ProcessTable() {
  const t = useTranslations("process");

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
        </header>

        <ol className="grid divide-y divide-line border-y border-line lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {steps.map((s, idx) => (
            <li key={s} className="flex flex-col gap-4 py-8 lg:px-8">
              <span className="font-display text-7xl font-black leading-none gold-text">
                0{idx + 1}
              </span>
              <h3 className="font-display text-2xl font-bold text-ink">
                {t(`step_${s}_title`)}
              </h3>
              <p className="text-sm leading-relaxed text-ink-mid">
                {t(`step_${s}_text`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
