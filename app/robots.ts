import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

const isBeta = SITE_URL.includes("beta.");

// Pas de directive "Host" (oct. 2026) : propre a Yandex, abandonnee par
// lui-meme et inconnue de Google, elle etait signalee comme erreur dans le
// rapport robots.txt (valeur avec schema https:// de surcroit). Seules les
// directives reconnues par Google sont emises : User-agent, Allow,
// Disallow, Sitemap.
export default function robots(): MetadataRoute.Robots {
  // Beta / staging : tout bloquer aux moteurs de recherche.
  if (isBeta) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }

  // Production : moteurs/LLMs autorisés sauf /api et /admin, scrapers connus bloqués.
  return {
    rules: [
      {
        userAgent: ["Googlebot", "Bingbot", "DuckDuckBot", "Applebot"],
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "OAI-SearchBot",
          "ClaudeBot",
          "Claude-Web",
          "PerplexityBot",
          "Google-Extended",
          "anthropic-ai",
          "cohere-ai",
        ],
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: [
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
        ],
        disallow: "/",
      },
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
