"use client";

// Sprint C11-bis — Composant <VideoR2> reutilisable pour videos servies
// depuis Cloudflare R2 (egress illimite). Remplace progressivement les
// <video src={sbUrl("Videos", ...)} /> pointant vers Supabase Storage.
//
// Patterns supportes :
//  - filename simple ("mapa-hero-video.mp4") -> URL R2 calculee via
//    NEXT_PUBLIC_R2_PUBLIC_URL (a exposer cote Vercel + .env.local)
//  - 1 ou 2 sources (desktop + mobile) avec media query <source media=...>
//  - fallback poster <img> si la balise <video> echoue
//  - preload="metadata" par defaut (reduit egress et bandwidth client)
//
// Cote serveur (RSC), le helper lib/r2.ts::getR2Url marche aussi mais
// utilise R2_PUBLIC_URL non-public. Pour un usage RSC, importer getR2Url.

import { useState } from "react";

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

  const resolvedSources: Source[] = sources
    ? sources.map((s) => ({ ...s, filename: resolve(s.filename) }))
    : filename
      ? [{ filename: resolve(filename), type: "video/mp4" }]
      : [];

  return (
    <video
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
    >
      {resolvedSources.map((s, i) => (
        <source
          key={`${s.filename}-${i}`}
          src={s.filename}
          type={s.type ?? "video/mp4"}
          media={s.media}
        />
      ))}
    </video>
  );
}
