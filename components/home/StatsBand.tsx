import { getTranslations } from "next-intl/server";
import { siteContent } from "@/lib/site-content";

const stats = [
  { key: "experience", value: "8+", suffix: "y" },
  { key: "communes", value: "24", suffix: "LU" },
  { key: "cities", value: "28", suffix: "INTL" },
  { key: "transactions", value: "100s", suffix: "" },
] as const;

export async function StatsBand({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "stats" });

  // CMS overlay (site_content) — fallback sur next-intl.
  // 1 fetch eyebrow + 2 fetch (label/text) par stat.
  const [eyebrow, labels] = await Promise.all([
    siteContent("home.stats.eyebrow", locale, t("eyebrow")),
    Promise.all(
      stats.map(async (s) => {
        const [label, text] = await Promise.all([
          siteContent(`home.stats.${s.key}_label`, locale, t(`${s.key}_label`)),
          siteContent(`home.stats.${s.key}_text`, locale, t(`${s.key}_text`)),
        ]);
        return { key: s.key, value: s.value, suffix: s.suffix, label, text };
      }),
    ),
  ]);

  return (
    <section className="bg-bg-contrast px-6 py-6 text-text-contrast md:py-20 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-6 max-w-xl font-mono text-[10px] uppercase tracking-[0.3em] text-gold-bright md:mb-12 md:text-xs">
          {eyebrow}
        </p>

        <div className="grid gap-5 sm:grid-cols-2 md:gap-10 lg:grid-cols-4">
          {labels.map((s) => (
            <div key={s.key} className="border-t border-text-contrast/15 pt-4 md:pt-6">
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-text-contrast/50 md:text-[10px]">
                {s.label}
              </p>
              {/* NAV4 : taille des chiffres réduite ~50%
                  (text-4xl/6xl -> text-2xl/3xl). */}
              <p className="mt-2 font-display text-2xl font-black leading-none tracking-tight md:mt-3 md:text-3xl">
                <span className="gold-text">{s.value}</span>
                {s.suffix && (
                  <span className="ml-2 font-mono text-xs font-medium text-text-contrast/50 md:text-base">
                    {s.suffix}
                  </span>
                )}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-text-contrast/70 md:mt-3 md:text-sm">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
