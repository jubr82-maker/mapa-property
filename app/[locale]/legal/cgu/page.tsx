import type { Metadata } from "next";
import { seoPageMetadata } from "@/lib/seo-page-meta";
import { setRequestLocale } from "next-intl/server";
import { LegalLayout } from "@/components/legal/LegalLayout";
import { cgu } from "@/lib/legal/cgu";

import { PageBreadcrumb } from "@/components/seo/PageBreadcrumb";
type Locale = keyof typeof cgu;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return seoPageMetadata(locale, "terms_use", "/legal/cgu");
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const data = cgu[locale as Locale] ?? cgu.fr;
  return (
    <>
      <PageBreadcrumb locale={locale} path="/legal/cgu" />
    <LegalLayout
      eyebrow={data.eyebrow}
      title={data.title}
      updatedAt={data.updatedAt}
      // MAPA_CGU.pdf absent du bucket Documents (reponse 400, oct. 2026) : pas de
      // bouton PDF, cette page HTML est la version de reference.
      intro={data.intro}
      sections={data.sections}
      copyright={data.copyright}
    />
    </>
  );
}
