import Image from "next/image";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { sbUrl } from "@/lib/supabase-url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "about_page" });
  return { title: `${t("title")} — MAPA Property`, description: t("intro") };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "about_page" });
  const julienPhoto = sbUrl("photos", "IMG_2461.jpg");

  return (
    <article className="pt-24 lg:pt-32">
      <div className="mx-auto max-w-[1100px] px-6 lg:px-10">
        <header className="mb-14">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h1 className="mt-4 font-display text-5xl font-black leading-[0.95] tracking-tight text-ink sm:text-7xl">
            <span className="block">{t("h1_line1")}</span>
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
            <p>{t("para_6")}</p>
            <p>{t("para_7")}</p>
          </div>

          <aside className="lg:sticky lg:top-32">
            <div className="overflow-hidden rounded-2xl border border-gold/40 bg-bg-soft">
              <div className="relative aspect-[3/4]">
                <Image
                  src={julienPhoto}
                  alt="Julien Brebion — Real Estate Director, MAPA Property"
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
                <div className="mt-4 space-y-1.5">
                  <a
                    href="tel:+352691620127"
                    className="block text-sm text-ink-mid hover:text-gold"
                  >
                    +352 691 620 127
                  </a>
                  <a
                    href="mailto:j.brebion@mapagroup.org"
                    className="block text-sm text-ink-mid hover:text-gold"
                  >
                    j.brebion@mapagroup.org
                  </a>
                </div>
              </div>
            </div>
          </aside>
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
  );
}
