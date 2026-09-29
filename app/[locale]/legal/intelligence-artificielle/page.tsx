import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { intelligenceArtificielle } from "@/lib/legal/intelligence-artificielle";
import { pageAlternates } from "@/lib/seo";

type Locale = keyof typeof intelligenceArtificielle;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: pageAlternates(locale, "/legal/intelligence-artificielle") };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = intelligenceArtificielle[locale as Locale] ?? intelligenceArtificielle.fr;
  return (
    <LegalLayout
      eyebrow={data.eyebrow}
      title={data.title}
      updatedAt={data.updatedAt}
      intro={data.intro}
      sections={data.sections}
      copyright={data.copyright}
    />
  );
}
