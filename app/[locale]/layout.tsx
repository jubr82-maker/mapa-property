import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Big_Shoulders, Archivo, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TrackPageView } from "@/components/tracking/TrackPageView";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatbotWidgetLoader } from "@/components/chatbot/ChatbotWidgetLoader";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { JsonLd } from "@/components/seo/JsonLd";
import { NoiseOverlay } from "@/components/ui/NoiseOverlay";
import { AmbientBackgroundLite } from "@/components/effects/AmbientBackgroundLite";
import { ScrollProgressBar } from "@/components/effects/ScrollProgressBar";
import { homepageGraph } from "@/lib/seo";
import { siteDesignTokens } from "@/lib/site-content";
import "../globals.css";

const display = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "900"],
  display: "swap",
});

const sans = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://mapaproperty.lu";
  const ogImage = `${siteUrl}/og/og-${locale}.png`;
  return {
    title: t("default_title"),
    description: t("default_description"),
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        "fr-LU": "/fr",
        "en-US": "/en",
        "de-DE": "/de",
        "x-default": "/fr",
      },
    },
    openGraph: {
      title: t("default_title"),
      description: t("default_description"),
      url: `/${locale}`,
      siteName: "MAPA Property",
      locale:
        locale === "fr" ? "fr_LU" : locale === "de" ? "de_DE" : "en_US",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("default_title"),
      description: t("default_description"),
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    icons: {
      icon: [
        { url: "/logo-mapa-property.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      apple: "/apple-touch-icon.png",
    },
    other: {
      "geo.region": "LU-LU",
      "geo.position": "49.4811;6.0878",
      ICBM: "49.4811, 6.0878",
      "geo.placename": "Luxembourg",
      copyright: "© 2026 MAPA Synergy Sàrl",
      // Note: "noai" / "noimageai" sont des indicateurs informels que certains
      // crawlers IA respectent. Aucune garantie technique.
      "robots-noai": "noai, noimageai",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const messages = await getMessages();

  // CMS design tokens — override les couleurs racine via :root inline.
  // Les fonts restent gérées par next/font/google (Big Shoulders / Archivo /
  // JetBrains Mono ci-dessus). TODO: dynamic font loading later — pour
  // l'instant l'éditeur peut changer le token_value côté admin mais
  // l'affichage n'est pas encore relié (chargement de Google Fonts en
  // runtime à faire dans une phase ultérieure).
  const tokens = await siteDesignTokens();
  const colorOverrides: Record<string, string> = {};
  for (const [k, v] of Object.entries(tokens.color ?? {})) {
    // token_key "gold" → CSS var "--gold"
    colorOverrides[`--${k}`] = v;
  }
  const cssOverride = Object.entries(colorOverrides)
    .map(([k, v]) => `${k}:${v};`)
    .join("");

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <head>
        {/* STEP3a-bis : anti-FOUC — applique la classe .dark sur <html>
            AVANT le premier paint pour matcher la logique ThemeToggle
            (premier visiteur OU mapa_theme === 'dark' → dark ; seul
            mapa_theme === 'light' force light). Bloque <100 ms,
            évite le flash crème velin → sapin au mount React. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('mapa_theme');if(s==='light'){document.documentElement.classList.remove('dark');}else{document.documentElement.classList.add('dark');}}catch(e){}})();`,
          }}
        />
        {cssOverride ? (
          <style dangerouslySetInnerHTML={{ __html: `:root{${cssOverride}}` }} />
        ) : null}
        {/* Connexions critiques pré-établies — LCP : images Apimo (cover fiches)
            et Supabase (vidéo hero + images storage). Le preconnect avec
            crossOrigin couvre le fetch des images cross-origin. */}
        <link rel="dns-prefetch" href="https://media.apimo.pro" />
        <link rel="dns-prefetch" href="https://dutfkblygfvhhwpzxmfz.supabase.co" />
        <link
          rel="preconnect"
          href="https://media.apimo.pro"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://dutfkblygfvhhwpzxmfz.supabase.co"
          crossOrigin="anonymous"
        />
        {/* POL1 : preconnect Turnstile — stabilise/accélère le 1er
            rendu du widget (moins de flicker au mount). */}
        <link rel="dns-prefetch" href="https://challenges.cloudflare.com" />
        <link
          rel="preconnect"
          href="https://challenges.cloudflare.com"
          crossOrigin="anonymous"
        />
      </head>
      <body
        className="min-h-dvh bg-bg text-ink antialiased"
        style={{ backgroundColor: "var(--ambient-bg)" }}
      >
        {/* STEP3a-FORET : AmbientBackgroundLite — fond crème velin
            #F0E6CC (jour) / sapin #1F221A (nuit) + 4 line-art cuivre
            citron #e0af6e en vague océanique marquée, réaction souris
            ±100px. ScrollProgressBar + NoiseOverlay préservés. */}
        <AmbientBackgroundLite />
        <ScrollProgressBar />
        <NoiseOverlay />
        <JsonLd data={homepageGraph(locale)} />
        {/* SPRINT3 T1 : next-themes aligne sur le custom toggle + script
            anti-FOUC — meme storageKey 'mapa_theme', defaultTheme 'dark',
            enableSystem desactive (mode nuit force premier visiteur). Fix
            le conflit qui retirait .dark sur Safari iOS → logo cuivre
            citron applique des le 1er paint sans flash sapin. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          storageKey="mapa_theme"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Suspense fallback={null}>
              <TrackPageView />
            </Suspense>
            <Header />
            <div
              className="flex min-h-dvh flex-col"
              style={{ position: "relative", zIndex: 1 }}
            >
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <ChatbotWidgetLoader />
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
        {process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN ? (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN}"}`}
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
