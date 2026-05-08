"use client";

import { useState } from "react";

interface HoverFlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  height?: string;
}

export function HoverFlipCard({
  front,
  back,
  className = "",
  height = "h-72",
}: HoverFlipCardProps) {
  const [tapped, setTapped] = useState(false);

  return (
    <div
      className={`flip-card group relative ${height} ${className}`}
      onClick={() => setTapped((t) => !t)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setTapped((t) => !t);
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={tapped}
    >
      <div
        className={`flip-card-inner absolute inset-0 transition-transform duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)] ${
          tapped ? "[transform:rotateY(180deg)]" : ""
        }`}
      >
        <div className="absolute inset-0 [backface-visibility:hidden]">{front}</div>
        <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]">
          {back}
        </div>
      </div>
      <style>{`
        @media (hover: none) {
          .flip-card.group:hover .flip-card-inner {
            transform: none;
          }
        }
        .flip-card { perspective: 1200px; }
      `}</style>
    </div>
  );
}
