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
  /** Hauteur en px. La largeur s'adapte au ratio natif (~1.63:1) */
  height?: 32 | 40 | 48 | 56 | 64 | 80 | 96;
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

  // Pour "auto" : on superpose les deux et CSS gère la visibilité via dark:
  if (tone === "auto") {
    return (
      <span
        className={`inline-block ${className}`}
        style={{ width, height, position: "relative" }}
      >
        <Image
          src="/logos/mapa-logo-master.png"
          alt="MAPA Property"
          width={width}
          height={height}
          priority={priority}
          className="block dark:hidden"
        />
        <Image
          src="/logos/mapa-logo-gold-h96.png"
          alt="MAPA Property"
          width={width}
          height={height}
          priority={priority}
          className="hidden dark:block absolute inset-0"
        />
      </span>
    );
  }

  // Mode forcé
  const src =
    tone === "dark"
      ? "/logos/mapa-logo-gold-h96.png"
      : "/logos/mapa-logo-master.png";

  return (
    <Image
      src={src}
      alt="MAPA Property"
      width={width}
      height={height}
      priority={priority}
      className={className}
    />
  );
}
