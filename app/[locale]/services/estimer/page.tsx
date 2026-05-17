import { setRequestLocale, getTranslations } from "next-intl/server";
import { EstimateForm } from "@/components/forms/EstimateForm";

export default async function EstimatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "estimate_page" });

  return (
    <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 t-h1">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-base leading-relaxed text-ink-mid">
            {t("intro")}
          </p>
        </header>

        <EstimateForm />

        <aside className="mt-12 rounded-xl border border-line bg-bg-soft p-6 text-sm leading-relaxed text-ink-mid">
          <p className="font-display text-base font-bold text-ink">
            {t("disclaimer_title")}
          </p>
          <p className="mt-2">{t("disclaimer_p1")}</p>
          <p className="mt-2">{t("disclaimer_p2")}</p>
          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
            {t("source")}
          </p>
        </aside>
      </div>
    </div>
  );
}
