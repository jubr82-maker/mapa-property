import { useTranslations } from "next-intl";
import { sbUrl } from "@/lib/supabase-url";
import { LiveClock } from "@/components/home/LiveClock";

export function Hero() {
  const t = useTranslations("hero");
  const videoSrc = sbUrl("Videos", "mapa_showcase_new.mp4");

  return (
    <section className="relative isolate overflow-hidden bg-[#070605]">
      {/* Video background */}
      <video
        className="absolute inset-0 size-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden
      >
        <source src={videoSrc} type="video/mp4" />
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
      <div className="relative z-10 mx-auto flex min-h-[88dvh] max-w-[1400px] flex-col items-start justify-center gap-8 px-6 pt-32 pb-24 lg:px-10">
        {/* Pill or */}
        <div className="inline-flex items-center gap-2 rounded-full border border-gold/60 bg-black/30 px-3 py-1 backdrop-blur-sm">
          <span className="size-1.5 rounded-full bg-gold-bright" />
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold-bright">
            {t("pill")}
          </span>
        </div>

        {/* Eyebrow */}
        <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-white/70 sm:text-xs">
          {t("eyebrow")}
        </p>

        {/* Titre 3 lignes */}
        <h1 className="font-display font-black leading-[0.85] tracking-[-0.02em] text-[clamp(3rem,9vw,8rem)]">
          <span className="block text-white/90">{t("title_line_1")}</span>
          <span className="block text-stroke text-transparent">{t("title_line_2")}</span>
          <span className="gold-text block">{t("title_line_3")}</span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">
          {t("subtitle")}
        </p>

        {/* Meta row */}
        <ul className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">
          <li>{t("meta_catalog")}</li>
          <li aria-hidden className="text-gold/60">·</li>
          <li>{t("meta_segments")}</li>
          <li aria-hidden className="text-gold/60">·</li>
          <li>{t("meta_coverage")}</li>
          <li aria-hidden className="text-gold/60">·</li>
          <li className="inline-flex items-center gap-2">
            <span className="size-1.5 animate-pulse rounded-full bg-gold-bright" />
            {t("meta_status")}
          </li>
        </ul>
      </div>

      {/* Scroll indicator */}
      <a
        href="#search"
        aria-label={t("scroll")}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/70 transition-colors hover:text-gold-bright"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.3em]">
          {t("scroll")}
        </span>
        <span aria-hidden className="mt-2 block animate-bounce text-center">
          ↓
        </span>
      </a>

      <style>{`
        .text-stroke {
          -webkit-text-stroke: 1.5px rgba(255,255,255,0.85);
        }
      `}</style>
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
