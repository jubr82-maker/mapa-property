// Index des sitemaps (nov. 2026, audit SEO) : adresse /sitemap.xml
// inchangee (declaree dans robots.txt), un fichier par type
// (lib/sitemaps.ts). Site beta : index vide.
import { XML_HEADERS, renderSitemapIndex } from "@/lib/sitemaps";

// Quotas Vercel (oct. 2026, docs/vercel-quotas.md) : revalidation a la
// demande quand le contenu change ; minuterie de secours de 30 jours seulement.
export const revalidate = 2592000;

export function GET(): Response {
  return new Response(renderSitemapIndex(), { headers: XML_HEADERS });
}
