import type { Metadata } from "next";
import { seoPageMetadata } from "@/lib/seo-page-meta";
import { setRequestLocale } from "next-intl/server";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { mentions } from "@/lib/legal/mentions";

import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteLogo } from "@/lib/og";
import { ORGANIZATION_ADDRESS } from "@/lib/seo";
type Locale = keyof typeof mentions;

const LEGAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

/**
 * Complement de l'etablissement unique (#organization, lib/seo.ts) publie
 * UNIQUEMENT ici : TVA, RCS et autorisation d'etablissement (regle du
 * projet). Meme nom, nom legal et adresse que sur toutes les pages
 * (ORGANIZATION_ADDRESS). Valeurs recopiees de lib/legal/mentions.ts.
 */
const legalNoticeOrganization = () => ({
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": `${LEGAL_SITE_URL}#organization`,
  name: "MAPA Property",
  legalName: "MAPA Synergy Sàrl",
  url: LEGAL_SITE_URL,
  logo: siteLogo(),
  foundingDate: "2024",
  address: ORGANIZATION_ADDRESS,
  vatID: "LU31988923",
  identifier: [
    { "@type": "PropertyValue", propertyID: "RCS Luxembourg", value: "B241974" },
    { "@type": "PropertyValue", propertyID: "Autorisation d'établissement", value: "10108681/0-1-2-3" },
  ],
});

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
