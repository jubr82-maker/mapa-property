import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ALL_MANDATE_SLUGS, MANDATES } from "@/lib/mandates";
import { FadeInOnScroll } from "@/components/ui/FadeInOnScroll";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "page_sell" });
  return { title: `${t("title")} — MAPA Property`, description: t("intro") };
}

export default async function SellPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "page_sell" });
  const tMandate = await getTranslations({ locale, namespace: "mandate_common" });
  const sellableMandates = ALL_MANDATE_SLUGS.filter((m) => m !== "recherche");

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
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-mid sm:text-lg">
            {t("intro")}
          </p>
        </header>

        {/* Steps */}
        <FadeInOnScroll>
        <section className="mb-20">
          <ol className="grid gap-6 lg:grid-cols-3">
            {(["one", "two", "three"] as const).map((s, i) => (
              <li
                key={s}
                className="rounded-xl border border-line bg-bg-soft p-6"
              >
                <span className="font-display text-5xl font-black gold-text">
                  0{i + 1}
                </span>
                <h3 className="mt-4 t-h3">
                  {t(`step_${s}_title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-mid">
                  {t(`step_${s}_text`)}
                </p>
              </li>
            ))}
          </ol>
        </section>
        </FadeInOnScroll>

        {/* Mandates picker */}
        <FadeInOnScroll>
        <section className="mb-16">
          <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
            {t("choose_mandate")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {sellableMandates.map((slug) => {
              const config = MANDATES[slug];
              return (
                <Link
                  key={slug}
                  href={`/mandats/${slug}`}
                  className="group flex flex-col gap-3 rounded-xl border border-line bg-bg p-6 transition-colors hover:border-gold"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                    {tMandate(`label_${slug.replace("-", "_")}`)}
                  </p>
                  <p className="font-display text-3xl font-black gold-text">
                    {config.rate}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                    {tMandate("rate_label")}
                  </p>
                  <span className="mt-auto text-xs text-ink-mid group-hover:text-gold">
                    {t("see_mandate")} →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
        </FadeInOnScroll>

        {/* Estimate CTA */}
        <FadeInOnScroll>
        <section className="rounded-2xl border border-gold/40 bg-gradient-to-br from-bg-soft via-bg to-bg-soft p-8 sm:p-12">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
                {t("estimate_eyebrow")}
              </p>
              <h2 className="mt-2 t-h2">
                {t("estimate_title")}
              </h2>
              <p className="mt-3 text-base text-ink-mid">{t("estimate_text")}</p>
            </div>
            <Link
              href="/services/estimer"
              className="gold-shine-bg inline-flex items-center justify-center gap-2 self-start rounded-full px-6 py-3 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02] lg:self-end"
            >
              {t("estimate_cta")} →
            </Link>
          </div>
        </section>
        </FadeInOnScroll>
      </div>
    </div>
  );
}
