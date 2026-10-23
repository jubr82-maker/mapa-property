import createNextIntlPlugin from "next-intl/plugin";
import { IMAGE_REMOTE_PATTERNS } from "./lib/image-hosts";
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
// favicons. Quotas Vercel (oct. 2026) : cache immuable d'un an. Un fichier
// remplace doit donc changer de nom (sinon l'ancien reste en cache).
const STATIC_ASSET_CACHE = "public, max-age=31536000, immutable";
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
    // Quotas Vercel (oct. 2026, docs/vercel-quotas.md) : inlineCss retire.
    // Il copiait la feuille de style (110 Ko) deux fois dans chaque page HTML
    // et une fois dans chaque fichier de donnees React (pres de la moitie du
    // poids servi depuis l'origine et de chaque ecriture ISR). La feuille est
    // de nouveau un fichier /_next/static, mis en cache un an par le CDN.
  },
  images: {
    // Quotas Vercel (oct. 2026, docs/vercel-quotas.md) : chaque couple
    // largeur x format x qualite est une transformation facturee. Un seul
    // format (WebP), une seule qualite (75), 31 jours de cache.
    formats: ["image/webp"],
    qualities: [75],
    minimumCacheTTL: 2678400,
    // Largeurs reellement affichees : cartes (33 a 90 vw), galerie (100 vw
    // sur telephone, 1100 px sur ordinateur, plafond 1920), vignettes et
    // avatars (32 a 96 px, en 1x et 2x). Avant : 13 largeurs x 2 formats.
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [64, 128, 256, 384],
    // Hotes autorises : lib/image-hosts.ts (source unique).
    remotePatterns: IMAGE_REMOTE_PATTERNS.map((p) => ({ ...p })),
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
