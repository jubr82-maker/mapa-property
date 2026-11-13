// Sitemaps par type (nov. 2026, audit SEO du 12/11/2026). /sitemap.xml est
// un INDEX (adresse inchangee, declaree dans robots.txt) qui cite un fichier
// par type : pages, biens, villes, journal, recherches, off-market, mandats
// (/sitemaps/<type>.xml). Memes contenus et memes regles qu'avant :
//  - pages publiees et indexables seulement (liste d'attente retiree, en
//    noindex depuis nov. 2026) ;
//  - villes indexables seulement (lib/city-indexing.ts) ;
//  - recherches publiees seulement ;
//  - aucune adresse avec parametre, sauf /biens?transaction=sale et rent ;
//  - date de modification reelle seulement (jamais pour une page fixe) ;
//  - hreflang fr, en, de et x-default vers la version francaise ;
//  - site beta : index et fichiers vides.
import { revalidatePath } from "next/cache";
// Lectures en base chargees a la demande (types concernes seulement) : le
// module reste utilisable par les tests sans serveur (scripts/seo/test-sitemaps.mts).
const data = () => import("@/lib/data");
import { ALL_MANDATE_SLUGS } from "@/lib/mandates";
import { indexableCities } from "@/lib/city-indexing";
import { LISTING_TRANSACTION_PATHS } from "@/lib/search/url";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";
const LOCALES = ["fr", "en", "de"] as const;
export const isBetaSite = () => SITE_URL.includes("beta.");

export const SITEMAP_TYPES = ["pages", "biens", "villes", "journal", "recherches", "off-market", "mandats"] as const;
export type SitemapType = (typeof SITEMAP_TYPES)[number];

export function isSitemapType(v: unknown): v is SitemapType {
  return typeof v === "string" && (SITEMAP_TYPES as readonly string[]).includes(v);
}

/** Adresse publique d'un fichier du sitemap. */
export const sitemapFilePath = (type: SitemapType) => `/sitemaps/${type}.xml`;

// Pages a contenu fixe : AUCUNE date de modification (pas de date inventee).
// Retirees : les adresses qui ne font que rediriger (/services/mandat-
// exclusif, /services/mandat-recherche, /journal) et, depuis nov. 2026, la
// liste d'attente (noindex, follow).
export const STATIC_PATHS = [
  "",
  "/biens",
  "/off-market",
  "/off-market/arcova",
  "/agence-immobiliere-luxembourg",
  "/services",
  "/services/acheter",
  "/services/broker-international",
  "/services/vendre",
  "/services/louer",
  "/services/estimer",
  "/services/simulateurs",
  "/services/simulateurs/financement",
  "/services/capacite-emprunt",
  "/services/rendement-locatif",
  "/services/marches-actifs",
  "/qui-sommes-nous",
  "/recherches",
  "/blog",
  "/faq",
  "/contact",
  "/mentions-acquisition",
  "/legal/mentions-legales",
  "/legal/cgu",
  "/legal/cgv",
  "/legal/rgpd",
  "/legal/honoraires",
  "/legal/intelligence-artificielle",
];

export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?: "weekly" | "monthly";
  priority?: number;
  languages: Record<string, string>;
}

const buildAlternates = (path: string): Record<string, string> => ({
  ...Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${path}`])),
  "x-default": `${SITE_URL}/fr${path}`,
});

const validDate = (v: unknown): Date | undefined => {
  if (typeof v !== "string" || !v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** Adresses d'un type (meme contenu que l'ancien sitemap unique). */
export async function sitemapEntries(type: SitemapType): Promise<SitemapEntry[]> {
  if (isBetaSite()) return [];
  switch (type) {
    case "pages":
      return [
        ...LOCALES.flatMap((locale) =>
          STATIC_PATHS.map((path) => ({
            url: `${SITE_URL}/${locale}${path}`,
            changeFrequency: "weekly" as const,
            priority: path === "" ? 1.0 : 0.7,
            languages: buildAlternates(path),
          })),
        ),
        // Pages "biens a vendre" et "biens a louer" : les seules adresses avec
        // parametre (canonical vers elles-memes, partie B de l'audit).
        ...LOCALES.flatMap((locale) =>
          LISTING_TRANSACTION_PATHS.map((path) => ({
            url: `${SITE_URL}/${locale}${path}`,
            changeFrequency: "weekly" as const,
            priority: 0.8,
            languages: buildAlternates(path),
          })),
        ),
      ];
    case "mandats":
      return LOCALES.flatMap((locale) =>
        ALL_MANDATE_SLUGS.map((slug) => ({
          url: `${SITE_URL}/${locale}/mandats/${slug}`,
          changeFrequency: "monthly" as const,
          priority: 0.8,
          languages: buildAlternates(`/mandats/${slug}`),
        })),
      );
    case "biens": {
      const properties = await (await data()).fetchAllPropertiesWithCover().catch(() => []);
      return LOCALES.flatMap((locale) =>
        properties
          .filter((p) => Boolean(p.slug))
          .map((p) => ({
            url: `${SITE_URL}/${locale}${p.paths?.[locale] ?? `/biens/${p.slug}`}`,
            lastModified: validDate((p as { updated_at?: string | null }).updated_at),
            changeFrequency: "weekly" as const,
            priority: 0.8,
            languages: p.paths
              ? { fr: `${SITE_URL}/fr${p.paths.fr}`, en: `${SITE_URL}/en${p.paths.en}`, de: `${SITE_URL}/de${p.paths.de}`, "x-default": `${SITE_URL}/fr${p.paths.fr}` }
              : buildAlternates(`/biens/${p.slug}`),
          })),
      );
    }
    case "off-market": {
      const offmarket = await (await data()).fetchOffmarketList().catch(() => []);
      return LOCALES.flatMap((locale) =>
        offmarket.map((o) => ({
          url: `${SITE_URL}/${locale}/off-market/${o.id}`,
          changeFrequency: "weekly" as const,
          priority: 0.7,
          languages: buildAlternates(`/off-market/${o.id}`),
        })),
      );
    }
    case "journal": {
      const posts = await (await data()).fetchAllBlogPosts().catch(() => []);
      return LOCALES.flatMap((locale) =>
        posts.map((post) => ({
          url: `${SITE_URL}/${locale}/blog/${post.slug}`,
          lastModified: validDate((post as { updated_at?: string | null }).updated_at) ?? validDate(post.published_at),
          changeFrequency: "monthly" as const,
          priority: 0.6,
          languages: buildAlternates(`/blog/${post.slug}`),
        })),
      );
    }
    case "villes": {
      // Lecture sans repli : en cas d'erreur, le fichier n'est pas regenere et
      // garde son etat precedent (aucune ville retiree a tort).
      const cities = indexableCities(await (await data()).fetchAllPropertiesWithCoverStrict());
      return LOCALES.flatMap((locale) =>
        cities.map((city) => ({
          url: `${SITE_URL}/${locale}/villes/${city.slug}`,
          changeFrequency: "weekly" as const,
          priority: 0.6,
          languages: buildAlternates(`/villes/${city.slug}`),
        })),
      );
    }
    case "recherches": {
      const searches = await (await import("@/lib/searches/data")).fetchPublicSearches().catch(() => []);
      return LOCALES.flatMap((locale) =>
        searches
          .filter((s) => s.status === "published")
          .map((s) => ({
            url: `${SITE_URL}/${locale}/recherches/${s.reference}`,
            lastModified: validDate(s.updated_at),
            changeFrequency: "weekly" as const,
            priority: 0.6,
            languages: buildAlternates(`/recherches/${s.reference}`),
          })),
      );
    }
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Fichier XML d'un type (meme format que le sitemap genere par Next.js). */
export function renderSitemapXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((e) =>
      [
        "<url>",
        `<loc>${esc(e.url)}</loc>`,
        ...Object.entries(e.languages).map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${esc(lang)}" href="${esc(href)}" />`),
        e.lastModified ? `<lastmod>${e.lastModified.toISOString()}</lastmod>` : "",
        e.changeFrequency ? `<changefreq>${e.changeFrequency}</changefreq>` : "",
        e.priority !== undefined ? `<priority>${e.priority}</priority>` : "",
        "</url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
}

/** Index des sitemaps (aucune date inventee : lastmod seulement si connue). */
export function renderSitemapIndex(): string {
  const items = isBetaSite() ? [] : SITEMAP_TYPES.map((t) => `<sitemap>\n<loc>${esc(`${SITE_URL}${sitemapFilePath(t)}`)}</loc>\n</sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join("\n")}\n</sitemapindex>\n`;
}

export const XML_HEADERS = { "Content-Type": "application/xml; charset=utf-8" };

/** Apres une modification de contenu : index et fichiers regeneres. */
export function revalidateSitemaps(types: readonly SitemapType[] = SITEMAP_TYPES): void {
  revalidatePath("/sitemap.xml");
  for (const t of types) revalidatePath(sitemapFilePath(t));
}
