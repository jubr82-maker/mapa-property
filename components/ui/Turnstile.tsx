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
  className?: string;
}

export function Turnstile({ onToken, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const { resolvedTheme } = useTheme();
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!sitekey || !ref.current) return;

    const render = () => {
      if (!window.turnstile || !ref.current) return;
      if (widgetId.current) {
        window.turnstile.remove(widgetId.current);
      }
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey,
        theme: resolvedTheme === "dark" ? "dark" : "light",
        callback: (token) => onToken(token),
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
        window.onloadTurnstileCallback = render;
        document.head.appendChild(s);
      }
    }

    return () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [sitekey, resolvedTheme, onToken]);

  if (!sitekey) {
    // TODO: brancher Cloudflare Turnstile (NEXT_PUBLIC_TURNSTILE_SITE_KEY) — Étape 11
    return null;
  }

  return <div ref={ref} className={className} />;
}
