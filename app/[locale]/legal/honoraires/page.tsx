import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { honoraires } from "@/lib/legal/honoraires";
import { pageAlternates } from "@/lib/seo";

type Locale = keyof typeof honoraires;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: pageAlternates(locale, "/legal/honoraires") };
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
  );
}
