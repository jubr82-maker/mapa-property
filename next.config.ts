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
  "connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com https://sdw-wsrest.ecb.europa.eu https://cloudflareinsights.com https://api.qrserver.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com",
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
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
  { key: "X-Robots-Tag", value: "noai, noimageai" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  // Défaut Next.js = 1 MB pour le body des Server Actions ; trop bas pour
  // l'upload de photos brutes (2-10 Mo) avant compression côté client.
  // 25mb absorbe même les photos non compressées, en fallback si la
  // compression échoue côté navigateur (lib/image-compress.ts).
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "dutfkblygfvhhwpzxmfz.supabase.co",
        pathname: "/storage/v1/object/public/**",
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
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
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
