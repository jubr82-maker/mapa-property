import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * MAPA Property — Logo officiel
 * ---------------------------------------------------------
 * Composé d'un symbole (flamme stylisée copper) + wordmark
 * "MAPA PROPERTY" rendu en HTML via la font display du site
 * (Big Shoulders). Total chargement : ~4 KB (PNG 64px) + font
 * déjà préchargée. Recolorable via prop `tone` ou data-tone.
 *
 * Remplace l'ancien logo SVG (325 KB) — gain 99%.
 */

type LogoProps = {
  /** Taille du symbole en px (le wordmark s'adapte) */
  size?: 24 | 32 | 40 | 48 | 56 | 64;
  /** Ton du wordmark — symbole TOUJOURS copper */
  tone?: "ink" | "white" | "auto";
  /** Affiche seulement le symbole (favicon, signature) */
  symbolOnly?: boolean;
  /** Affiche seulement le wordmark (footer texte) */
  wordmarkOnly?: boolean;
  className?: string;
};

export function Logo({
  size = 40,
  tone = "auto",
  symbolOnly = false,
  wordmarkOnly = false,
  className,
}: LogoProps) {
  // Symbole : sourcé en copper 128px, sera affiché à `size` via Next/Image
  const symbol = !wordmarkOnly && (
    <Image
      src="/logos/mapa-symbol-copper-128.png"
      alt=""
      width={size}
      height={Math.round(size * (103 / 128))}
      priority
      className="shrink-0"
    />
  );

  // Wordmark : en font-display (Big Shoulders), tracking serré, mode bicolore
  const wordmark = !symbolOnly && (
    <span
      className={cn(
        "font-display font-semibold leading-none tracking-[0.06em]",
        // Couleur auto = ink en light / white en dark (CSS vars)
        tone === "ink" && "text-ink",
        tone === "white" && "text-white",
        tone === "auto" && "text-ink dark:text-white",
      )}
      style={{
        fontSize: `${Math.round(size * 0.55)}px`,
      }}
    >
      MAPA <span className="font-normal opacity-75">PROPERTY</span>
    </span>
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2.5",
        className,
      )}
    >
      {symbol}
      {wordmark}
    </div>
  );
}
