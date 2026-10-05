import type { Metadata } from "next";
import { seoPageMetadata } from "@/lib/seo-page-meta";
import { setRequestLocale } from "next-intl/server";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { honoraires } from "@/lib/legal/honoraires";

import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
type Locale = keyof typeof honoraires;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return seoPageMetadata(locale, "fees", "/legal/honoraires");
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = honoraires[locale as Locale] ?? honoraires.fr;
  return (
    <>
      <PageBreadcrumb locale={locale} path="/legal/honoraires" />
    <LegalLayout
      eyebrow={data.eyebrow}
      title={data.title}
      updatedAt={data.updatedAt}
      pdfFile="MAPA_Honoraires.pdf"
      pdfLabel={data.pdfLabel}
      intro={data.intro}
      sections={data.sections}
      copyright={data.copyright}
    />
    </>
  );
}
