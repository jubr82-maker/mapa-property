// Metadata SEO des pages a contenu fixe (oct. 2026) : title et meta
// description uniques par page et par langue, lus dans next-intl
// (namespace "seo_pages"), plus canonical / hreflang (pageAlternates) et
// Open Graph / Twitter alignes. Sans cela, ces pages heritaient du title et
// de la description de l'accueil (layout).

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { pageAlternates } from "@/lib/seo";
import { siteShareImage, SITE_SHARE_IMAGE_SIZE } from "@/lib/og";

export type SeoPageKey =
  | "contact"
  | "simulators"
  | "estimate"
  | "markets"
  | "blog"
  | "journal"
  | "offmarket"
  | "arcova"
  | "fees"
  | "terms_use"
  | "terms_sale"
  | "privacy"
  | "legal_notice"
  | "ai"
  | "yield";


export function buildPageMetadata(
  locale: string,
  path: string,
  title: string,
  description: string,
): Metadata {
  // Meme image de partage que le layout (non heritee si openGraph redefini).
  const image = siteShareImage();
  return {
    title,
    description,
    alternates: pageAlternates(locale, path),
    openGraph: {
      title,
      description,
      url: `/${locale}${path}`,
      siteName: "MAPA Property",
      type: "website",
      images: [{ url: image, ...SITE_SHARE_IMAGE_SIZE }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export async function seoPageMetadata(
  locale: string,
  key: SeoPageKey,
  path: string,
): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "seo_pages" });
  return buildPageMetadata(
    locale,
    path,
    t(`${key}.title`),
    t(`${key}.description`),
  );
}
