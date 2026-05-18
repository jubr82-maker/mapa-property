import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { internationalRegions, luxembourgCommunes } from "@/lib/markets";
import { SignatureLine } from "@/components/ui/SignatureLine";

export function MarketsSection() {
  const t = useTranslations("markets_home");

  const intlCount = internationalRegions.reduce(
    (acc, r) => acc + r.cities.length,
    0,
  );

  return (
    <section className="px-6 py-6 md:py-20 lg:px-10 lg:py-20">
      <div className="mx-auto max-w-[1400px]">
        {/* Mobile compact version */}
        <div className="md:hidden">
          <div className="text-center">
            <h2
              className="font-display text-2xl font-black leading-tight tracking-tight"
              style={{ color: "#C8A04A" }}
            >
              {t("markets_compact_title")}
            </h2>
            <p
              className="mt-2 font-display text-base italic"
              style={{ color: "#C8A04A" }}
            >
              {t("markets_compact_subtitle")}
            </p>
            <Link
              href="/services/marches-actifs"
              className="mt-5 inline-flex items-center gap-2 rounded-full border border-gold/60 px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-gold-deep hover:text-gold"
            >
              {t("markets_compact_cta")} →
            </Link>
          </div>
        </div>

        {/* Desktop version (visible only on md+) */}
        <div className="hidden md:block">
          <DesktopMarkets
            intlCount={intlCount}
            communesCount={luxembourgCommunes.length}
            t={t}
          />
        </div>

        {/* SEO/GEO duplicate for crawlers + LLMs (mobile UA included) */}
        <div className="sr-only">
          <DesktopMarkets
            intlCount={intlCount}
            communesCount={luxembourgCommunes.length}
            t={t}
          />
        </div>
      </div>
    </section>
  );
}

function DesktopMarkets({
  intlCount,
  communesCount,
  t,
}: {
  intlCount: number;
  communesCount: number;
  t: (key: string) => string;
}) {
  return (
    <>
      {/* NAV3 : densité desktop nettement réduite (contenu identique) —
          paddings/typo/gaps resserrés, grille communes plus dense. */}
      <header className="mb-5 max-w-2xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-ink-soft">
          {t("eyebrow")}
        </p>
        <h2 className="mt-1 font-display text-xl font-black leading-tight tracking-tight text-ink lg:text-2xl">
          {t("title")}
        </h2>
        <SignatureLine />
        <p className="mt-2 text-sm text-ink-mid">{t("subtitle")}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-bg p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-base font-bold text-ink">
              {t("luxembourg")}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-deep">
              {communesCount} {t("communes")}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-mid">{t("luxembourg_text")}</p>
          <ul className="mt-3 grid grid-cols-3 gap-x-3 gap-y-1 sm:grid-cols-4 lg:grid-cols-5">
            {luxembourgCommunes.map((c) => (
              <li key={c}>
                <Link
                  href={`/biens?country=LU&city=${encodeURIComponent(c)}`}
                  className="font-mono text-[10px] uppercase tracking-[0.08em] text-ink-mid hover:text-gold"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-line bg-bg p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-base font-bold text-ink">
              {t("international")}
            </h3>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-deep">
              {intlCount} {t("cities")}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-mid">{t("international_text")}</p>
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {internationalRegions.map((r) => (
              <li key={r.region}>
                <span className="block font-mono text-[9px] uppercase tracking-[0.22em] text-ink-soft">
                  {r.region}
                </span>
                <span className="block font-sans text-xs text-ink-mid">
                  {r.cities.join(" · ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-5 text-center">
        <Link
          href="/services/marches-actifs"
          className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-gold-deep hover:text-gold"
        >
          {t("see_all")} →
        </Link>
      </div>
    </>
  );
}
