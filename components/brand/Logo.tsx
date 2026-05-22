"use client";

/**
 * MAPA Property — Logo bicolore via 2 PNG préfabriqués (Option 3 Julien).
 * ---------------------------------------------------------------
 * FIN des filtres CSS approximatifs (hue-rotate/sepia/invert). Deux
 * assets fournis par Julien :
 *  - /logo_mapa_nuit.png : tout cuivre #e0af6e (mode nuit = défaut)
 *  - /logo_mapa_jour.png : écriture sapin #1F221A + signe cuivre #e0af6e
 * Le signe (oiseau) reste cuivre dans les 2 versions ; seule l'écriture
 * "MAPA PROPERTY" change selon le mode.
 *
 * Switch via useTheme (next-themes, storageKey mapa_theme, default dark).
 * SSR + pré-mount → nuit (défaut premier visiteur). Le script anti-FOUC
 * (layout) ne touche QUE la classe .dark sur <html>, pas le logo.
 *
 * Ratio natif PNG : 2000×458 → 4.367.
 */

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

const RATIO = 2000 / 458;

type LogoProps = {
  /** Hauteur en px. Largeur dérivée du ratio natif 4.367. */
  height?: 32 | 40 | 44 | 48 | 56 | 64 | 76 | 80 | 96;
  /** "auto" = suit le thème ; "dark"/"light" force l'asset. */
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
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
  useEffect(() => setMounted(true), []);

  // SSR + pré-mount : nuit (défaut). Après mount : tone forcé OU thème.
  const isLight =
    tone === "light" ||
    (tone === "auto" && mounted && resolvedTheme === "light");
  const src = isLight ? "/logo_mapa_jour.png" : "/logo_mapa_nuit.png";
  const width = Math.round(height * RATIO);

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
