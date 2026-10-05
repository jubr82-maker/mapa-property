import type { Metadata } from "next";
import { seoPageMetadata } from "@/lib/seo-page-meta";
import { setRequestLocale } from "next-intl/server";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { mentions } from "@/lib/legal/mentions";

import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { siteLogo } from "@/lib/og";
type Locale = keyof typeof mentions;

const LEGAL_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

/**
 * Etablissement de lib/seo.ts (#organization), complete de son adresse
 * legale, publie UNIQUEMENT ici (seule page autorisee a citer la localite du
 * siege et les numeros d'immatriculation, regle du projet). Valeurs
 * recopiees de lib/legal/mentions.ts, jamais inventees.
 */
const legalNoticeOrganization = () => ({
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": `${LEGAL_SITE_URL}#organization`,
  name: "MAPA Property",
  legalName: "MAPA Synergy Sàrl",
  url: LEGAL_SITE_URL,
  logo: siteLogo(),
  address: {
    "@type": "PostalAddress",
    streetAddress: "26, rue du Commerce",
    postalCode: "L-3450",
    addressLocality: "Dudelange",
    addressCountry: "LU",
  },
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
