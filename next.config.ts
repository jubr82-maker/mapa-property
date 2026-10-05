import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const csp = [
  "default-src 'self'",
  // GA4 (gtag.js) — chargé uniquement après consentement "Statistiques"
  // (cf. ConsentGatedAnalytics.tsx) mais nécessite ces domaines en CSP
  // pour fonctionner du tout quand il est monté, sinon le script/les
  // hits de mesure sont bloqués silencieusement par le navigateur.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  // media-src indispensable pour la vidéo hero Supabase (cross-origin).
  // Sans cette directive, le fallback default-src 'self' bloque toute
  // ressource <video> hors origine, ce qui causait le hero noir.
  "media-src 'self' https://*.supabase.co https: blob: data:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://sdw-wsrest.ecb.europa.eu https://cloudflareinsights.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Audit oct. 2026 : equivalent CSP de X-Frame-Options SAMEORIGIN
  // (anti-clickjacking, OWASP ASVS 14.4.7).
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
];

// Perf oct. 2026 (PageSpeed : ressources mal mises en cache). Next sert
// public/ en "max-age=0" : chaque visite revalidait logos, avatars,
// favicons. Noms non hashes -> 30 jours (pas immutable) + revalidation
// en arriere-plan, pour qu'un fichier remplace se propage en douceur.
const STATIC_ASSET_CACHE = "public, max-age=2592000, stale-while-revalidate=86400";
const ROOT_STATIC_FILES = [
  "logo_mapa_jour.png",
  "logo_mapa_nuit.png",
  "logo-mapa-property.svg",
  "logo-mapa-property.png",
  "logo-mapa-property-mono.png",
  "elena-avatar.jpg",
  "offmarket_hero.png",
  "apple-touch-icon.png",
  "favicon-16.png",
  "favicon-32.png",
  "favicon-48.png",
  "pwa-192.png",
  "pwa-384.png",
  "pwa-512.png",
  "pwa-512-maskable.png",
]
  .map((f) => f.replace(/\./g, "\\."))
  .join("|");

const nextConfig: NextConfig = {
  // Date de construction, affichee dans Sante du site (oct. 2026). Valeur
  // non secrete, utilisee seulement cote serveur.
  env: { BUILD_TIMESTAMP: new Date().toISOString() },
  // Défaut Next.js = 1 MB pour le body des Server Actions ; trop bas pour
  // l'upload de photos brutes (2-10 Mo) avant compression côté client.
  // 25mb absorbe même les photos non compressées, en fallback si la
  // compression échoue côté navigateur (lib/image-compress.ts).
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
    // Perf oct. 2026 (PageSpeed : 680 ms de blocage du rendu). Les feuilles
    // CSS (Tailwind, atomique et compact) sont injectees en <style> dans le
    // HTML au lieu de <link> bloquants : plus d'aller-retour avant le 1er
    // rendu. Experimental Next 16 ; retour arriere = supprimer cette ligne.
    inlineCss: true,
  },
  images: {
    // Perf oct. 2026 : AVIF (~20-30 % plus leger que WebP) en priorite.
    formats: ["image/avif", "image/webp"],
    // Defaut Next 16 = 4 h ; les images optimisees (/_next/image) etaient
    // signalees "mal mises en cache". 30 jours : les photos de biens ont
    // des URL uniques, les logos changent rarement.
    minimumCacheTTL: 2592000,
    // SEO oct. 2026 : les variantes 3840 px des photos Apimo repondaient 404
    // et aucun affichage du site ne depasse 1920 px de large. Plafond a 1920 ;
    // imageSizes (vignettes, < plus petite deviceSize) = defaut Next 16.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        // Poster de la video hero (Cloudflare R2, cf. components/home/Hero.tsx).
        protocol: "https",
        hostname: "pub-c9fa8716c00f4a0c965197a93086bdce.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "dutfkblygfvhhwpzxmfz.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // URL signees (buckets prives "documents"/"offmarket-photos" —
        // cf. lib/storage-signed-url.ts) : chemin /object/sign/, distinct
        // du chemin /object/public/ ci-dessus.
        protocol: "https",
        hostname: "dutfkblygfvhhwpzxmfz.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
      {
        protocol: "https",
        hostname: "media.apimo.pro",
      },
      {
        protocol: "https",
        hostname: "*.apimo.pro",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Redirections permanentes (308, oct. 2026). Les anciennes adresses sans
  // extension sont traitees par proxy.ts (lib/legacy-redirects.ts) ; ici,
  // celles que le proxy ne voit pas (fichiers .html du site v28) et les
  // pages internes devenues de simples renvois.
  async redirects() {
    return [
      { source: "/index.html", destination: "/fr", permanent: true },
      { source: "/403.html", destination: "/fr", permanent: true },
      { source: "/admin/index.html", destination: "/admin", permanent: true },
      { source: "/content/article-:n(\\d+)-:lang(fr|en|de).html", destination: "/:lang/blog", permanent: true },
      { source: "/:locale(fr|en|de)/services/mandat-recherche", destination: "/:locale/mandats/recherche", permanent: true },
      { source: "/:locale(fr|en|de)/services/mandat-exclusif", destination: "/:locale/mandats/exclusif", permanent: true },
      { source: "/:locale(fr|en|de)/journal", destination: "/:locale/blog", permanent: true },
    ];
  },
  // Fichier de cle IndexNow servi a la racine (/<cle>.txt), cf.
  // app/api/indexnow-key/[key]/route.ts.
  async rewrites() {
    return [{ source: "/:key([a-f0-9]{8,128}).txt", destination: "/api/indexnow-key/:key" }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/:dir(fonts|images|logos|icons)/:path*",
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
      {
        source: `/:file(${ROOT_STATIC_FILES})`,
        headers: [{ key: "Cache-Control", value: STATIC_ASSET_CACHE }],
      },
    ];
  },
  productionBrowserSourceMaps: false,
};

const withIntl = withNextIntl(nextConfig);

// Sentry n'est activé qu'avec SENTRY_AUTH_TOKEN présent (scaffolding sinon).
const finalConfig = process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(withIntl, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    })
  : withIntl;

export default finalConfig;
