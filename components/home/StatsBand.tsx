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
    <section className="bg-ink px-6 py-20 text-bg lg:px-10 lg:py-24">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-12 max-w-xl font-mono text-xs uppercase tracking-[0.3em] text-gold-bright">
          {t("eyebrow")}
        </p>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.key} className="border-t border-bg/15 pt-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-bg/50">
                {t(`${s.key}_label`)}
              </p>
              <p className="mt-3 font-display text-6xl font-black leading-none tracking-tight">
                <span className="gold-text">{s.value}</span>
                {s.suffix && (
                  <span className="ml-2 font-mono text-base font-medium text-bg/50">
                    {s.suffix}
                  </span>
                )}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-bg/70">
                {t(`${s.key}_text`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
