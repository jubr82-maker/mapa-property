"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";

export type MandateModalData = {
  id: string;
  eyebrow: string;
  title: string;
  rate: string;
  rateSuffix: string;
  longDesc: string;
  bullets: string[];
  ctaHref: string;
  ctaLabel: string;
  closeLabel: string;
  accent: string; // copper / blue hex
};

type Props = {
  mandate: MandateModalData | null;
  open: boolean;
  onClose: () => void;
};

export function MandateDetailModal({ mandate, open, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return;
    }
    // Trigger enter animation on next frame
    const raf = requestAnimationFrame(() => setVisible(true));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus modal pour piéger basiquement le focus
    dialogRef.current?.focus();

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open || !mandate) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`mandate-modal-title-${mandate.id}`}
      className={`fixed inset-0 z-[9998] flex items-center justify-center overflow-y-auto px-4 py-6 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: "rgba(26, 31, 42, 0.7)" }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`relative my-auto w-full max-w-2xl rounded-lg bg-bg p-6 shadow-2xl outline-none transition-all duration-200 md:p-12 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={mandate.closeLabel}
          className="absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-line text-ink-mid transition-colors hover:border-gold hover:text-gold md:right-6 md:top-6"
        >
          <svg
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <header className="mb-6 border-b border-line pb-6">
          <p
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em]"
            style={{ color: mandate.accent }}
          >
            {mandate.eyebrow}
          </p>
          <h3
            id={`mandate-modal-title-${mandate.id}`}
            className="mt-2 font-display text-3xl font-black leading-tight text-ink md:text-4xl"
          >
            {mandate.title}
          </h3>
          <div className="mt-3 flex items-baseline gap-3">
            <span
              className="font-display text-4xl font-black md:text-5xl"
              style={{ color: mandate.accent }}
            >
              {mandate.rate}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-ink-soft">
              {mandate.rateSuffix}
            </span>
          </div>
        </header>

        <div className="space-y-5">
          <p className="text-sm leading-relaxed text-ink-mid md:text-base">
            {mandate.longDesc}
          </p>
          <ul className="grid gap-3">
            {mandate.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-ink md:text-base">
                <span
                  aria-hidden
                  className="mt-2 inline-block size-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: mandate.accent }}
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <footer className="mt-8 border-t border-line pt-6">
          <Link
            href={mandate.ctaHref}
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white shadow-md transition-transform hover:scale-[1.02]"
            style={{ backgroundColor: mandate.accent }}
          >
            {mandate.ctaLabel}
            <span aria-hidden>→</span>
          </Link>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
