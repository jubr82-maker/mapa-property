import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";

const isBeta = SITE_URL.includes("beta.");

export default function robots(): MetadataRoute.Robots {
  // Beta / staging : tout bloquer aux moteurs de recherche.
  if (isBeta) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host: SITE_URL,
    };
  }

  // Production : permissif sauf /api et /admin, blocage scrapers connus.
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/"],
      },
      {
        userAgent: ["HTTrack", "WebCopier", "wget", "curl"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
