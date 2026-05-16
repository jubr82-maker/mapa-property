import { getTranslations } from "next-intl/server";
import { sbUrl } from "@/lib/supabase-url";
import { siteContent } from "@/lib/site-content";
import { LiveClock } from "@/components/home/LiveClock";
import { SignatureLine } from "@/components/ui/SignatureLine";

export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "hero" });
  // CMS overlay (site_content) — fallback sur next-intl si la table
  // est vide ou la migration absente. Cf. lib/site-content.ts.
  const [
    pill,
    eyebrow,
    titleLine1,
    titleLine2,
    titleLine3,
    subtitle,
    metaCatalog,
    metaSegments,
    metaCoverage,
    metaStatus,
    scroll,
  ] = await Promise.all([
    siteContent("home.hero.pill", locale, t("pill")),
    siteContent("home.hero.eyebrow", locale, t("eyebrow")),
    siteContent("home.hero.title_line_1", locale, t("title_line_1")),
    siteContent("home.hero.title_line_2", locale, t("title_line_2")),
    siteContent("home.hero.title_line_3", locale, t("title_line_3")),
    siteContent("home.hero.subtitle", locale, t("subtitle")),
    siteContent("home.hero.meta_catalog", locale, t("meta_catalog")),
    siteContent("home.hero.meta_segments", locale, t("meta_segments")),
    siteContent("home.hero.meta_coverage", locale, t("meta_coverage")),
    siteContent("home.hero.meta_status", locale, t("meta_status")),
    siteContent("home.hero.scroll", locale, t("scroll")),
  ]);
  const videoDesktop = sbUrl("Videos", "mapa_showcase_desktop.mp4");
  const videoMobile = sbUrl("Videos", "mapa_showcase_mobile.mp4");

  return (
    <section className="relative isolate min-h-[80vh] overflow-hidden bg-[#070605] lg:min-h-screen">
      {/* Video background — bucket Supabase "Videos" (majuscule).
          CSP media-src 'self' https://*.supabase.co indispensable
          (cf. next.config.ts). Pas de poster externe : le bg #070605
          joue le rôle de placeholder le temps du buffering.
          Servi en deux variantes responsive (desktop 4.7MB / mobile 3.1MB)
          + preload="metadata" pour réduire l'Egress Supabase ~70%. */}
      <video
        className="absolute inset-0 size-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      >
        <source src={videoDesktop} type="video/mp4" media="(min-width: 1024px)" />
        <source src={videoMobile} type="video/mp4" />
      </video>

      {/* Gradient overlay (ink → transparent → ink 60%) */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[#070605]/65 via-[#070605]/20 to-[#070605]/85"
      />

      {/* Brackets dorés (4 coins) */}
      <div aria-hidden className="pointer-events-none absolute inset-6 sm:inset-10">
        <Bracket position="top-left" />
        <Bracket position="top-right" />
        <Bracket position="bottom-left" />
        <Bracket position="bottom-right" />
      </div>

      {/* Data corners (mono small text) */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        <DataCorner position="top-left">VOL.I MMXXVI</DataCorner>
        <DataCorner position="top-right">
          LIVE · LU <LiveClock />
        </DataCorner>
        <DataCorner position="bottom-left">FRAME 001</DataCorner>
        <DataCorner position="bottom-right">49°27′N · 6°09′E</DataCorner>
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex min-h-[88dvh] max-w-[1400px] flex-col items-start justify-center gap-4 px-6 pt-24 pb-16 md:gap-8 md:pt-32 md:pb-24 lg:px-10">
        {/* Pill or */}
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-black/30 px-3 py-1 backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-gold-bright" />
          <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-gold-bright md:text-[10px]">
            {pill}
          </span>
        </div>

        {/* Eyebrow */}
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/70 sm:text-xs">
          {eyebrow}
        </p>

        {/* Titre 3 lignes — taille -15%, leading 1.15 (accents OK), tracking aéré */}
        <h1 className="font-display font-black leading-[1.15] tracking-[0.02em] text-[clamp(1.9rem,7.65vw,6.8rem)]">
          <span className="block text-white/90">{titleLine1}</span>
          <span className="block text-white">{titleLine2}</span>
          <span className="gold-text block">{titleLine3}</span>
        </h1>

        <SignatureLine />

        {/* Subtitle */}
        <p className="max-w-xl text-xs leading-relaxed text-white/80 md:text-lg lg:text-xl">
          {subtitle}
        </p>

        {/* Meta row */}
        <ul className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[9px] uppercase tracking-[0.3em] text-white/60 md:gap-x-6 md:text-[10px]">
          <li>{metaCatalog}</li>
          <li aria-hidden className="text-gold/60">·</li>
          <li>{metaSegments}</li>
          <li aria-hidden className="text-gold/60">·</li>
          <li>{metaCoverage}</li>
          <li aria-hidden className="text-gold/60">·</li>
          <li className="inline-flex items-center gap-2">
            <span className="size-1.5 animate-pulse rounded-full bg-gold-bright" />
            {metaStatus}
          </li>
        </ul>
      </div>

      {/* Scroll indicator */}
      <a
        href="#search"
        aria-label={scroll}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/70 transition-colors hover:text-gold-bright"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
          {scroll}
        </span>
        <span aria-hidden className="mt-2 block animate-bounce text-center">
          ↓
        </span>
      </a>
    </section>
  );
}

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const positionMap: Record<Position, string> = {
  "top-left": "top-0 left-0",
  "top-right": "top-0 right-0",
  "bottom-left": "bottom-0 left-0",
  "bottom-right": "bottom-0 right-0",
};

function Bracket({ position }: { position: Position }) {
  const rotate = {
    "top-left": "rotate-0",
    "top-right": "rotate-90",
    "bottom-right": "rotate-180",
    "bottom-left": "-rotate-90",
  }[position];
  return (
    <span
      className={`absolute ${positionMap[position]} size-10 ${rotate} text-gold-bright`}
    >
      <span className="absolute left-0 top-0 h-px w-10 bg-current" />
      <span className="absolute left-0 top-0 h-10 w-px bg-current" />
    </span>
  );
}

function DataCorner({
  position,
  children,
}: {
  position: Position;
  children: React.ReactNode;
}) {
  const align: Record<Position, string> = {
    "top-left": "top-6 left-6 sm:top-10 sm:left-10",
    "top-right": "top-6 right-6 sm:top-10 sm:right-10 text-right",
    "bottom-left": "bottom-6 left-6 sm:bottom-10 sm:left-10",
    "bottom-right": "bottom-6 right-6 sm:bottom-10 sm:right-10 text-right",
  };
  return (
    <span
      className={`absolute z-10 ${align[position]} font-mono text-[10px] uppercase tracking-[0.3em] text-gold-bright/80`}
    >
      {children}
    </span>
  );
}
