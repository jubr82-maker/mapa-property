"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { getDefaultGreeting } from "./chatbot-knowledge";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Sprint ELENA-NAV C2 — intent navigate emis par l'API chatbot.
interface NavigateIntent {
  action: "navigate";
  url: string;
}

const COOKIE_NAME = "elena_dismissed";
const COOKIE_DAYS = 7;

const setCookie = (name: string, value: string, days: number) => {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
};

const getCookie = (name: string) => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

const derivePageContext = (path: string): string => {
  if (/\/biens\/[^/]+/.test(path)) return `property:${path.split("/").pop()}`;
  if (/\/off-market\/[^/]+/.test(path))
    return `offmarket:${path.split("/").pop()}`;
  if (path.includes("/mandats")) return "mandate";
  if (path.includes("/services")) return "service";
  if (path.includes("/blog")) return "blog";
  if (path.includes("/legal")) return "legal";
  return "home";
};

export function ChatbotWidget() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const pageContext = derivePageContext(pathname);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-open after 10s on non-home pages
  useEffect(() => {
    if (getCookie(COOKIE_NAME)) return;
    if (pathname.match(/^\/[a-z]{2}$/)) return; // skip home
    if (open) return;
    const t = setTimeout(() => {
      setOpen(true);
      const greeting = getDefaultGreeting(locale, pageContext);
      setMessages([{ role: "assistant", content: greeting }]);
    }, 10_000);
    return () => clearTimeout(t);
  }, [pathname, locale, pageContext, open]);

  // Initial greeting when opening manually
  useEffect(() => {
    if (open && messages.length === 0) {
      const greeting = getDefaultGreeting(locale, pageContext);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: seed initial assistant greeting once panel opens
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [open, messages.length, locale, pageContext]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const close = () => {
    setOpen(false);
    setCookie(COOKIE_NAME, "true", COOKIE_DAYS);
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          locale,
          pageContext,
        }),
      });
      const json = (await res.json()) as {
        reply?: string;
        intent?: NavigateIntent | null;
      };
      const reply = json?.reply ?? "—";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      // Sprint ELENA-NAV C2 — navigation declenchee par l'intent LLM.
      // Delay 900ms pour laisser le temps de voir le message + scroll.
      if (
        json?.intent &&
        json.intent.action === "navigate" &&
        typeof json.intent.url === "string" &&
        json.intent.url.startsWith("/")
      ) {
        const target = json.intent.url;
        setTimeout(() => router.push(target), 900);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            locale === "en"
              ? "An error occurred. Please contact us via the contact buttons on the site."
              : locale === "de"
                ? "Ein Fehler ist aufgetreten. Bitte kontaktieren Sie uns über die Kontakt-Buttons auf der Website."
                : "Une erreur est survenue. Contactez-nous via les boutons de contact disponibles sur le site.",
        },
      ]);
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Eléna"
        aria-expanded={open}
        className={`gold-shine-bg fixed bottom-5 right-5 z-50 inline-flex size-14 items-center justify-center rounded-full text-ink shadow-xl shadow-gold/30 transition-all duration-300 hover:scale-105 sm:size-16 ${
          open ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <ElenaAvatar />
        <span aria-hidden className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-bg ring-2 ring-gold animate-pulse" />
      </button>

      {/* Panel */}
      <div
        className={`fixed bottom-0 right-0 z-50 m-2 w-[calc(100%-1rem)] max-w-md transition-all duration-300 sm:bottom-5 sm:right-5 sm:m-0 sm:w-[400px] ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
      >
        <div className="flex h-[min(82dvh,640px)] flex-col overflow-hidden rounded-2xl border border-gold/40 bg-bg shadow-2xl shadow-ink/20">
          {/* Header */}
          <header className="flex items-center justify-between gap-3 border-b border-line bg-bg-soft px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="gold-shine-bg inline-flex size-9 items-center justify-center rounded-full">
                <ElenaAvatar small />
              </span>
              <div>
                <p className="font-display text-base font-bold text-ink">Eléna</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-soft">
                  MAPA Property
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="inline-flex size-8 items-center justify-center rounded-full border border-line text-ink-mid transition-colors hover:border-gold hover:text-gold"
            >
              <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </header>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-ink text-bg"
                      : "border border-line bg-bg-soft text-ink-mid"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-line bg-bg-soft px-4 py-2.5 text-sm text-ink-soft">
                  <span className="inline-flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-gold [animation-delay:0ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-gold [animation-delay:150ms]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-gold [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={send}
            className="flex items-center gap-2 border-t border-line bg-bg-soft px-3 py-3"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                locale === "en"
                  ? "Type your message…"
                  : locale === "de"
                    ? "Nachricht schreiben…"
                    : "Votre message…"
              }
              disabled={pending}
              className="flex-1 rounded-full border border-line bg-bg px-4 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              aria-label="Envoyer"
              className="gold-shine-bg inline-flex size-9 items-center justify-center rounded-full text-ink shadow-md shadow-gold/20 transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12l18-9-9 18-2-7-7-2z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

function ElenaAvatar({ small = false }: { small?: boolean }) {
  // Silhouette féminine SVG monochrome dorée
  return (
    <svg
      viewBox="0 0 32 32"
      className={small ? "size-5 text-ink" : "size-7 text-ink"}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    >
      {/* Cheveux */}
      <path d="M9 14c0-4 3-7 7-7s7 3 7 7v2c0 1-.5 1.5-1 2 .5-.5 1-1.5 1-3 0-2.5-2-4.5-4-5h-6c-2 .5-4 2.5-4 5 0 1.5.5 2.5 1 3-.5-.5-1-1-1-2v-2z" fill="currentColor" />
      {/* Visage */}
      <ellipse cx="16" cy="14" rx="5" ry="6" fill="currentColor" opacity="0.15" />
      <ellipse cx="16" cy="14" rx="5" ry="6" />
      {/* Buste */}
      <path d="M8 28c0-4 3.5-7 8-7s8 3 8 7v1H8v-1z" fill="currentColor" opacity="0.4" />
      <path d="M8 28c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}
