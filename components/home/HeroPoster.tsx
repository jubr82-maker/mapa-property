// Image principale de l'accueil (oct. 2026), servie par le site lui-meme
// (public/images/hero) au lieu de r2.dev : declinaisons AVIF et WebP
// pre-calculees (scripts/generate-hero-images.mjs), sans passer par
// l'optimiseur d'images. Meme cadrage qu'avant : image entiere sur
// telephone (object-contain), plein cadre sur ordinateur (object-cover).
// Prechargee en AVIF (format retenu par les navigateurs actuels) car
// React ne precharge pas une image placee dans <picture>.
import { preload } from "react-dom";

const BASE = "/images/hero/mapa-showcase-poster";
export const HERO_POSTER_WIDTHS = [640, 828, 1080, 1280, 1920] as const;
const SIZES = "100vw";
const srcSet = (ext: "avif" | "webp") =>
  HERO_POSTER_WIDTHS.map((w) => `${BASE}-${w}.${ext} ${w}w`).join(", ");

/** Adresse locale de l'image (repli JPEG, ex. poster de la video). */
export const HERO_POSTER_FALLBACK = `${BASE}-1280.jpg`;

export function HeroPoster({ className }: { className?: string }) {
  preload(`${BASE}-1280.avif`, {
    as: "image",
    type: "image/avif",
    imageSrcSet: srcSet("avif"),
    imageSizes: SIZES,
    fetchPriority: "high",
  });
  return (
    <picture>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={SIZES} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={SIZES} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={HERO_POSTER_FALLBACK}
        alt=""
        aria-hidden
        width={1920}
        height={1080}
        decoding="async"
        fetchPriority="high"
        className={className}
      />
    </picture>
  );
}
