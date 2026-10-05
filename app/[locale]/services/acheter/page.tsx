import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { IntentAnswer, IntentSections, intentMetadata } from "@/components/seo/IntentSections";

// Page d'intention "acheter" (oct. 2026, lib/intent-pages.ts). Remplace
// l'ancienne redirection vers /biens.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return intentMetadata(locale, "buy");
}

export default async function BuyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "intent_pages" });

  return (
    <>
      <PageBreadcrumb locale={locale} path="/services/acheter" />
      <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
        <div className="mx-auto max-w-[1400px]">
          <header className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">{t("buy.eyebrow")}</p>
            <h1 className="mt-2 t-h1">{t("buy.title")}</h1>
            <IntentAnswer locale={locale} intent="buy" />
          </header>
          <IntentSections locale={locale} intent="buy" />
        </div>
      </div>
    </>
  );
}
