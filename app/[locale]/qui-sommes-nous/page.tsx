import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ContactReveal } from "@/components/contact-reveal";
import { pageAlternates } from "@/lib/seo";
import { BROKER_POSITION } from "@/lib/legal/broker-position";

import { withSocial } from "@/lib/seo-page-meta";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
// Sprint IA-TRANSPARENCE : portrait local optimise (webp, cadrage buste),
// remplace l'ancienne photo distante sbUrl("photos","IMG_2461.jpg").
const JULIEN_PORTRAIT_SRC = "/images/julien-brebion-2026-portrait.webp";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about_page" });
  return withSocial(locale, {
    title: `${t("title")}, MAPA Property`,
    description: t("intro"),
    alternates: pageAlternates(locale, "/qui-sommes-nous"),
  });
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about_page" });
  const brokerPosition =
    BROKER_POSITION[locale as keyof typeof BROKER_POSITION] ?? BROKER_POSITION.fr;

  return (
    <>
      <PageBreadcrumb locale={locale} path="/qui-sommes-nous" />
    <article className="pt-24 lg:pt-32">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-10">
        <header className="mb-14">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 t-h1">
            <span className="block">{t("h1_line1")}</span>{" "}
            <span className="block gold-text">{t("h1_line2")}</span>
          </h1>
        </header>

        {/* Story */}
        <section className="mb-16 grid gap-12 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="space-y-6 text-base leading-relaxed text-ink-mid sm:text-lg">
            <p className="font-display text-xl font-bold text-ink sm:text-2xl">
              {t("para_1")}
            </p>
            <p>{t("para_2")}</p>
            <p>{t("para_3")}</p>
            <p>{t("para_4")}</p>
            <p>{t("para_5")}</p>
          </div>

          <aside className="lg:sticky lg:top-32">
            <div className="overflow-hidden rounded-2xl border border-gold/40 bg-bg-soft">
              <div className="relative aspect-[3/4]">
                <Image
                  src={JULIEN_PORTRAIT_SRC}
                  alt={t("portrait_alt")}
                  fill
                  sizes="(min-width: 1024px) 320px, 50vw"
                  priority
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
                  {t("director_label")}
                </p>
                <p className="mt-2 font-display text-xl font-bold text-ink">
                  Julien Brebion
                </p>
                <p className="text-sm text-ink-mid">Real Estate Director</p>
                <div className="mt-4">
                  <ContactReveal variant="sidebar" align="left" />
                </div>
              </div>
            </div>
          </aside>
        </section>

        {/* Où nous intervenons */}
        <section className="mb-16">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("coverage_eyebrow")}
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-mid sm:text-lg">
            {t("coverage_text")}
          </p>
        </section>

        {/* Positionnement broker international : source unique
            lib/legal/broker-position.ts, mission "positionnement broker
            international". Prolonge la section couverture ci-dessus sans en
            dupliquer le contenu. */}
        <section className="mb-16">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {brokerPosition.title}
          </p>
          <div className="mt-4 max-w-3xl space-y-4 text-base leading-relaxed text-ink-mid sm:text-lg">
            {brokerPosition.paragraphs.map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-20 rounded-2xl border border-gold/40 bg-gradient-to-br from-bg-soft via-bg to-bg-soft p-10 text-center sm:p-14">
          <p className="font-display text-3xl font-black leading-tight text-ink sm:text-4xl">
            {t("cta_title")}
          </p>
          <Link
            href="/contact"
            className="gold-shine-bg mt-6 inline-flex items-center gap-2 rounded-full px-8 py-4 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-ink shadow-md shadow-gold/20 transition-transform hover:scale-[1.02]"
          >
            {t("cta_button")} →
          </Link>
        </section>

        {/* Founding text & copyright */}
        <p className="mb-8 text-[11px] leading-relaxed text-ink-soft">
          {t("copyright")}
        </p>
      </div>
    </article>
    </>
  );
}
