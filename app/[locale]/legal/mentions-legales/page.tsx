import type { Metadata } from "next";
import { seoPageMetadata } from "@/lib/seo-page-meta";
import { setRequestLocale } from "next-intl/server";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { mentions } from "@/lib/legal/mentions";

import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { legalNoticeOrganization } from "@/lib/legal/notice-jsonld";
type Locale = keyof typeof mentions;

// Donnees structurees : complement de l'etablissement (#organization) avec
// les identifiants legaux, type RealEstateAgent (lib/legal/notice-jsonld.ts).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return seoPageMetadata(locale, "legal_notice", "/legal/mentions-legales");
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = mentions[locale as Locale] ?? mentions.fr;
  return (
    <>
      <PageBreadcrumb locale={locale} path="/legal/mentions-legales" />
      <JsonLd data={legalNoticeOrganization()} />
    <LegalLayout
      eyebrow={data.eyebrow}
      title={data.title}
      updatedAt={data.updatedAt}
      pdfFile="MAPA_Mentions_Legales.pdf"
      pdfLabel={data.pdfLabel}
      intro={data.intro}
      sections={data.sections}
      copyright={data.copyright}
    />
    </>
  );
}
