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

// Oct. 2026 : exactement les pages publiees et indexables. Retirees : les
// adresses qui ne font que rediriger (/services/acheter,
// /services/mandat-exclusif, /services/mandat-recherche, /journal).
// Ajoutees : pages existantes absentes (services, simulateurs, ARCOVA,
// liste d'attente, mentions du simulateur d'acquisition).
// Pages a contenu fixe : AUCUNE date de modification (pas de date
// inventee) ; biens et articles : leur date reelle en base.
const STATIC_PATHS = [
  "",
  "/biens",
  "/off-market",
  "/off-market/arcova",
  "/liste-attente",
  "/services",
  "/services/vendre",
  "/services/louer",
  "/services/estimer",
  "/services/simulateurs",
  "/services/simulateurs/financement",
  "/services/capacite-emprunt",
  "/services/rendement-locatif",
  "/services/marches-actifs",
  "/qui-sommes-nous",
  "/blog",
  "/contact",
  "/mentions-acquisition",
  "/legal/mentions-legales",
  "/legal/cgu",
  "/legal/cgv",
  "/legal/rgpd",
  "/legal/honoraires",
  "/legal/intelligence-artificielle",
];

// Memes codes que les hreflang des pages (lib/seo.ts) : fr, en, de et
// x-default vers la version francaise.
const buildAlternates = (path: string) => ({
  ...Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`])),
  "x-default": `${SITE_URL}/fr${path}`,
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Beta / staging : sitemap vide (pas d'indexation souhaitée).
  if (isBeta) return [];

  const [properties, offmarket, blogPosts] = await Promise.all([
    fetchAllPropertiesWithCover().catch(() => []),
    fetchOffmarketList().catch(() => []),
    fetchAllBlogPosts().catch(() => []),
  ]);

  const validDate = (v: unknown): Date | undefined => {
    if (typeof v !== "string" || !v) return undefined;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  const staticEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    STATIC_PATHS.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1.0 : 0.7,
      alternates: { languages: buildAlternates(path) },
    })),
  );

  const mandateEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    ALL_MANDATE_SLUGS.map((slug) => ({
      url: `${SITE_URL}/${locale}/mandats/${slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: buildAlternates(`/mandats/${slug}`) },
    })),
  );

  const propertyEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    properties
      .filter((p) => Boolean(p.slug))
      .map((p) => ({
        url: `${SITE_URL}/${locale}/biens/${p.slug}`,
        lastModified: validDate((p as { updated_at?: string | null }).updated_at),
        changeFrequency: "weekly" as const,
        priority: 0.8,
        alternates: { languages: buildAlternates(`/biens/${p.slug}`) },
      })),
  );

  const offmarketEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    offmarket.map((o) => ({
      url: `${SITE_URL}/${locale}/off-market/${o.id}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: { languages: buildAlternates(`/off-market/${o.id}`) },
    })),
  );

  const blogEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    blogPosts.map((post) => ({
      url: `${SITE_URL}/${locale}/blog/${post.slug}`,
      lastModified:
        validDate((post as { updated_at?: string | null }).updated_at) ?? validDate(post.published_at),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      alternates: { languages: buildAlternates(`/blog/${post.slug}`) },
    })),
  );

  const cityEntries: MetadataRoute.Sitemap = LOCALES.flatMap((locale) =>
    cities.map((city) => ({
      url: `${SITE_URL}/${locale}/villes/${city.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
      alternates: { languages: buildAlternates(`/villes/${city.slug}`) },
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
