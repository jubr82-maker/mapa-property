import { getTranslations } from "next-intl/server";
import { sbUrl } from "@/lib/supabase-url";
import { siteContent } from "@/lib/site-content";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { ParallaxImage } from "@/components/ui/ParallaxImage";
import { HeroScrollContainer } from "@/components/home/HeroScrollContainer";

export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "hero" });
  // POL4 : hero nettoyé — pill (source "TEST CMS LIVE" via override CMS),
  // HUD data-corners (FRAME 001, coords, etc.) et chips meta retirés.
  // CMS overlay conservé pour les éléments restants.
  const [eyebrow, titleLine1, titleLine2, titleLine3, subtitle, scroll, h2Subtitle] =
    await Promise.all([
      siteContent("home.hero.eyebrow", locale, t("eyebrow")),
      siteContent("home.hero.title_line_1", locale, t("title_line_1")),
      siteContent("home.hero.title_line_2", locale, t("title_line_2")),
      siteContent("home.hero.title_line_3", locale, t("title_line_3")),
      siteContent("home.hero.subtitle", locale, t("subtitle")),
      siteContent("home.hero.scroll", locale, t("scroll")),
      // HERO-H2 : sous-accroche editoriale CMS (3 locales en DB). Fallback
      // "" → si absente/vide, le <h2> n'est PAS rendu (cf. JSX conditionnel).
      siteContent("home.hero.h2_subtitle", locale, ""),
    ]);
  const videoDesktop = sbUrl("Videos", "mapa_showcase_desktop.mp4");
  const videoMobile = sbUrl("Videos", "mapa_showcase_mobile.mp4");

  return (
    <HeroScrollContainer
      className="relative isolate min-h-screen overflow-hidden md:min-h-[66vh] lg:min-h-screen"
      style={{
        backgroundColor: "var(--hero-bg)",
        transition: "background-color 0.4s ease",
      }}
    >
      {/* Video background — bucket Supabase "Videos" (majuscule).
          CSP media-src 'self' https://*.supabase.co indispensable
          (cf. next.config.ts). Pas de poster externe : le bg sapin
          profond var(--hero-bg) #1F221A joue le rôle de placeholder.
          Servi en deux variantes responsive (desktop 4.7MB / mobile 3.1MB)
          + preload="metadata" pour réduire l'Egress Supabase ~70%. */}
      {/* POL3-7 : parallax desktop very subtil (0.05). Overscan
          108%/-4% pour qu'aucun bord n'apparaisse sous le translate
          (max ~±22px) — AUCUN zoom/scale. Inactif mobile (<768) +
          prefers-reduced-motion (ParallaxImage). Gradient/brackets/
          contenu inchangés. */}
      {/* data-hero-video : reçoit le scale 1→0.95 du HeroScrollContainer.
          ParallaxImage interne garde son translateY parallax (compose
          avec le scale du parent — chaînage transforms standard). */}
      <div data-hero-video className="absolute inset-0 z-0">
      <ParallaxImage
        intensity={0.05}
        className="absolute inset-0"
      >
        <video
          className="absolute left-0 top-[-4%] h-[108%] w-full object-cover"
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
      </ParallaxImage>
      </div>

      {/* Gradient overlay (sapin → transparent → sapin 85%) — palette Forêt */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[#1F221A]/65 via-[#1F221A]/20 to-[#1F221A]/85"
      />

      {/* Brackets dorés (4 coins) */}
      <div aria-hidden className="pointer-events-none absolute inset-6 sm:inset-10">
        <Bracket position="top-left" />
        <Bracket position="top-right" />
        <Bracket position="bottom-left" />
        <Bracket position="bottom-right" />
      </div>

      {/* POL4 : HUD data-corners retiré (FRAME 001, coordonnées 49°/6°,
          VOL.I, LIVE·LU — décor debug, sans valeur). */}

      {/* Content — data-hero-text reçoit la parallax interne au scroll
          (STEP3b B3 : translateY a 0.3x la vitesse scroll). */}
      <div
        data-hero-text
        className="relative z-10 mx-auto flex min-h-[88dvh] max-w-[1400px] flex-col items-start justify-center gap-3 px-6 pt-16 pb-8 md:min-h-[62vh] md:gap-8 md:pt-32 md:pb-24 lg:min-h-[88dvh] lg:px-10"
      >
        {/* POL4 : pill retiré (affichait "TEST CMS LIVE" via override CMS). */}

        {/* Eyebrow */}
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-white/70 sm:text-xs">
          {eyebrow}
        </p>

        {/* STEP3c-1-bis : titre 2 lignes (titleLine3 vide en i18n par defaut,
            mais override CMS possible). Conditional render evite ligne fantome. */}
        <h1 className="font-display font-black leading-[1.15] tracking-[0.02em] text-[clamp(1.9rem,7.65vw,6.8rem)]">
          <span className="block text-white/90">{titleLine1}</span>
          <span className="block text-white">{titleLine2}</span>
          {titleLine3 && (
            <span className="gold-text block">{titleLine3}</span>
          )}
        </h1>

        <SignatureLine />

        {/* HERO-H2 : sous-accroche editoriale (CMS home.hero.h2_subtitle).
            Copper charte #B8865A via token --copper-charte (≠ var(--copper)
            cuivre citron Forêt). Italic regular, max-w 640, aligne sur le
            H1 (gauche). Rendu conditionnel : rien si vide/absent. */}
        {h2Subtitle && (
          <h2
            className="mt-6 max-w-[640px] text-[15px] font-normal italic leading-relaxed md:mt-8 md:text-[19px]"
            style={{ color: "var(--copper-charte)" }}
          >
            {h2Subtitle}
          </h2>
        )}

        {/* STEP3c-1-bis : subtitle multi-lignes (vertus rares). \n preserves
            via whiteSpace pre-line — saut de ligne CSS sans <br/>. */}
        <p
          className="max-w-xl text-xs leading-relaxed text-white/80 md:text-lg lg:text-xl"
          style={{ whiteSpace: "pre-line" }}
        >
          {subtitle}
        </p>
        {/* POL4 : chips meta (Catalogue · Segments · Couverture ·
            Open for mandates) retirés. */}
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
    </HeroScrollContainer>
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
      className={`absolute ${positionMap[position]} size-5 ${rotate} text-gold-bright`}
    >
      <span className="absolute left-0 top-0 h-px w-5 bg-current" />
      <span className="absolute left-0 top-0 h-5 w-px bg-current" />
    </span>
  );
}

// POL4 : composant DataCorner supprimé (HUD data-corners retiré).
