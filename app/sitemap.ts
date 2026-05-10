import type { MetadataRoute } from "next";
import {
  fetchAllBlogPosts,
  fetchAllPropertiesWithCover,
  fetchOffmarketList,
} from "@/lib/data";
import { ALL_MANDATE_SLUGS } from "@/lib/mandates";
import { cities } from "@/lib/cities";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";
const LOCALES = ["fr", "en", "de"] as const;
const isBeta = SITE_URL.includes("beta.");

const STATIC_PATHS = [
  "",
  "/biens",
  "/off-market",
  "/services/vendre",
  "/services/acheter",
  "/services/louer",
  "/services/estimer",
  "/services/simulateurs",
  "/services/marches-actifs",
  "/qui-sommes-nous",
  "/blog",
  "/contact",
  "/legal/mentions-legales",
  "/legal/cgu",
  "/legal/cgv",
  "/legal/rgpd",
  "/legal/honoraires",
];

const buildAlternates = (path: string) =>
  Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`]));

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Beta / staging : sitemap vide (pas d'indexation souhaitée).
  if (isBeta) return [];

  const [properties, offmarket, blogPosts] = await Promise.all([
    fetchAllPropertiesWithCover().catch(() => []),
    fetchOffmarketList().catch(() => []),
    fetchAllBlogPosts().catch(() => []),
  ]);

  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    STATIC_PATHS.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1.0 : 0.7,
      alternates: { languages: buildAlternates(path) },
    })),
  );

  const mandateEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    ALL_MANDATE_SLUGS.map((slug) => ({
      url: `${SITE_URL}/${locale}/mandats/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: buildAlternates(`/mandats/${slug}`) },
    })),
  );

  const propertyEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    properties.map((p) => ({
      url: `${SITE_URL}/${locale}/biens/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: { languages: buildAlternates(`/biens/${p.slug}`) },
    })),
  );

  const offmarketEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    offmarket.map((o) => ({
      url: `${SITE_URL}/${locale}/off-market/${o.id}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: { languages: buildAlternates(`/off-market/${o.id}`) },
    })),
  );

  const blogEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    blogPosts.map((post) => ({
      url: `${SITE_URL}/${locale}/blog/${post.slug}`,
      lastModified: post.published_at ? new Date(post.published_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: { languages: buildAlternates(`/blog/${post.slug}`) },
    })),
  );

  const cityEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    cities.map((city) => ({
      url: `${SITE_URL}/${locale}/villes/${city.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      alternates: {
        languages: Object.fromEntries(
          LOCALES.map((l) => [l, `${SITE_URL}/${l}/villes/${city.slug}`]),
        ),
      },
    })),
  );

  return [
    ...staticEntries,
    ...mandateEntries,
    ...cityEntries,
    ...propertyEntries,
    ...offmarketEntries,
    ...blogEntries,
  ];
}
