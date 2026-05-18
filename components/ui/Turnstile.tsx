"use client";

import { useEffect, useRef, useState } from "react";
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
  // T3 : appelé si Turnstile ne peut PAS aboutir (script bloqué
  // CSP/adblock/réseau, erreur CF, ou pas de token sous 10 s).
  onUnavailable?: () => void;
  className?: string;
}

const FALLBACK_MS = 10_000;
// Dimensions natives du widget Turnstile (réservées pour éviter le
// saut de layout / flicker au moment où l'iframe apparaît).
const W = 300;
const H = 65;

// POL1 : un SEUL <script> Turnstile par page (les callbacks onload en
// attente sont mis en file et rejoués une fois l'API prête).
let scriptInjected = false;
const pending: Array<() => void> = [];
function ensureScript(onFail: () => void) {
  if (typeof window === "undefined") return;
  if (window.turnstile) return;
  if (
    scriptInjected ||
    document.querySelector('script[src*="challenges.cloudflare.com/turnstile"]')
  ) {
    scriptInjected = true;
    return;
  }
  scriptInjected = true;
  window.onloadTurnstileCallback = () => {
    pending.splice(0).forEach((fn) => fn());
  };
  const s = document.createElement("script");
  s.src =
    "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback";
  s.async = true;
  s.defer = true;
  s.onerror = onFail;
  document.head.appendChild(s);
}

export function Turnstile({ onToken, onUnavailable, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const settled = useRef(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  // Callbacks figés dans des refs : le widget ne se re-monte JAMAIS
  // quand le parent re-render (cause n°1 du flicker — onUnavailable
  // était une nouvelle fonction à chaque render).
  const onTokenRef = useRef(onToken);
  const onUnavailableRef = useRef(onUnavailable);
  const themeRef = useRef(resolvedTheme);
  onTokenRef.current = onToken;
  onUnavailableRef.current = onUnavailable;
  themeRef.current = resolvedTheme;

  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Ne rendre le widget qu'APRÈS le mount client (évite le mismatch
  // SSR/hydration et le flicker au premier paint).
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!sitekey || !mounted || !ref.current) return;
    if (widgetId.current) return; // déjà monté → jamais re-render

    const fail = () => {
      if (settled.current) return;
      settled.current = true;
      onUnavailableRef.current?.();
    };
    const timer = setTimeout(fail, FALLBACK_MS);

    const render = () => {
      if (!window.turnstile || !ref.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey,
        theme: themeRef.current === "dark" ? "dark" : "light",
        callback: (token) => {
          settled.current = true;
          clearTimeout(timer);
          onTokenRef.current(token);
        },
        "error-callback": fail,
        "timeout-callback": fail,
        "expired-callback": fail,
      });
    };

    if (window.turnstile) {
      render();
    } else {
      pending.push(render);
      ensureScript(fail);
    }

    return () => {
      clearTimeout(timer);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
    // Déps minimales et stables : un seul montage par instance.
  }, [sitekey, mounted]);

  if (!sitekey) return null;

  // Placeholder à dimensions fixes -> aucun saut de layout / flicker.
  return (
    <div
      ref={ref}
      className={className}
      style={{ minWidth: W, minHeight: H }}
      aria-busy={!mounted}
    />
  );
}
