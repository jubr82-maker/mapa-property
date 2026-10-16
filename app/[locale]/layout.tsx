import { siteShareImage, SITE_SHARE_IMAGE_SIZE } from "@/lib/og";
import type { Metadata } from "next";
import { sanitizeCssColorOverrides } from "@/lib/security/sanitize";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { Big_Shoulders, Archivo, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { TrackPageView } from "@/components/tracking/TrackPageView";
import { Suspense } from "react";
import { Header } from "@/components/layout/Header";
import { CtaBand } from "@/components/layout/CtaBand";
import { Footer } from "@/components/layout/Footer";
import { ChatbotWidgetLoader } from "@/components/chatbot/ChatbotWidgetLoader";
import { ConsentGatedAnalytics } from "@/components/consent/ConsentGatedAnalytics";
import { AttributionCapture } from "@/components/tracking/AttributionCapture";
import { ConsentGatedMarketing } from "@/components/consent/ConsentGatedMarketing";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { CONSENT_DECIDED_SCRIPT } from "@/lib/consent/decided-script";
import { JsonLd } from "@/components/seo/JsonLd";
import { NoiseOverlay } from "@/components/ui/NoiseOverlay";
import { AmbientBackgroundLite } from "@/components/effects/AmbientBackgroundLite";
import { ScrollProgressBar } from "@/components/effects/ScrollProgressBar";
import { homepageGraph } from "@/lib/seo";
import { clientMessages } from "@/lib/i18n-client-messages";
import { siteDesignTokens } from "@/lib/site-content";
import { ogLocale } from "@/lib/seo-page-meta";
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

// Perf mobile (oct. 2026) : police des petites etiquettes, non prechargee
// (affichee d'abord dans la police monospace du systeme, puis remplacee).
// Seules les polices du titre et du texte, visibles au premier affichage,
// restent prechargees.
const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
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
  const ogImage = siteShareImage();
  return {
    title: t("default_title"),
    description: t("default_description"),
    metadataBase: new URL(siteUrl),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fr: "/fr",
        en: "/en",
        de: "/de",
        "x-default": "/fr",
      },
    },
    openGraph: {
      title: t("default_title"),
      description: t("default_description"),
      url: `/${locale}`,
      siteName: "MAPA Property",
      locale: ogLocale(locale),
      type: "website",
      images: [{ url: ogImage, ...SITE_SHARE_IMAGE_SIZE }],
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
    // Icones (oct. 2026, scripts/generate-icons.mjs) : adresses stables
    // public/icons/, carres en multiples de 48 px. /favicon.ico (16, 32 et
    // 48 px) est declare par la convention app/favicon.ico.
    icons: {
      icon: [
        { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
        { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
        { url: "/icons/icon-144.png", sizes: "144x144", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
    },
    manifest: "/site.webmanifest",
    other: {
      // Balises geo.* et ICBM retirees (oct. 2026) : coordonnees du canton
      // du siege presentees comme "Luxembourg", region LU-LU inexacte ;
      // Google ne les utilise pas. L'adresse reelle est dans les donnees
      // structurees de la page des mentions legales.
      copyright: "© 2026 MAPA Synergy Sàrl",
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
  // Seulement les messages utiles au navigateur (lib/i18n-client-messages.ts).
  const messages = clientMessages((await getMessages()) as Record<string, unknown>);

  // CMS design tokens — override les couleurs racine via :root inline.
  // Les fonts restent gérées par next/font/google (Big Shoulders / Archivo /
  // JetBrains Mono ci-dessus). TODO: dynamic font loading later — pour
  // l'instant l'éditeur peut changer le token_value côté admin mais
  // l'affichage n'est pas encore relié (chargement de Google Fonts en
  // runtime à faire dans une phase ultérieure).
  //
  // Sprint OPTIM-1A hotfix : garde defensive contre une table
  // site_design_tokens outdated (ex. pre-palette Forêt avec seulement
  // {gold, ink, bg} = ancien Cuivre Sahara du commit 788fa03). Si aucune
  // key Forêt attendue n'est presente, on N'INJECTE PAS l'override —
  // globals.css garde la main avec la palette canonique (--copper,
  // --sapin, --creme, etc.). Sans cette garde, le <style>:root{} ecrase
  // globals.css avec d'anciennes valeurs, et revalidate: false fige le
  // bug pour 1 an (cf. OPTIM-1A C1).
  const tokens = await siteDesignTokens();
  const EXPECTED_COLOR_KEYS: readonly string[] = ["copper", "sapin", "creme"];
  const hasForetSchema = Object.keys(tokens.color ?? {}).some((k) =>
    EXPECTED_COLOR_KEYS.includes(k),
  );
  if (!hasForetSchema && process.env.NODE_ENV === "development") {
    console.warn(
      "[layout] site_design_tokens.color schema outdated (no copper/sapin/creme key); skipping injection, globals.css palette Forêt in use.",
    );
  }
  const colorOverrides: Record<string, string> = {};
  if (hasForetSchema) {
    for (const [k, v] of Object.entries(tokens.color ?? {})) {
      // token_key "copper" → CSS var "--copper"
      colorOverrides[`--${k}`] = v;
    }
  }
  // Valeurs du CMS filtrees (noms et couleurs CSS valides uniquement) :
  // aucune donnee ne peut sortir de la regle :root ni fermer <style>.
  const cssOverride = sanitizeCssColorOverrides(colorOverrides);

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
        {/* Banniere cookies rendue dans le HTML : masquee avant l'affichage
            si un choix existe deja (components/consent/CookieConsentBanner). */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_DECIDED_SCRIPT }} />
        {cssOverride ? (
          <style dangerouslySetInnerHTML={{ __html: `:root{${cssOverride}}` }} />
        ) : null}
        {/* Perf mobile (oct. 2026) : plus de preconnect vers Apimo, Supabase
            ni Cloudflare. Les photos passent par l'optimiseur du site
            (/_next/image, meme origine), les pages publiques ne parlent pas
            a Supabase depuis le navigateur, et Turnstile n'est charge
            qu'a l'approche d'un formulaire : ces connexions anticipees
            occupaient le reseau du telephone pendant l'affichage. Simple
            resolution DNS conservee pour Turnstile. */}
        <link rel="dns-prefetch" href="https://challenges.cloudflare.com" />
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
              <CtaBand />
              <Footer />
            </div>
            <ChatbotWidgetLoader />
            <CookieConsentBanner />
          </NextIntlClientProvider>
        </ThemeProvider>
        <ConsentGatedAnalytics cfToken={process.env.NEXT_PUBLIC_CF_ANALYTICS_TOKEN} />
        <AttributionCapture />
        <ConsentGatedMarketing />
      </body>
    </html>
  );
}
