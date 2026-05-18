import Image from "next/image";

/**
 * MAPA Property — Logo officiel (intact)
 * ---------------------------------------------------------
 * Logo original Julien Brebion : symbole flamme copper +
 * wordmark "MAPA PROPERTY" dans la typo originale.
 * Pas de reconstruction, pas de typo substituée.
 *
 * - Light mode : copper + ink (par défaut)
 * - Dark mode : symbole copper + wordmark doré chaud #D4A55A (BUG 9 — plus de blanc)
 *
 * Total : ~7 KB par chargement (96px). Source 325 KB → gain 98%.
 */

type LogoProps = {
  /** Hauteur en px. La largeur s'adapte au ratio natif (~1.63:1).
   *  44 / 76 ajoutés pour POL2 (logo header -20%). */
  height?: 32 | 40 | 44 | 48 | 56 | 64 | 76 | 80 | 96;
  /** "auto" = bascule light/dark via CSS class. "light"/"dark" force */
  tone?: "auto" | "light" | "dark";
  className?: string;
  priority?: boolean;
};

export function Logo({
  height = 48,
  tone = "auto",
  className = "",
  priority = false,
}: LogoProps) {
  // Choix de l'asset selon le mode demandé
  // Ratio natif du logo: 579×355 → 1.631
  const ratio = 579 / 355;
  const width = Math.round(height * ratio);

  // BUG A : un seul asset (master, prouvé bon). En nuit, recoloration or
  // chaud via filtre CSS classe-based (.logo-auto + :root.dark dans
  // globals.css) — SSR-safe, pas de useTheme/flash, pas de dépendance à
  // l'asset gold corrompu. tone="dark"/"light" forcés : .logo-gold force
  // le filtre indépendamment du thème.
  const toneClass =
    tone === "auto" ? "logo-auto" : tone === "dark" ? "logo-gold" : "";

  return (
    <Image
      src="/logos/mapa-logo-master.png"
      alt="MAPA Property"
      width={width}
      height={height}
      priority={priority}
      className={`${toneClass} ${className}`.trim()}
    />
  );
}
