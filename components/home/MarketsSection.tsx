import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { internationalRegions, luxembourgCommunes } from "@/lib/markets";
import { SignatureLine } from "@/components/ui/SignatureLine";

// POL6 : « Marchés actifs » nettoyé — plus de listes communes /
// villes (le détail vit sur /services/marches-actifs). On garde le
// narratif (eyebrow / titre / sous-titre / CTA). Rendu en <div> (pas
// <section>) : fusionné avec StatsBand dans un wrapper unique (home).
export function MarketsSection() {
  const t = useTranslations("markets_home");
  const intlCount = internationalRegions.reduce(
    (acc, r) => acc + r.cities.length,
    0,
  );

  return (
    <div>
      <div className="mx-auto max-w-4xl text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft md:text-xs">
          {t("eyebrow")}
        </p>
        <h2 className="mt-2 t-h2">{t("title")}</h2>
        <div className="flex justify-center">
          <SignatureLine />
        </div>
        <p className="mx-auto mt-2 max-w-3xl text-sm leading-relaxed text-ink-mid md:mt-3 md:text-lg">
          {t("subtitle")}
        </p>
        <Link
          href="/services/marches-actifs"
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-gold/60 px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep transition-colors hover:text-gold md:mt-5"
        >
          {t("see_all")} →
        </Link>

        {/* SEO/GEO : couverture chiffrée conservée pour crawlers/LLM
            (sans la liste détaillée — allégée). */}
        <p className="sr-only">
          {luxembourgCommunes.length} {t("communes")} · {intlCount}{" "}
          {t("cities")} — {luxembourgCommunes.join(", ")} —{" "}
          {internationalRegions
            .map((r) => `${r.region}: ${r.cities.join(", ")}`)
            .join(" · ")}
        </p>
      </div>
    </div>
  );
}
