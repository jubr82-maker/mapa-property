import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { internationalRegions, luxembourgCommunes } from "@/lib/markets";

export default async function ActiveMarketsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "markets_page" });
  const intlCount = internationalRegions.reduce(
    (acc, r) => acc + r.cities.length,
    0,
  );

  return (
    <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-[1400px]">
        <header className="mb-14 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 t-h1">
            {t("title")}
          </h1>
        </header>

        {/* Founding text — section 13 du brief */}
        <section className="mb-16 max-w-3xl space-y-4 text-base leading-relaxed text-ink-mid">
          <p className="t-h3">
            {t("found_p1")}
          </p>
          <p>{t("found_p2")}</p>
          <p>{t("found_p3")}</p>
          <p>{t("found_p4")}</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-soft">
            — {t("found_source")}
          </p>
        </section>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Luxembourg */}
          <section className="rounded-xl border border-line bg-bg p-8">
            <div className="flex items-baseline justify-between">
              <h2 className="t-h2">
                Luxembourg
              </h2>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-gold-deep">
                {luxembourgCommunes.length} {t("communes")}
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-mid">{t("lu_text")}</p>
            <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
              {luxembourgCommunes.map((c) => (
                <li key={c}>
                  <Link
                    href={`/biens?country=LU&city=${encodeURIComponent(c)}`}
                    className="font-mono text-[11px] uppercase tracking-[0.1em] text-ink-mid hover:text-gold"
                  >
                    {c}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* International */}
          <section className="rounded-xl border border-line bg-bg p-8">
            <div className="flex items-baseline justify-between">
              <h2 className="t-h2">
                International
              </h2>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-gold-deep">
                {intlCount} {t("cities")}
              </span>
            </div>
            <p className="mt-3 text-sm text-ink-mid">{t("intl_text")}</p>
            <ul className="mt-6 space-y-4">
              {internationalRegions.map((r) => (
                <li key={r.region}>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
                    {r.region}
                  </span>
                  <span className="mt-1 block text-sm text-ink-mid">
                    {r.cities.join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <p className="mt-12 max-w-3xl rounded-xl border border-gold/30 bg-bg-soft p-6 text-sm leading-relaxed text-ink-mid">
          {t("disclaimer")}
        </p>
      </div>
    </div>
  );
}
