"use client";

/**
 * STEP3a — Toggle dark/light global pilote par l'utilisateur.
 *
 * - Persistance localStorage cle "mapa_theme" (valeurs "dark" | "light").
 * - Au 1er chargement, si aucune valeur en storage : detection automatique
 *   prefers-color-scheme du systeme.
 * - Manipule directement la classe ".dark" sur <html>. Note : le
 *   ThemeProvider next-themes reste actif dans layout.tsx (storage key
 *   "theme") ; il s'execute en premier puis ce composant prend le pas
 *   au useEffect — risque de flash <100ms lors du tout premier paint
 *   pour une session avec mapa_theme defini differemment du systeme.
 * - Le bouton mesure 40x40, icone soleil/lune contextuelle, couleur
 *   cuivre citron #e0af6e dans les 2 modes (palette Forêt stricte).
 */

import { useEffect, useState } from "react";

export function ThemeToggle({ className = "" }: { className?: string } = {}) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("mapa_theme");
    if (saved === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
    } else {
      // STEP3a-bis : premier visiteur OU saved=='dark' → MODE NUIT par défaut
      // (override du prefers-color-scheme système — Julien préfère que
      // l'expérience initiale soit toujours sombre).
      setIsDark(true);
      document.documentElement.classList.add("dark");
      if (saved !== "dark") {
        localStorage.setItem("mapa_theme", "dark");
      }
    }
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("mapa_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("mapa_theme", "light");
    }
  };

  if (!mounted)
    return (
      <div
        className={className}
        style={{ width: 40, height: 40 }}
        aria-hidden
      />
    );

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Mode jour" : "Mode nuit"}
      title={isDark ? "Passer en mode jour" : "Passer en mode nuit"}
      className={className}
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        border: "1px solid currentColor",
        background: "transparent",
        color: "#e0af6e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.3s ease",
        flexShrink: 0,
      }}
    >
      {isDark ? (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <circle cx="12" cy="12" r="4" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}
