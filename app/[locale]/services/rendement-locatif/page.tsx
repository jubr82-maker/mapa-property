import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function RendementLocatifPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "rendement_locatif" });

  return (
    <article className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-3xl text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
          {t("eyebrow")}
        </p>
        <h1 className="mt-2 t-h1">
          {t("title")}
        </h1>
        <p className="mt-6 text-base leading-relaxed text-ink-mid md:text-lg">
          {t("intro")}
        </p>

        <div className="mt-12 rounded-2xl border border-gold/30 bg-bg-soft p-8 text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-deep">
            {t("coming_label")}
          </p>
          <h2 className="mt-2 t-h2">
            {t("coming_title")}
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-ink-mid">
            <li>· {t("feature_1")}</li>
            <li>· {t("feature_2")}</li>
            <li>· {t("feature_3")}</li>
            <li>· {t("feature_4")}</li>
          </ul>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-gold/60 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.2em] text-gold-deep hover:border-gold hover:text-gold"
          >
            {t("cta")} →
          </Link>
        </div>

        <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
          {t("source")}
        </p>
      </div>
    </article>
  );
}
