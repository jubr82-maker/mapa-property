"use client";

import { useState } from "react";

export function RevealEmail({
  email,
  className = "",
}: {
  email: string;
  className?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  if (!revealed) {
    return (
      <button
        type="button"
        onClick={() => setRevealed(true)}
        className={`text-gold underline underline-offset-4 transition-colors hover:text-gold-deep ${className}`}
      >
        Cliquez pour afficher l&apos;email
      </button>
    );
  }
  return (
    <a
      href={`mailto:${email}`}
      className={`text-gold underline underline-offset-4 transition-colors hover:text-gold-deep ${className}`}
    >
      {email}
    </a>
  );
}
