"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement | string,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          "timeout-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
        },
      ) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface Props {
  onToken: (token: string) => void;
  // BUG T3 : appelé si Turnstile ne peut PAS aboutir (script bloqué
  // CSP/adblock/réseau, erreur CF, ou pas de token sous 10 s). Permet
  // au formulaire de débloquer le submit au lieu de mouliner à l'infini.
  onUnavailable?: () => void;
  className?: string;
}

const FALLBACK_MS = 10_000;

export function Turnstile({ onToken, onUnavailable, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const settled = useRef(false);
  const { resolvedTheme } = useTheme();
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!sitekey || !ref.current) return;

    const fail = () => {
      if (settled.current) return;
      settled.current = true;
      onUnavailable?.();
    };
    // Filet de sécurité : si aucun token sous 10 s (widget jamais rendu,
    // challenge interactif jamais résolu, script lent), on débloque.
    const timer = setTimeout(fail, FALLBACK_MS);

    const render = () => {
      if (!window.turnstile || !ref.current) return;
      if (widgetId.current) {
        window.turnstile.remove(widgetId.current);
      }
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey,
        theme: resolvedTheme === "dark" ? "dark" : "light",
        callback: (token) => {
          settled.current = true;
          clearTimeout(timer);
          onToken(token);
        },
        "error-callback": fail,
        "timeout-callback": fail,
        "expired-callback": fail,
      });
    };

    if (window.turnstile) {
      render();
    } else {
      const existing = document.querySelector(
        'script[src*="challenges.cloudflare.com/turnstile"]',
      );
      if (!existing) {
        const s = document.createElement("script");
        s.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback";
        s.async = true;
        s.defer = true;
        // Script bloqué (CSP/adblock) ou réseau KO -> on débloque.
        s.onerror = fail;
        window.onloadTurnstileCallback = render;
        document.head.appendChild(s);
      } else {
        // Script déjà injecté ailleurs mais API pas encore prête :
        // on retentera au onload global ; le timer reste le filet.
        window.onloadTurnstileCallback = render;
      }
    }

    return () => {
      clearTimeout(timer);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [sitekey, resolvedTheme, onToken, onUnavailable]);

  if (!sitekey) {
    // TODO: brancher Cloudflare Turnstile (NEXT_PUBLIC_TURNSTILE_SITE_KEY) — Étape 11
    return null;
  }

  return <div ref={ref} className={className} />;
}
