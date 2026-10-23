import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { FaqSection } from "@/components/faq/FaqSection";
import { buildPageMetadata } from "@/lib/seo-page-meta";

// Questions frequentes generales (oct. 2026) : questions "faq-generale" de
// la table faqs (admin, Questions frequentes), dans la langue de la page.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "faq" });
  return buildPageMetadata(locale, "/faq", `${t("meta_title")}, MAPA Property`, t("meta_description"));
}

export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "faq" });

  return (
    <>
      <PageBreadcrumb locale={locale} path="/faq" />
      <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
        <div className="mx-auto max-w-3xl">
          <header>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">{t("eyebrow")}</p>
            <h1 className="mt-2 t-h1">{t("page_title")}</h1>
            <p className="mt-5 text-base leading-relaxed text-ink sm:text-lg">
              {t("page_intro")}{" "}
              <Link href="/contact" className="underline decoration-gold underline-offset-4 hover:text-gold-deep">
                {t("contact")}
              </Link>
            </p>
          </header>
          <FaqSection pageKey="faq-generale" locale={locale} headingLevel="none" className="mt-12" />
        </div>
      </div>
    </>
  );
}

// Mise a jour par l'admin (etiquette faqs) et au plus tard toutes les heures.
// Quotas Vercel (oct. 2026, docs/vercel-quotas.md) : revalidation a la
// demande quand le contenu change ; minuterie de secours de 30 jours seulement.
export const revalidate = 2592000;
