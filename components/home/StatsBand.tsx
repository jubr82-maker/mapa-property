import { getTranslations } from "next-intl/server";
import { siteContent } from "@/lib/site-content";
import { luxembourgCommunes, internationalRegions } from "@/lib/markets";

// Compteurs dérivés de la couverture réelle (lib/markets) — restent
// justes quand la liste des communes/villes évolue (demande Julien :
// couvrir toutes les grandes communes du pays).
const COMMUNES_COUNT = luxembourgCommunes.length;
const CITIES_COUNT = internationalRegions.reduce(
  (acc, r) => acc + r.cities.length,
  0,
);

const stats = [
  { key: "experience", value: "8+", suffix: "y" },
  { key: "communes", value: `${COMMUNES_COUNT}`, suffix: "LU" },
  { key: "cities", value: `${CITIES_COUNT}`, suffix: "INTL" },
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
    // POL6 : <div> (pas <section>) — band fusionné avec MarketsSection
    // dans CoverageStats. Padding resserré (py réduit) pour lire comme
    // un seul bloc « couverture en chiffres ».
    <div className="mt-6 rounded-2xl bg-bg-contrast px-5 py-6 text-text-contrast md:mt-10 md:px-6 md:py-12 lg:px-10">
      <div className="mx-auto max-w-[1400px]">
        <p className="mb-4 max-w-xl font-mono text-[10px] uppercase tracking-[0.3em] text-gold-bright md:mb-12 md:text-xs">
          {eyebrow}
        </p>

        <div className="grid grid-cols-2 gap-x-4 gap-y-4 md:gap-10 lg:grid-cols-4">
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
    </div>
  );
}
