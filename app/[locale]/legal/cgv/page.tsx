import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { cgv } from "@/lib/legal/cgv";
import { pageAlternates } from "@/lib/seo";

type Locale = keyof typeof cgv;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: pageAlternates(locale, "/legal/cgv") };
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
  );
}
