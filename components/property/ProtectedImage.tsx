"use client";

import Image from "next/image";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Image> & {
  watermark?: boolean;
};

export function ProtectedImage({
  watermark = true,
  className = "",
  ...rest
}: Props) {
  return (
    <span
      className={`relative block ${className}`}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <Image draggable={false} {...rest} />
      {watermark && (
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-2 right-2 select-none font-mono text-[10px] uppercase tracking-[0.3em] text-white opacity-30 mix-blend-overlay"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
        >
          MAPA Property
        </span>
      )}
    </span>
  );
}
