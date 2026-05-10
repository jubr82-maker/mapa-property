"use client";

import { useState } from "react";

export function RevealPhone({
  phone,
  className = "",
}: {
  phone: string;
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
        Cliquez pour afficher le téléphone
      </button>
    );
  }
  const sanitized = phone.replace(/\s/g, "");
  return (
    <a
      href={`tel:${sanitized}`}
      className={`text-gold underline underline-offset-4 transition-colors hover:text-gold-deep ${className}`}
    >
      {phone}
    </a>
  );
}
