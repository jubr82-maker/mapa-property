import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ALL_MANDATE_SLUGS, MANDATES, type MandateType } from "@/lib/mandates";
import { ContactForm } from "@/components/forms/ContactForm";
import { BackButton } from "@/components/ui/BackButton";

export function generateStaticParams() {
  return ALL_MANDATE_SLUGS.flatMap((type) =>
    ["fr", "en", "de"].map((locale) => ({ locale, type })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; type: string }>;
}) {
  const { locale, type } = await params;
  if (!ALL_MANDATE_SLUGS.includes(type as MandateType)) return {};
  const t = await getTranslations({
    locale,
    namespace: `mandate_${type.replace("-", "_")}`,
  });
  return {
    title: `${t("title")} — MAPA Property`,
    description: t("intro"),
  };
}

export default async function MandatePage({
  params,
}: {
  params: Promise<{ locale: string; type: string }>;
}) {
  const { locale, type } = await params;
  if (!ALL_MANDATE_SLUGS.includes(type as MandateType)) notFound();
  setRequestLocale(locale);

  const config = MANDATES[type as MandateType];
  return <MandateContent config={config} />;
}

function MandateContent({ config }: { config: (typeof MANDATES)[MandateType] }) {
  const ns = `mandate_${config.slug.replace("-", "_")}`;
  const t = useTranslations(ns);
  const tCommon = useTranslations("mandate_common");

  return (
    <article className="pt-24 lg:pt-32">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <BackButton fallback="/" className="mb-6" />

        {/* NAV9 : recommandation mandat exclusif — sur tous les mandats
            SAUF /mandats/exclusif. Encadré or discret, italique léger,
            ≤ 3 lignes (label texte, pas d'emoji — règle projet). */}
        {config.slug !== "exclusif" && (
          <div className="mb-8 rounded-lg border border-gold/40 bg-gold/5 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
              {tCommon("reco_label")}
            </p>
            <p className="mt-1 text-sm italic leading-relaxed text-ink-mid">
              {tCommon("reco_text")}
            </p>
          </div>
        )}

        {/* Hero */}
        <header className="mb-14 grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
              {tCommon("eyebrow")}
            </p>
            <h1 className="mt-2 t-h1">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-mid sm:text-lg">
              {t("intro")}
            </p>
          </div>

          <aside className="rounded-2xl border border-gold/40 bg-gradient-to-br from-bg-soft via-bg to-bg-soft p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
              {tCommon("rate_label")}
            </p>
            <p className="mt-2 font-display text-5xl font-black tracking-tight gold-text">
              {config.rate}
            </p>
            <p className="mt-1 text-xs text-ink-soft">{config.rateNote}</p>
            <div className="mt-4 grid gap-2 border-t border-line pt-4 text-sm">
              <Stat label={tCommon("duration_label")} value={config.duration} />
              <Stat
                label={tCommon("included_label")}
                value={`${config.servicesIncluded} ${tCommon("services")}`}
              />
            </div>
          </aside>
        </header>

        {/* Highlights */}
        <section className="mb-16">
          <h2 className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
            {tCommon("highlights")}
          </h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: config.highlights }).map((_, i) => (
              <li
                key={i}
                className="rounded-xl border border-line bg-bg-soft p-6"
              >
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                  0{i + 1}
                </span>
                <h3 className="mt-2 t-h3">
                  {t(`highlight_${i + 1}_title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-mid">
                  {t(`highlight_${i + 1}_text`)}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Services included / excluded */}
        <section className="mb-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-bg p-6">
            <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
              {tCommon("included_title")}
            </h2>
            <ul className="mt-5 space-y-2.5">
              {Array.from({ length: config.servicesIncluded }).map((_, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-ink-mid">
                  <span aria-hidden className="mt-0.5 text-gold-deep">
                    ✓
                  </span>
                  {t(`service_${i + 1}`)}
                </li>
              ))}
            </ul>
          </div>

          {config.servicesExcluded > 0 && (
            <div className="rounded-xl border border-line bg-bg-soft p-6">
              <h2 className="font-mono text-xs uppercase tracking-[0.3em] text-ink-soft">
                {tCommon("excluded_title")}
              </h2>
              <ul className="mt-5 space-y-2.5">
                {Array.from({ length: config.servicesExcluded }).map((_, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm text-ink-soft"
                  >
                    <span aria-hidden className="mt-0.5">
                      ×
                    </span>
                    {t(`excluded_${i + 1}`)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Process / when to choose */}
        <section className="mb-16 rounded-2xl border border-line bg-bg p-8">
          <h2 className="t-h2">
            {t("when_title")}
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-mid">
            {t("when_text")}
          </p>
        </section>

        {/* Comparator link */}
        <div className="mb-16 flex flex-wrap items-center gap-3 text-sm">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-soft">
            {tCommon("compare")}
          </span>
          {ALL_MANDATE_SLUGS.filter((s) => s !== config.slug).map((s) => (
            <Link
              key={s}
              href={`/mandats/${s}`}
              className="rounded-full border border-line px-4 py-1.5 font-mono text-xs uppercase tracking-[0.2em] text-ink-mid hover:border-gold hover:text-gold"
            >
              {tCommon(`label_${s.replace("-", "_")}`)}
            </Link>
          ))}
        </div>

        {/* Form */}
        <section
          id="contact-form"
          className="mb-20 rounded-2xl border border-gold/40 bg-bg-soft p-8 sm:p-12"
        >
          <header className="mb-8 max-w-2xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
              {tCommon("form_eyebrow")}
            </p>
            <h2 className="mt-2 t-h2">
              {config.formCta}
            </h2>
            <p className="mt-3 text-base text-ink-mid">{tCommon("form_subtitle")}</p>
          </header>
          <ContactForm
            type={config.formType}
            source={`mandate:${config.slug}`}
            defaultMessage={config.defaultMessage}
          />
        </section>
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
        {label}
      </span>
      <span className="font-display text-sm font-bold text-ink">{value}</span>
    </div>
  );
}
