import { getTranslations } from "next-intl/server";
import { siteContent } from "@/lib/site-content";
import { AnimatedStat } from "@/components/home/AnimatedStat";

// Couverture exprimée SANS chiffre : LU en « couverture nationale » et
// l'international en formulation qualitative (villes + pays, libellé i18n).
// Plus de nombre de villes affiché (évolutif = risque de faux), ni "86" ni "8+".

export async function StatsBand({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "stats" });

  // Valeurs : ancien "8+" et "86 communes" supprimés. L'ancienneté et la
  // couverture LU passent par des libellés i18n sans chiffre figé.
  const stats = [
    {
      key: "experience",
      value: t("experience_value"),
      suffix: t("experience_suffix"),
    },
    { key: "communes", value: t("communes_value"), suffix: "" },
    { key: "cities", value: t("cities_value"), suffix: "" },
    { key: "transactions", value: "100s", suffix: "" },
  ] as const;

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
    // POL6 : <div> (pas <section>) — band fusionné avec MarketsSection
    // dans CoverageStats. Padding resserré (py réduit) pour lire comme
    // un seul bloc « couverture en chiffres ».
    <div className="mt-6 rounded-2xl bg-bg-contrast px-5 py-6 text-text-contrast md:mt-10 md:px-6 md:py-12 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-4 max-w-xl font-mono text-[10px] uppercase tracking-[0.3em] text-gold-bright md:mb-12 md:text-xs">
          {eyebrow}
        </p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:gap-10 lg:grid-cols-4">
          {/* STEP3b : AnimatedStat client component — anime 0 → cible
              au IntersectionObserver. Si value non-numerique ("100s",
              "8+"), parse number + extra textuel. */}
          {labels.map((s) => (
            <AnimatedStat
              key={s.key}
              value={s.value}
              suffix={s.suffix}
              label={s.label}
              text={s.text}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
