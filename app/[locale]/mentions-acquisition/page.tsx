import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "mentions_acquisition",
  });
  return {
    title: t("meta_title"),
    description: t("meta_description"),
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: `/${locale}/mentions-acquisition`,
      languages: {
        "fr-LU": "/fr/mentions-acquisition",
        "en-US": "/en/mentions-acquisition",
        "de-DE": "/de/mentions-acquisition",
        "x-default": "/fr/mentions-acquisition",
      },
    },
  };
}

export default async function MentionsAcquisitionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: "mentions_acquisition",
  });

  const SECTIONS = [
    { titleKey: "s1_title", bodyKey: "s1_body" },
    { titleKey: "s2_title", bodyKey: "s2_body" },
    { titleKey: "s3_title", bodyKey: "s3_body" },
    { titleKey: "s4_title", bodyKey: "s4_body" },
    { titleKey: "s5_title", bodyKey: "s5_body" },
    { titleKey: "s6_title", bodyKey: "s6_body" },
    { titleKey: "s7_title", bodyKey: "s7_body" },
    { titleKey: "s8_title", bodyKey: "s8_body" },
  ] as const;

  return (
    <article className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-[800px]">
        <header className="mb-12">
          <p
            className="font-mono text-xs uppercase tracking-[0.3em]"
            style={{ color: "#B8865A" }}
          >
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 font-display text-4xl font-black leading-tight tracking-tight text-ink sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            {t("updated_at")}
          </p>
          <p className="mt-6 text-base leading-relaxed text-ink-mid">
            {t("intro")}
          </p>
        </header>

        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section
              key={s.titleKey}
              className="space-y-3 text-sm leading-relaxed text-ink-mid"
            >
              <h2 className="font-display text-xl font-bold text-ink">
                {t(s.titleKey)}
              </h2>
              <p className="whitespace-pre-line">{t(s.bodyKey)}</p>
            </section>
          ))}
        </div>

        {/* Bloc société MAPA SYNERGY Sàrl */}
        <section className="mt-12 rounded-xl border border-line bg-bg-soft p-6">
          <h2 className="font-display text-lg font-bold text-ink">
            {t("company_block_title")}
          </h2>
          <ul className="mt-3 space-y-1 font-mono text-xs text-ink-mid">
            <li>
              <span className="text-ink-soft">{t("company_name_label")} :</span>{" "}
              <strong className="text-ink">MAPA SYNERGY Sàrl</strong>
            </li>
            <li>
              <span className="text-ink-soft">{t("company_lbr_label")} :</span>{" "}
              B241974
            </li>
            <li>
              <span className="text-ink-soft">{t("company_tva_label")} :</span>{" "}
              LU 31988923
            </li>
            <li>
              <span className="text-ink-soft">BIC :</span> BCEELULL
            </li>
            <li>
              <span className="text-ink-soft">IBAN :</span> LU88 0019 5655 88 84
              9000
            </li>
            <li>
              <span className="text-ink-soft">AE :</span> N°10108681/0-1-2-3
            </li>
            <li>
              <span className="text-ink-soft">{t("company_matricule_label")} :</span>{" "}
              2020 2407 901
            </li>
          </ul>
        </section>

        {/* Bloc contact */}
        <section className="mt-8 rounded-xl border border-line bg-bg p-6">
          <h2 className="font-display text-lg font-bold text-ink">
            {t("contact_block_title")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-mid">
            {t("contact_block_intro")}
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <span className="text-ink-soft">{t("contact_block_phone_label")} :</span>{" "}
              <a
                href="tel:+352691620127"
                className="font-mono font-semibold hover:underline"
                style={{ color: "#B8865A" }}
              >
                +352 691 620 127
              </a>
            </li>
            <li>
              <span className="text-ink-soft">{t("contact_block_email_label")} :</span>{" "}
              <a
                href="mailto:j.brebion@mapagroup.org"
                className="font-mono font-semibold hover:underline"
                style={{ color: "#B8865A" }}
              >
                j.brebion@mapagroup.org
              </a>
            </li>
          </ul>
        </section>

        <p className="mt-12 font-mono text-[11px] leading-relaxed text-ink-soft">
          {t("copyright")}
        </p>
      </div>
    </article>
  );
}
