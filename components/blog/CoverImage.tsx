"use client";

/**
 * Image de couverture d'un article (oct. 2026). Passe par l'optimiseur de
 * next/image (AVIF/WebP a la taille affichee) ; si l'optimiseur refuse
 * l'image (fichier source trop lourd, type non reconnu, quota), elle est
 * rechargee directement depuis son adresse (Supabase Storage public,
 * autorise par img-src https:) : jamais de couverture vide.
 */

import Image from "next/image";
import { useState } from "react";
import { isOptimizedImageSrc } from "@/lib/image-hosts";

type Props = { src: string; alt: string; sizes: string; className?: string; priority?: boolean };

export function CoverImage({ src, alt, sizes, className, priority }: Props) {
  const [direct, setDirect] = useState(!isOptimizedImageSrc(src));
  return (
    <Image
      key={direct ? "direct" : "optimized"}
      src={src}
      unoptimized={direct}
      alt={alt}
      fill
      priority={priority}
      sizes={sizes}
      className={className}
      data-blog-cover
      onError={() => {
        if (!direct) setDirect(true);
      }}
    />
  );
}
