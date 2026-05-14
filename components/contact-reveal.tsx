"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { track } from "@/lib/tracking/track";

type Variant = "compact" | "full" | "sidebar";
type Align = "left" | "center" | "right";
type Theme = "light" | "dark";

interface ContactRevealProps {
  variant?: Variant;
  align?: Align;
  theme?: Theme;
  className?: string;
}

// Coordonnées en pièces — assemblées uniquement après clic, jamais en SSR.
// Anti-scraping : aucune chaîne complète "+352..." ni "j.brebion@..." dans le bundle SSR.
const PHONE_JULIEN_PARTS = ["+352", "691", "620", "127"];
const PHONE_FREDERIC_PARTS = ["+352", "691", "113", "018"];
const EMAIL_USER = ["j", "brebion"];
const EMAIL_DOMAIN = ["mapagroup", "org"];

// Délai minimum entre mount et premier clic (anti-bot naïf).
const MIN_CLICK_DELAY_MS = 300;

function buildPhone(parts: string[]) {
  return parts.join(" ");
}

function buildEmail() {
  return `${EMAIL_USER.join(".")}${String.fromCharCode(64)}${EMAIL_DOMAIN.join(".")}`;
}

export function ContactReveal({
  variant = "compact",
  align = "left",
  theme = "light",
  className = "",
}: ContactRevealProps) {
  const t = useTranslations("contact");
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountAtRef = useRef<number>(0);
  const honeypotRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    mountAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(id);
  }, [error]);

  function guard(): boolean {
    // Honeypot — un bot naïf qui remplit tous les inputs sera bloqué
    if (honeypotRef.current?.value && honeypotRef.current.value.trim() !== "") {
      return false;
    }
    // Délai minimum mount → clic
    const elapsed = Date.now() - mountAtRef.current;
    if (elapsed < MIN_CLICK_DELAY_MS) {
      setError(t("error"));
      return false;
    }
    return true;
  }

  function handleReveal() {
    if (!guard()) return;
    setRevealed(true);
    track("contact_reveal", { variant, target: "reveal" });
  }

  function callJulien() {
    if (!guard()) return;
    track("contact_reveal", { variant, target: "call_julien" });
    const tel = buildPhone(PHONE_JULIEN_PARTS).replace(/\s/g, "");
    window.location.href = `tel:${tel}`;
  }

  function callFrederic() {
    if (!guard()) return;
    track("contact_reveal", { variant, target: "call_frederic" });
    const tel = buildPhone(PHONE_FREDERIC_PARTS).replace(/\s/g, "");
    window.location.href = `tel:${tel}`;
  }

  function writeEmail() {
    if (!guard()) return;
    track("contact_reveal", { variant, target: "email" });
    const email = buildEmail();
    window.location.href = `mailto:${email}`;
  }

  const isDark = theme === "dark";

  // Styles par variant
  const containerLayout = (() => {
    switch (variant) {
      case "full":
        return "flex-col items-stretch gap-2.5";
      case "sidebar":
        return "flex-col items-stretch gap-2";
      case "compact":
      default:
        return "flex-row flex-wrap items-center gap-2";
    }
  })();

  const alignCls = (() => {
    switch (align) {
      case "center":
        return "justify-center";
      case "right":
        return "justify-end";
      case "left":
      default:
        return "justify-start";
    }
  })();

  const btnBase = isDark
    ? "border-white/30 text-white hover:border-[#C8A04A] hover:text-[#C8A04A]"
    : "border-line text-ink hover:border-gold-deep hover:text-gold-deep";

  const btnSize = variant === "compact"
    ? "text-[10px] px-3 py-2"
    : "text-[11px] px-4 py-2.5";

  return (
    <div
      className={`relative inline-flex ${containerLayout} ${alignCls} ${className}`}
    >
      {/* Honeypot — invisible, mais visible pour bots naïfs */}
      <input
        ref={honeypotRef}
        type="text"
        name="company_url"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="sr-only"
        defaultValue=""
      />

      {!revealed ? (
        <button
          type="button"
          onClick={handleReveal}
          className={`inline-flex items-center justify-center gap-2 rounded-full border font-mono uppercase tracking-[0.2em] transition-colors duration-200 ${btnBase} ${btnSize}`}
        >
          <svg
            viewBox="0 0 24 24"
            className="size-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.89.7 2.78a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.11-.45c.89.33 1.82.57 2.78.7A2 2 0 0 1 22 16.92Z" />
          </svg>
          {t("contact_button")}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={callJulien}
            aria-label="Appeler Julien Brebion, Real Estate Director"
            className={`inline-flex items-center justify-center gap-2 rounded-full border font-mono uppercase tracking-[0.2em] transition-colors duration-200 ${btnBase} ${btnSize}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.89.7 2.78a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.11-.45c.89.33 1.82.57 2.78.7A2 2 0 0 1 22 16.92Z" />
            </svg>
            {t("call_button")}
          </button>

          <button
            type="button"
            onClick={callFrederic}
            aria-label="Appeler Frédéric Mannis, Gérant"
            className={`inline-flex items-center justify-center gap-2 rounded-full border font-mono uppercase tracking-[0.2em] transition-colors duration-200 ${btnBase} ${btnSize}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.89.7 2.78a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.11-.45c.89.33 1.82.57 2.78.7A2 2 0 0 1 22 16.92Z" />
            </svg>
            {t("call_button")}
          </button>

          <button
            type="button"
            onClick={writeEmail}
            aria-label="Écrire un email à Julien Brebion"
            className={`inline-flex items-center justify-center gap-2 rounded-full border font-mono uppercase tracking-[0.2em] transition-colors duration-200 ${btnBase} ${btnSize}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="size-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-10 5L2 7" />
            </svg>
            {t("email_button")}
          </button>
        </>
      )}

      {error && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-1 w-full font-mono text-[10px] uppercase tracking-[0.2em] ${
            isDark ? "text-white/70" : "text-ink-soft/70"
          }`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
