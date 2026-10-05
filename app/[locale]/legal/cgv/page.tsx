import type { Metadata } from "next";
import { seoPageMetadata } from "@/lib/seo-page-meta";
import { setRequestLocale } from "next-intl/server";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { cgv } from "@/lib/legal/cgv";

import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
type Locale = keyof typeof cgv;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return seoPageMetadata(locale, "terms_sale", "/legal/cgv");
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = cgv[locale as Locale] ?? cgv.fr;
  return (
    <>
      <PageBreadcrumb locale={locale} path="/legal/cgv" />
    <LegalLayout
      eyebrow={data.eyebrow}
      title={data.title}
      updatedAt={data.updatedAt}
      disclaimer={data.disclaimer}
      pdfLabel={data.pdfLabel}
      intro={data.intro}
      sections={data.sections}
      copyright={data.copyright}
    />
    </>
  );
}
