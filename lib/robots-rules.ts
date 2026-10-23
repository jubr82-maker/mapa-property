// Regles de robots.txt (oct. 2026), partagees par app/robots.ts et
// tests/seo/robots.spec.ts.
import type { MetadataRoute } from "next";

/**
 * Moteurs de recherche et robots des assistants IA autorises sur les pages
 * publiques. Les dix premiers sont exiges par Julien ; les suivants
 * (anciens noms ou moteurs secondaires) restent autorises.
 */
export const SEARCH_AND_AI_CRAWLERS = [
  "Googlebot",
  "Bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Google-Extended",
  "Applebot-Extended",
  "Applebot",
  "DuckDuckBot",
  "Claude-User",
  "Claude-Web",
  "anthropic-ai",
] as const;

/** Robots exiges explicitement (verifies par le test). */
export const REQUIRED_ALLOWED_CRAWLERS = SEARCH_AND_AI_CRAWLERS.slice(0, 10);

/**
 * Chemins prives, interdits a tous : administration, API, page de test
 * (deja en noindex) dans les trois langues. "/admin" sans barre finale
 * couvre aussi /admin lui-meme.
 */
export const PRIVATE_PATHS = ["/admin", "/api/", "/*/test-scroll"] as const;

/**
 * Adresses avec parametres (oct. 2026, quotas Vercel) : suivi publicitaire
 * (utm, gclid, fbclid, msclkid) sur toute page, et liste des biens filtree.
 * Chaque variante est une page a rendre pour rien : les robots ne les
 * explorent plus. La liste sans parametre reste autorisee, ainsi que
 * /biens?transaction= (cible des anciennes adresses du site v28).
 */
export const QUERY_DISALLOW = ["/*?*utm_", "/*?*gclid=", "/*?*fbclid=", "/*?*msclkid=", "/*/biens?"] as const;
export const QUERY_ALLOW = ["/*/biens?transaction="] as const;

/** Aspirateurs de contenu sans usage pour la visibilite du site. */
export const BLOCKED_SCRAPERS = [
  "SemrushBot",
  "AhrefsBot",
  "MJ12bot",
  "DotBot",
  "BLEXBot",
  "PetalBot",
  "Bytespider",
  "HTTrack",
  "WebCopier",
  "wget",
  "curl",
] as const;

/**
 * Contenu de robots.txt pour une adresse de site.
 *
 * Pas de directive "Host" : propre a Yandex, abandonnee par lui-meme et
 * inconnue de Google, elle etait signalee comme erreur dans le rapport
 * robots.txt. Seules les directives reconnues par Google sont emises :
 * User-agent, Allow, Disallow, Sitemap.
 *
 * Moteurs de recherche et robots des assistants IA nommes explicitement,
 * autorises sur les pages publiques. Un robot n'applique que le groupe le
 * plus precis qui le nomme : chaque groupe repete donc les chemins prives.
 */
export function robotsConfig(siteUrl: string): MetadataRoute.Robots {
  // Beta / staging : tout bloquer aux moteurs de recherche.
  if (siteUrl.includes("beta.")) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }
  return {
    rules: [
      { userAgent: [...SEARCH_AND_AI_CRAWLERS], allow: ["/", ...QUERY_ALLOW], disallow: [...PRIVATE_PATHS, ...QUERY_DISALLOW] },
      { userAgent: [...BLOCKED_SCRAPERS], disallow: "/" },
      { userAgent: "*", allow: ["/", ...QUERY_ALLOW], disallow: [...PRIVATE_PATHS, ...QUERY_DISALLOW] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
