import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { rgpd } from "@/lib/legal/rgpd";
import { pageAlternates } from "@/lib/seo";

type Locale = keyof typeof rgpd;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: pageAlternates(locale, "/legal/rgpd") };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = rgpd[locale as Locale] ?? rgpd.fr;
  return (
    <LegalLayout
      eyebrow={data.eyebrow}
      title={data.title}
      updatedAt={data.updatedAt}
      pdfFile="MAPA_RGPD.pdf"
      pdfLabel={data.pdfLabel}
      intro={data.intro}
      sections={data.sections}
      copyright={data.copyright}
    />
  );
}
