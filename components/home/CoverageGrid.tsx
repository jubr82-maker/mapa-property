import { useTranslations } from "next-intl";
import { HoverFlipCard } from "@/components/ui/HoverFlipCard";

const typologies = [
  {
    key: "luxembourg",
    items: ["luxembourg_1", "luxembourg_2", "luxembourg_3", "luxembourg_4"],
  },
  {
    key: "trophy",
    items: ["trophy_1", "trophy_2", "trophy_3", "trophy_4"],
  },
  {
    key: "secondary",
    items: ["secondary_1", "secondary_2", "secondary_3", "secondary_4"],
  },
  {
    key: "investment",
    items: ["investment_1", "investment_2", "investment_3", "investment_4"],
  },
] as const;

export function CoverageGrid() {
  const t = useTranslations("coverage");

  return (
    <section className="bg-bg-soft px-6 py-6 md:py-20 lg:px-10 lg:py-28">
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

        <div className="grid gap-3 sm:grid-cols-2 md:gap-5 lg:grid-cols-4">
          {typologies.map((typo) => (
            <HoverFlipCard
              key={typo.key}
              height="h-72"
              front={
                <div className="flex size-full flex-col justify-between rounded-xl border border-line bg-bg p-6">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                    {t(`${typo.key}_label`)}
                  </span>
                  <h3 className="font-display text-3xl font-black leading-tight text-ink">
                    {t(`${typo.key}_title`)}
                  </h3>
                  <span className="self-end font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
                    {t("hover_hint")} →
                  </span>
                </div>
              }
              back={
                <div className="flex size-full flex-col gap-3 rounded-xl border border-gold bg-ink p-6 text-bg">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-bright">
                    {t(`${typo.key}_label`)}
                  </span>
                  <h3 className="font-display text-2xl font-black leading-tight">
                    {t(`${typo.key}_title`)}
                  </h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-bg/85">
                    {typo.items.map((it) => (
                      <li key={it} className="flex gap-2 leading-snug">
                        <span aria-hidden className="text-gold-bright">
                          ›
                        </span>
                        {t(it)}
                      </li>
                    ))}
                  </ul>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </section>
  );
}
