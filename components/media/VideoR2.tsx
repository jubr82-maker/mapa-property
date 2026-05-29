"use client";

// Sprint C11-bis — Composant <VideoR2> reutilisable pour videos servies
// depuis Cloudflare R2 (egress illimite). Remplace progressivement les
// <video src={sbUrl("Videos", ...)} /> pointant vers Supabase Storage.
//
// Patterns supportes :
//  - filename simple ("mapa-hero-video.mp4") -> URL R2 calculee via
//    NEXT_PUBLIC_R2_PUBLIC_URL (a exposer cote Vercel + .env.local)
//  - 1 ou 2 sources (desktop + mobile) — SELECTION CLIENT-SIDE via
//    matchMedia (Sprint HERO-VIDEO-V3). L'ancien rendu en multiple
//    <source media=...> a ete supprime : Safari iOS ignore l'attribut
//    media= des <source> enfants de <video> et prend systematiquement
//    la PREMIERE source, ce qui faisait charger la version desktop
//    (High Profile L4.0) sur mobile -> refus iOS -> poster fige.
//    Le composant resout maintenant a UNE seule URL via JS au mount,
//    puis re-evalue au resize si plusieurs sources sont fournies.
//  - fallback poster <img> si la balise <video> echoue
//  - preload="metadata" par defaut (reduit egress et bandwidth client)
//
// Cote serveur (RSC), le helper lib/r2.ts::getR2Url marche aussi mais
// utilise R2_PUBLIC_URL non-public. Pour un usage RSC, importer getR2Url.

import { useEffect, useRef, useState } from "react";

const PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? ""
).replace(/\/$/, "");

function resolve(filename: string): string {
  if (/^https?:\/\//.test(filename)) return filename;
  const key = filename.startsWith("/") ? filename.slice(1) : filename;
  return PUBLIC_BASE ? `${PUBLIC_BASE}/${key}` : `/${key}`;
}

type Source = { filename: string; media?: string; type?: string };

type VideoR2Props = {
  /** Soit 1 filename simple, soit un array de sources (desktop/mobile). */
  filename?: string;
  sources?: Source[];
  posterUrl?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  ariaHidden?: boolean;
  /** preload : 'none' | 'metadata' | 'auto'. Defaut 'metadata' (egress-friendly). */
  preload?: "none" | "metadata" | "auto";
  /** alt pour le fallback <img> si la video echoue. */
  alt?: string;
};

export function VideoR2({
  filename,
  sources,
  posterUrl,
  autoPlay = true,
  loop = true,
  muted = true,
  controls = false,
  className,
  ariaHidden,
  preload = "metadata",
  alt,
}: VideoR2Props) {
  const [hasError, setHasError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const resolvedSources: Source[] = sources
    ? sources.map((s) => ({ ...s, filename: resolve(s.filename) }))
    : filename
      ? [{ filename: resolve(filename), type: "video/mp4" }]
      : [];

  // Fallback SSR + premier paint client (avant matchMedia useEffect) :
  // la source SANS media query (typiquement mobile) — plus safe pour iOS.
  // Si toutes ont media, on prend la premiere (fallback de derniere ligne).
  const fallbackSrc =
    resolvedSources.find((s) => !s.media)?.filename ??
    resolvedSources[0]?.filename ??
    "";

  // Source active selectionnee client-side (null = utiliser fallbackSrc en SSR).
  const [activeSrc, setActiveSrc] = useState<string | null>(null);

  // ──────────────────────────────────────────────────────────────────
  // Sprint HERO-VIDEO-V3 : selection client-side via matchMedia.
  // Bug constate : Safari iOS ignore media= des <source> enfants de
  // <video> et charge systematiquement la PREMIERE source. La source
  // desktop (High Profile Level 4.0) etait alors selectionnee meme
  // sur mobile, et iOS refuse la lecture -> poster fige.
  //
  // Solution : ne plus utiliser <source media=...>. A la place, un seul
  // attribut src calcule au mount via window.matchMedia. Re-evaluation
  // au resize (changement viewport desktop<->mobile).
  // ──────────────────────────────────────────────────────────────────
  // Key stable pour deps useEffect — JSON.stringify de la liste compacte.
  const sourcesKey = resolvedSources
    .map((s) => `${s.filename}|${s.media ?? ""}`)
    .join("§");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (resolvedSources.length === 0) return;

    // Une seule source : utiliser direct (pas de matchMedia).
    if (resolvedSources.length === 1) {
      setActiveSrc(resolvedSources[0].filename);
      return;
    }

    // Multi-sources : pour chaque source avec media query, tester. La
    // premiere qui matche gagne. Si aucune ne matche -> fallbackSrc.
    function pick(): string {
      for (const s of resolvedSources) {
        if (s.media && window.matchMedia(s.media).matches) {
          return s.filename;
        }
      }
      return fallbackSrc;
    }

    setActiveSrc(pick());

    // Re-evaluer si l'utilisateur redimensionne la fenetre (desktop<->mobile).
    // On ecoute chaque MediaQueryList declaree dans les sources.
    const mediaLists = resolvedSources
      .filter((s) => s.media)
      .map((s) => window.matchMedia(s.media!));

    const handler = () => setActiveSrc(pick());
    mediaLists.forEach((m) => m.addEventListener("change", handler));
    return () => {
      mediaLists.forEach((m) => m.removeEventListener("change", handler));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourcesKey, fallbackSrc]);

  // Source effective rendue dans <video src=...> :
  //   1. activeSrc si defini (post-mount apres matchMedia)
  //   2. sinon fallbackSrc (SSR + premier paint client)
  const effectiveSrc = activeSrc ?? fallbackSrc;

  // ──────────────────────────────────────────────────────────────────
  // Sprint HERO-VIDEO-V2 : fix autoplay iOS Safari. Les props React
  // `muted` et `playsInline` peuvent etre appliquees apres l'hydratation,
  // mais iOS lit ces attributs des le premier rendu HTML et bloque
  // l'autoplay si elles ne sont pas "vraies" au bon moment. Forcer
  // videoRef.muted = true et appeler play() explicitement au mount
  // garantit le demarrage sur mobile (Safari iOS + Chrome mobile).
  //
  // Sprint HERO-VIDEO-V3 : si effectiveSrc change (passage desktop<->
  // mobile au resize), il faut appeler load() pour que Safari iOS prenne
  // en compte la nouvelle source, puis play().
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (muted) {
      el.muted = true;
      el.defaultMuted = true;
    }

    // Si la balise a deja une src DIFFERENTE de effectiveSrc, reload.
    // (Cas : changement de viewport post-mount.)
    if (el.currentSrc && !el.currentSrc.endsWith(effectiveSrc.split("/").pop() ?? "")) {
      el.load();
    }

    if (autoPlay) {
      const tryPlay = () => {
        el.play().catch(() => {
          // Silent : iOS peut refuser sans interaction user. Le poster
          // reste visible. La video reprendra au prochain user gesture.
        });
      };
      tryPlay();
      el.addEventListener("canplay", tryPlay, { once: true });
      return () => {
        el.removeEventListener("canplay", tryPlay);
      };
    }
  }, [autoPlay, muted, effectiveSrc]);

  if (hasError && posterUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={posterUrl}
        alt={alt ?? ""}
        className={className}
        aria-hidden={ariaHidden}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      // Une seule source via attribut src (vs <source> enfants). Resout
      // le bug Safari iOS qui ignorait media= des <source>.
      src={effectiveSrc || undefined}
      poster={posterUrl}
      autoPlay={autoPlay}
      loop={loop}
      muted={muted}
      controls={controls}
      playsInline
      preload={preload}
      className={className}
      aria-hidden={ariaHidden}
      onError={() => setHasError(true)}
    />
  );
}
