"use client";

/**
 * STEP3b — Compteur anime 0 → cible quand le stat entre dans le
 * viewport. Si la value comporte une partie textuelle ("8+", "100s",
 * "70"), on extrait la portion numerique et on anime ; le suffixe
 * littéral est ajoute en sortie.
 *
 * Ease-out cubic 1.5s. One-shot via IntersectionObserver. Respect
 * prefers-reduced-motion (affichage direct).
 */

import { useEffect, useRef, useState } from "react";

function parseStatValue(raw: string): { number: number | null; extra: string } {
  const match = raw.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
  if (match) {
    return { number: parseFloat(match[1].replace(",", ".")), extra: match[2] };
  }
  return { number: null, extra: raw };
}

export function AnimatedStat({
  value,
  suffix,
  label,
  text,
}: {
  value: string;
  suffix: string;
  label: string;
  text: string;
}) {
  const { number, extra } = parseStatValue(value);
  const ref = useRef<HTMLParagraphElement>(null);
  const [display, setDisplay] = useState<string>(
    number === null ? value : `0${extra}`,
  );

  useEffect(() => {
    if (number === null) {
      setDisplay(value);
      return;
    }
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplay(value);
      return;
    }
    if (!ref.current) return;

    const el = ref.current;
    let raf = 0;
    let startTime = 0;
    const duration = 2000; // STEP3c-1 : ralenti cinematique (1500 → 2000ms)

    const animate = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(`${Math.floor(eased * number)}${extra}`);
      if (t < 1) {
        raf = window.requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          raf = window.requestAnimationFrame(animate);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.3 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [number, extra, value]);

  return (
    <div className="border-t border-text-contrast/15 pt-4 md:pt-6">
      <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-text-contrast/50 md:text-[10px]">
        {label}
      </p>
      <p
        ref={ref}
        className="mt-2 font-display text-2xl font-black leading-none tracking-tight md:mt-3 md:text-3xl"
      >
        <span className="gold-text">{display}</span>
        {suffix && (
          <span className="ml-2 font-mono text-xs font-medium text-text-contrast/50 md:text-base">
            {suffix}
          </span>
        )}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-text-contrast/70 md:mt-3 md:text-sm">
        {text}
      </p>
    </div>
  );
}
