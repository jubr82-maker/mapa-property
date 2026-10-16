import { setRequestLocale, getTranslations } from "next-intl/server";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { IntentAnswer, IntentSections, intentMetadata } from "@/components/seo/IntentSections";

// Page d'intention "agence immobiliere au Luxembourg" (oct. 2026,
// lib/intent-pages.ts). L'etablissement unique (#organization) est publie
// une seule fois par page, par le layout (homepageGraph).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return intentMetadata(locale, "agency");
}

export default async function AgencyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "intent_pages" });

  return (
    <>
      <PageBreadcrumb locale={locale} path="/agence-immobiliere-luxembourg" />
      <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
        <div className="mx-auto max-w-[1400px]">
          <header className="max-w-3xl">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">{t("agency.eyebrow")}</p>
            <h1 className="mt-2 t-h1">{t("agency.title")}</h1>
            <IntentAnswer locale={locale} intent="agency" />
          </header>
          <IntentSections locale={locale} intent="agency" faqKey="agence" />
        </div>
      </div>
    </>
  );
}
