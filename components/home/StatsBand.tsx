import { useTranslations } from "next-intl";

const stats = [
  { key: "experience", value: "8+", suffix: "y" },
  { key: "communes", value: "24", suffix: "LU" },
  { key: "cities", value: "28", suffix: "INTL" },
  { key: "transactions", value: "100s", suffix: "" },
] as const;

export function StatsBand() {
  const t = useTranslations("stats");

  return (
    <section className="bg-ink px-6 py-6 text-bg md:py-20 lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-6 max-w-xl font-mono text-[10px] uppercase tracking-[0.3em] text-gold-bright md:mb-12 md:text-xs">
          {t("eyebrow")}
        </p>

        <div className="grid gap-5 sm:grid-cols-2 md:gap-10 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.key} className="border-t border-bg/15 pt-4 md:pt-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-bg/50 md:text-[10px]">
                {t(`${s.key}_label`)}
              </p>
              <p className="mt-2 font-display text-4xl font-black leading-none tracking-tight md:mt-3 md:text-6xl">
                <span className="gold-text">{s.value}</span>
                {s.suffix && (
                  <span className="ml-2 font-mono text-xs font-medium text-bg/50 md:text-base">
                    {s.suffix}
                  </span>
                )}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-bg/70 md:mt-3 md:text-sm">
                {t(`${s.key}_text`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
