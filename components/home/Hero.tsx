import { getTranslations } from "next-intl/server";
import { siteContent } from "@/lib/site-content";
import { SignatureLine } from "@/components/ui/SignatureLine";
import { ParallaxImage } from "@/components/ui/ParallaxImage";
import { HeroScrollContainer } from "@/components/home/HeroScrollContainer";
import { VideoR2 } from "@/components/media/VideoR2";

export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "hero" });
  // POL4 : hero nettoyé — pill (source "TEST CMS LIVE" via override CMS),
  // HUD data-corners (FRAME 001, coords, etc.) et chips meta retirés.
  // CMS overlay conservé pour les éléments restants.
  const [eyebrow, titleLine1, titleLine2, titleLine3, subtitle, scroll] =
    await Promise.all([
      siteContent("home.hero.eyebrow", locale, t("eyebrow")),
      siteContent("home.hero.title_line_1", locale, t("title_line_1")),
      siteContent("home.hero.title_line_2", locale, t("title_line_2")),
      // HERO-L3 : title_line_3 porte desormais l'accroche editoriale
      // (Écouter, conseiller, conclure.) — rendue copper italic plus
      // petite dans le bloc titre (cf. JSX). h2_subtitle supprime.
      siteContent("home.hero.title_line_3", locale, t("title_line_3")),
      siteContent("home.hero.subtitle", locale, t("subtitle")),
      siteContent("home.hero.scroll", locale, t("scroll")),
    ]);
  // Sprint C11-bis : videos migrees de Supabase Storage vers Cloudflare R2
  // (egress illimite). Le composant VideoR2 resout l'URL via
  // NEXT_PUBLIC_R2_PUBLIC_URL. Variantes desktop (1080p) + mobile (720p)
  // restees responsives via <source media="(min-width: 1024px)">.

  return (
    <HeroScrollContainer
      className="relative isolate min-h-screen overflow-hidden md:min-h-[66vh] lg:min-h-screen"
      style={{
        backgroundColor: "var(--hero-bg)",
        transition: "background-color 0.4s ease",
      }}
    >
      {/* Sprint C11-bis : video background depuis Cloudflare R2 (egress
          illimite, was Supabase Storage). CSP media-src autorise https:
          generique (cf. next.config.ts). Pas de poster externe : le bg
          sapin profond var(--hero-bg) joue le placeholder. Variantes
          responsives : desktop 1080p / mobile 720p + preload='metadata'. */}
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
        {/* Sprint HERO-STYLE : wrapper Ken Burns. Le scale 1.0 → 1.08
            anime 20s ease-in-out alternate compose proprement avec le
            translateY du ParallaxImage parent (transforms chaines). */}
        <div className="mapa-ken-burns absolute inset-0">
          <VideoR2
            className="absolute left-0 top-[-4%] h-[108%] w-full object-cover"
            ariaHidden
            preload="metadata"
            sources={[
              { filename: "mapa-showcase-desktop.mp4", media: "(min-width: 1024px)", type: "video/mp4" },
              { filename: "mapa-showcase-mobile.mp4", type: "video/mp4" },
            ]}
          />
        </div>
      </ParallaxImage>
      </div>

      {/* Sprint HERO-STYLE : overlay degrade sapin (55/25/70 — un cran
          plus modere que l'ancien 65/20/85 pour laisser respirer la
          video au centre tout en gardant la lisibilite du texte). Mobile
          conserve les memes ratios (suffisant pour la SearchBar). */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-[#1F221A]/55 via-[#1F221A]/25 to-[#1F221A]/70"
      />

      {/* Sprint HERO-STYLE : teinte cuivre subtile en soft-light pour
          rechauffer l'image et ancrer l'identite MAPA. Opacity 10%
          uniquement -> quasi imperceptible, juste une chaleur. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundColor: "var(--copper, #e0af6e)",
          mixBlendMode: "soft-light",
          opacity: 0.1,
        }}
      />

      {/* Sprint HERO-STYLE : vignette douce — assombrissement progressif
          des 4 coins via radial-gradient. Transparent au centre, ombre
          ~30% max aux bords. Effet pellicule discret. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 55%, rgba(31, 34, 26, 0.30) 100%)",
        }}
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

        {/* Sprint HERO-STYLE : fade-up stagger 150ms (eyebrow 0 / h1 150
            / signature 300 / subtitle 450). prefers-reduced-motion :
            apparition immediate via .mapa-hero-fade-up override CSS. */}

        {/* Eyebrow */}
        <p
          className="mapa-hero-fade-up font-mono text-[10px] uppercase tracking-[0.4em] text-white/70 sm:text-xs"
          style={{ animationDelay: "0ms" }}
        >
          {eyebrow}
        </p>

        {/* STEP3c-1-bis : titre 2 lignes (titleLine3 vide en i18n par defaut,
            mais override CMS possible). Conditional render evite ligne fantome. */}
        {/* HERO-L3 : L1/L2 grande taille (clamp 1.9→6.8rem), L3 accroche
            editoriale copper #e0af6e italic regular, legerement plus petite
            (clamp 1.4→4.8rem ≈ 70%), meme alignement/tracking que le bloc
            titre. Conditionnel : rien si title_line_3 vide. */}
        <h1
          className="mapa-hero-fade-up font-display font-black leading-[1.15] tracking-[0.02em] text-[clamp(1.9rem,7.65vw,6.8rem)]"
          style={{ animationDelay: "150ms" }}
        >
          <span className="block text-white/90">{titleLine1}</span>
          <span className="block text-white">{titleLine2}</span>
          {titleLine3 && (
            <span
              className="mt-1 block font-normal italic text-[clamp(1.4rem,5.5vw,4.8rem)] md:mt-2"
              style={{ color: "var(--copper-charte)" }}
            >
              {titleLine3}
            </span>
          )}
        </h1>

        <div
          className="mapa-hero-fade-up"
          style={{ animationDelay: "300ms" }}
        >
          <SignatureLine />
        </div>

        {/* STEP3c-1-bis : subtitle multi-lignes (vertus rares). \n preserves
            via whiteSpace pre-line — saut de ligne CSS sans <br/>. */}
        <p
          className="mapa-hero-fade-up max-w-xl text-xs leading-relaxed text-white/80 md:text-lg lg:text-xl"
          style={{ whiteSpace: "pre-line", animationDelay: "450ms" }}
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
