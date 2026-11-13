// Un fichier du sitemap par type (nov. 2026, audit SEO) :
// /sitemaps/pages.xml, biens, villes, journal, recherches, off-market,
// mandats (lib/sitemaps.ts). Tout autre nom : 404.
import { SITEMAP_TYPES, XML_HEADERS, isSitemapType, renderSitemapXml, sitemapEntries } from "@/lib/sitemaps";

export const revalidate = 2592000;
export const dynamicParams = false;

export function generateStaticParams() {
  return SITEMAP_TYPES.map((t) => ({ file: `${t}.xml` }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }): Promise<Response> {
  const { file } = await params;
  const type = file.replace(/\.xml$/, "");
  if (!file.endsWith(".xml") || !isSitemapType(type)) return new Response("Not found", { status: 404 });
  return new Response(renderSitemapXml(await sitemapEntries(type)), { headers: XML_HEADERS });
}
