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
 * Switch via observation directe de la classe `.dark` sur <html>
 * (source de verite visuelle). MutationObserver detecte tout changement
 * — script anti-FOUC, custom ThemeToggle (qui manipule classList
 * directement sans passer par next-themes setTheme), next-themes futur.
 *
 * Bug fix : useTheme().resolvedTheme restait fige a 'dark' car le
 * custom toggle (sprint3) ecrit localStorage + classList sans appeler
 * setTheme() → Logo affichait toujours logo_mapa_nuit.png meme en jour.
 *
 * SSR + pré-mount → nuit (défaut premier visiteur). Ratio PNG 2000×458.
 *
 * Oct. 2026 : logo officiel sur fond clair fourni par Julien (embleme en
 * degrade or, texte #03200A, marges transparentes seules retirees), en PNG
 * optimise (voir LIGHT_SRC). Le mode sombre garde le logo or uni
 * (/logo_mapa_nuit.png).
 */

import Image from "next/image";
import { useEffect, useState } from "react";

const DARK_SRC = "/logo_mapa_nuit.png";
const DARK_RATIO = 2000 / 458;
// Perf mobile (oct. 2026) : meme logo officiel, en PNG (1600 x 336, marges
// retirees) passe par l'optimiseur de next/image (AVIF/WebP a la taille
// affichee, mis en cache) plutot que le SVG de 19,7 Ko (1 654 commandes de
// trace, degrade, metadonnees C2PA) servi tel quel. Le SVG reste pour la
// fiche imprimable.
const LIGHT_SRC = "/logos/mapa-logo-fond-clair-1600.png";
const LIGHT_RATIO = 1600 / 336;

type LogoProps = {
  /** Hauteur en px. Largeur dérivée du ratio natif 4.367. */
  height?: 32 | 40 | 44 | 48 | 56 | 64 | 76 | 80 | 96;
  /** "auto" = suit le thème (classe .dark) ; "dark"/"light" force. */
  tone?: "auto" | "light" | "dark";
  className?: string;
  priority?: boolean;
  /** "eager" : charge sans attendre, SANS preload ni priorite reseau. */
  loading?: "eager" | "lazy";
};

export function Logo({
  height = 48,
  tone = "auto",
  className = "",
  priority = false,
  loading,
}: LogoProps) {
  // SSR + pré-mount : true (nuit défaut). Observe ensuite la classe
  // `.dark` sur <html> via MutationObserver — synchro garantie quelle
  // que soit la source du changement (toggle, anti-FOUC, etc.).
  const [isDarkClass, setIsDarkClass] = useState(true);
  useEffect(() => {
    const root = document.documentElement;
    const check = () => setIsDarkClass(root.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const isLight =
    tone === "light" || (tone === "auto" && !isDarkClass);
  const src = isLight ? LIGHT_SRC : DARK_SRC;
  const width = Math.round(height * (isLight ? LIGHT_RATIO : DARK_RATIO));

  return (
    <Image
      src={src}
      alt="MAPA Property"
      width={width}
      height={height}
      priority={priority}
      loading={priority ? undefined : loading}
      // Sans priorite : React prechargerait sinon toute image non differee
      // du haut de page (logos mobile et ordinateur) en concurrence avec
      // l'image principale.
      fetchPriority={priority ? undefined : "low"}
      // Quotas Vercel (oct. 2026) : logo du dossier public servi tel quel,
      // sans transformation (cache immuable d'un an).
      unoptimized
      className={className}
    />
  );
}
