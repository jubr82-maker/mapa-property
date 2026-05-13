"use client";

import { useState } from "react";

interface HoverFlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  height?: string;
  /**
   * Controlled flip state. When provided, the parent owns the flip state
   * (used for "single open at a time" accordion behaviour on mobile).
   * When omitted, the card manages its own tap toggle state.
   */
  flipped?: boolean;
  /** Called on user tap/click/Enter/Space. */
  onFlipToggle?: () => void;
  /** Accessible label for the toggle role. */
  ariaLabel?: string;
}

export function HoverFlipCard({
  front,
  back,
  className = "",
  height = "h-72",
  flipped,
  onFlipToggle,
  ariaLabel,
}: HoverFlipCardProps) {
  const isControlled = typeof flipped === "boolean";
  const [internalFlipped, setInternalFlipped] = useState(false);
  const active = isControlled ? flipped : internalFlipped;

  const toggle = () => {
    if (isControlled) {
      onFlipToggle?.();
    } else {
      setInternalFlipped((t) => !t);
    }
  };

  return (
    <div
      className={`flip-card relative ${height} ${active ? "is-flipped" : ""} ${className}`}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggle();
        }
      }}
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={ariaLabel}
    >
      <div className="flip-card-inner">
        <div className="flip-card-front">{front}</div>
        <div className="flip-card-back">{back}</div>
      </div>
    </div>
  );
}
