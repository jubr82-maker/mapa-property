import { setRequestLocale, getTranslations } from "next-intl/server";
import { BorrowingCapacitySimulator } from "@/components/simulators/BorrowingCapacitySimulator";
import { pageAlternates } from "@/lib/seo";

import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "borrowing_capacity" });
  return {
    title: t("meta_title"),
    description: t("meta_description"),
    alternates: pageAlternates(locale, "/services/capacite-emprunt"),
  };
}

export default async function CapaciteEmpruntPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "borrowing_capacity" });

  return (
    <>
      <PageBreadcrumb locale={locale} path="/services/capacite-emprunt" />
    <div className="px-6 pt-32 pb-20 lg:px-10 lg:pt-40 lg:pb-28">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-gold-deep">
            {t("eyebrow")}
          </p>
          <h1 className="mt-2 t-h1">
            {t("title")}
          </h1>
          <p className="mt-5 mx-auto max-w-2xl text-base leading-relaxed text-ink-mid">
            {t("intro")}
          </p>
        </header>

        <BorrowingCapacitySimulator />
      </div>
    </div>
    </>
  );
}

export const dynamic = "force-dynamic";
