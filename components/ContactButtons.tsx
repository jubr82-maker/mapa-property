"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

type Mode = "phone" | "email";

interface ContactButtonsProps {
  variant?: "default" | "compact" | "dark";
  className?: string;
  showPhone?: boolean;
  showEmail?: boolean;
}

interface RevealResponse {
  phone?: string;
  email?: string;
  error?: string;
}

// Délai minimum entre le mount et le premier clic (ms). Un humain prend
// au moins ~500ms pour voir un bouton et cliquer — sous ce seuil, suspect.
const MIN_CLICK_DELAY_MS = 500;

export function ContactButtons({
  variant = "default",
  className = "",
  showPhone = true,
  showEmail = true,
}: ContactButtonsProps) {
  const t = useTranslations("contact");
  const [loading, setLoading] = useState<Mode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountAtRef = useRef<number>(0);
  const honeypotRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    mountAtRef.current = Date.now();
  }, []);

  // Auto-effacer le message d'erreur après 4s
  useEffect(() => {
    if (!error) return;
    const id = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(id);
  }, [error]);

  async function reveal(type: Mode) {
    if (loading) return;
    setError(null);

    // 1) Honeypot: si rempli, c'est un bot. On simule un succès silencieux.
    if (honeypotRef.current?.value && honeypotRef.current.value.trim() !== "") {
      return;
    }

    // 2) Délai mount → clic
    const elapsed = Date.now() - mountAtRef.current;
    if (elapsed < MIN_CLICK_DELAY_MS) {
      setError(t("error"));
      return;
    }

    setLoading(type);
    try {
      const res = await fetch("/api/contact-reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      if (!res.ok) {
        setError(t("error"));
        return;
      }

      const data = (await res.json()) as RevealResponse;
      if (type === "phone" && data.phone) {
        const tel = data.phone.replace(/\s+/g, "");
        window.location.href = `tel:${tel}`;
      } else if (type === "email" && data.email) {
        window.location.href = `mailto:${data.email}`;
      } else {
        setError(t("error"));
      }
    } catch {
      setError(t("error"));
    } finally {
      setLoading(null);
    }
  }

  const isDark = variant === "dark";
  const isCompact = variant === "compact";
  const btnBase = isDark
    ? "border-white/30 text-white hover:border-gold hover:text-gold"
    : "border-line text-ink hover:border-gold hover:text-gold";

  return (
    <div className={`relative inline-flex flex-wrap items-center gap-2 ${className}`}>
      {/* Honeypot — invisible visuellement et pour le clavier, mais accessible aux bots naïfs */}
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

      {showPhone && (
        <RevealButton
          label={loading === "phone" ? t("loading") : t("call_button")}
          icon="phone"
          loading={loading === "phone"}
          disabled={loading !== null}
          onClick={() => reveal("phone")}
          baseCls={btnBase}
          compact={isCompact}
        />
      )}

      {showEmail && (
        <RevealButton
          label={loading === "email" ? t("loading") : t("email_button")}
          icon="mail"
          loading={loading === "email"}
          disabled={loading !== null}
          onClick={() => reveal("email")}
          baseCls={btnBase}
          compact={isCompact}
        />
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

function RevealButton({
  label,
  icon,
  loading,
  disabled,
  onClick,
  baseCls,
  compact,
}: {
  label: string;
  icon: "phone" | "mail";
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  baseCls: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono uppercase tracking-[0.2em] transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${baseCls} ${
        compact ? "text-[10px]" : "text-[11px]"
      } ${loading ? "border-gold text-gold" : ""}`}
    >
      {icon === "phone" ? (
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
      ) : (
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
      )}
      {label}
    </button>
  );
}
