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
  | "yield"
  | "searches"
  | "services"
  | "financing";


/** og:locale par langue (fr_LU, en_GB, de_LU). */
export function ogLocale(locale: string): string {
  return locale === "en" ? "en_GB" : locale === "de" ? "de_LU" : "fr_LU";
}

function titleText(t: Metadata["title"]): string {
  if (typeof t === "string") return t;
  if (t && typeof t === "object" && "absolute" in t && typeof t.absolute === "string") return t.absolute;
  return "";
}

/**
 * Balises de partage d'une page (oct. 2026) : og:url = son adresse canonique,
 * og:title et twitter:title = son propre titre, og:description et
 * twitter:description = sa propre description, og:locale selon la langue.
 * Sans ces balises, Next.js reprenait l'Open Graph du layout : l'adresse,
 * le titre et la description de l'accueil.
 * meta doit porter alternates.canonical (pageAlternates ou propre).
 */
export function withSocial(
  locale: string,
  meta: Metadata,
  opts: { type?: "website" | "article"; image?: string } = {},
): Metadata {
  const canonical = meta.alternates?.canonical;
  const url = typeof canonical === "string" ? canonical : canonical instanceof URL ? canonical.toString() : canonical?.url?.toString();
  const title = titleText(meta.title);
  const description = typeof meta.description === "string" ? meta.description : undefined;
  const image = opts.image ?? siteShareImage();
  const sized = opts.image ? { url: image } : { url: image, ...SITE_SHARE_IMAGE_SIZE };
  return {
    ...meta,
    openGraph: {
      title,
      description,
      url,
      siteName: "MAPA Property",
      locale: ogLocale(locale),
      type: opts.type ?? "website",
      images: [sized],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export function buildPageMetadata(
  locale: string,
  path: string,
  title: string,
  description: string,
): Metadata {
  return withSocial(locale, { title, description, alternates: pageAlternates(locale, path) });
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
