import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Big_Shoulders, Archivo, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/react";
import { JsonLd } from "@/components/seo/JsonLd";
import { homepageGraph } from "@/lib/seo";
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

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body className="min-h-dvh bg-bg text-ink antialiased">
        <JsonLd data={homepageGraph(locale)} />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider locale={locale} messages={messages}>
            <Header />
            <div className="flex min-h-dvh flex-col">
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <ChatbotWidget />
          </NextIntlClientProvider>
        </ThemeProvider>
        <Analytics />
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
