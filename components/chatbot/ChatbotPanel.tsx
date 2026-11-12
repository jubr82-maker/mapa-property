"use client";

import { getAttribution } from "@/lib/pilotage/attribution-client";
import { useEffect, useRef, useState } from "react";
import { safeInternalPath } from "@/lib/security/sanitize";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { ContactReveal } from "@/components/contact-reveal";
import { Turnstile, type TurnstileHandle } from "@/components/ui/Turnstile";
import { getGreetingKey, type GreetingKey } from "./chatbot-knowledge";

// Sprint ELENA-AVATAR : avatar photo de profil place dans public/.
// 512x512, decline en 3 tailles via next/image + sizes (bulle 56/64,
// header panel 40, side message 32). Ring cuivre discret autour pour
// rester dans la charte MAPA (--gold).
const AVATAR_SRC = "/elena-avatar.jpg";

interface Message {
  role: "user" | "assistant";
  content: string;
  /** Coordonnees detectees sur ce tour, en attente de consentement explicite. */
  contactDetected?: { email?: string; phone?: string } | null;
}

interface NavigateIntent {
  action: "navigate";
  url: string;
}

export function ChatbotPanel({
  open,
  onClose,
  pageContext,
}: {
  open: boolean;
  onClose: () => void;
  pageContext: string;
}) {
  const locale = useLocale();
  const t = useTranslations("chatbot");
  const tRgpd = useTranslations("rgpd");
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [consentAnswered, setConsentAnswered] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);
  const [consentFeedback, setConsentFeedback] = useState<
    "accepted" | "declined" | "error" | null
  >(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileUnavailable, setTurnstileUnavailable] = useState(false);
  const turnstileRef = useRef<TurnstileHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Message d'accueil : uniquement la CLE vient de la logique (contexte de
  // page), le texte vient integralement de next-intl (3 langues). Point 2 —
  // phrase IA integree a l'accueil.
  useEffect(() => {
    if (!open || messages.length > 0) return;
    const key: GreetingKey = getGreetingKey(pageContext);
    const greeting = `${t(key)} ${t("greeting_ai_suffix")}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: seed initial assistant greeting once panel opens
    setMessages([{ role: "assistant", content: greeting }]);
  }, [open, messages.length, pageContext, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, consentFeedback]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Dernieres coordonnees detectees dans la conversation, en attente de
  // consentement explicite (point 5). Tant que l'utilisateur n'a pas
  // repondu, la carte de consentement reste affichee sur le dernier tour
  // qui en porte une.
  const pendingContact = consentAnswered
    ? null
    : [...messages].reverse().find((m) => m.contactDetected)?.contactDetected ?? null;

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || pending) return;

    const userMsg: Message = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
          locale,
          pageContext,
        }),
      });
      const json = (await res.json()) as {
        reply?: string;
        intent?: NavigateIntent | null;
        contactDetected?: { email?: string; phone?: string } | null;
      };
      const reply = json?.reply ?? "";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, contactDetected: json?.contactDetected },
      ]);
      if (json?.contactDetected) setConsentAnswered(false);
      // Sprint ELENA-NAV C2 — navigation declenchee par l'intent LLM.
      // Delay 900ms pour laisser le temps de voir le message + scroll.
      if (
        json?.intent &&
        json.intent.action === "navigate" &&
        safeInternalPath(json.intent.url)
      ) {
        // Chemin interne uniquement : "//site-externe" ou "/\site" refuses
        // (redirection ouverte par injection de consigne, OWASP ASVS 5.1.5).
        const target = safeInternalPath(json.intent.url) as string;
        setTimeout(() => router.push(target), 900);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: t("network_error") },
      ]);
    } finally {
      setPending(false);
    }
  };

  const submitConsent = async (decision: "accept" | "decline") => {
    if (!pendingContact) return;
    setConsentBusy(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "consent",
          attribution: getAttribution(),
          decision,
          email: pendingContact.email,
          phone: pendingContact.phone,
          locale,
          pageContext,
          turnstileToken: turnstileToken ?? undefined,
          transcript: messages.map((m) => `${m.role}: ${m.content}`).join("\n").slice(0, 2000),
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
      setConsentAnswered(true);
      if (decision === "decline") {
        setConsentFeedback("declined");
      } else if (json?.ok) {
        setConsentFeedback("accepted");
      } else {
        setConsentFeedback("error");
      }
    } catch {
      setConsentAnswered(true);
      setConsentFeedback("error");
    } finally {
      setConsentBusy(false);
    }
  };

  const needsTurnstile = Boolean(
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileUnavailable,
  );

  return (
    <div
      className={`fixed bottom-0 right-0 z-50 m-2 w-[calc(100%-1rem)] max-w-md transition-all duration-300 sm:bottom-5 sm:right-5 sm:m-0 sm:w-[400px] print:hidden ${
        open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div className="flex h-[min(78dvh,620px)] flex-col overflow-hidden rounded-2xl border border-gold/40 bg-bg shadow-2xl shadow-ink/20">
        {/* Header — Sprint ELENA-AVATAR : avatar 40px rond + liseré cuivre.
            Point 2 : mention IA permanente, dans les 3 langues. */}
        <header className="flex items-center justify-between gap-3 border-b border-line bg-bg-soft px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="relative block size-10 shrink-0 overflow-hidden rounded-full ring-2 ring-gold/60">
              <Image src={AVATAR_SRC} alt={t("avatar_alt")} fill unoptimized sizes="40px" className="object-cover" />
            </span>
            <div>
              <p className="font-display text-base font-bold text-ink">Eléna</p>
              <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-soft">
                {t("ai_notice")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close_label")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-ink-mid transition-colors hover:border-gold hover:text-gold-text"
          >
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((m, i) => (
            <div key={i} className="space-y-2">
              <div className={`flex items-start gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <span className="relative mt-0.5 block size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-gold/40">
                    <Image src={AVATAR_SRC} alt={t("avatar_alt")} fill unoptimized sizes="32px" className="object-cover" />
                  </span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    m.role === "user" ? "bg-ink text-bg" : "border border-line bg-bg-soft text-ink-mid"
                  }`}
                >
                  {m.content}
                </div>
              </div>

              {/* Point 5 — carte de consentement explicite, affichee sous le
                  tour ou des coordonnees ont ete detectees, tant que non
                  repondu. */}
              {m.contactDetected && !consentAnswered && pendingContact === m.contactDetected && (
                <div className="ml-10 space-y-3 rounded-xl border border-gold/40 bg-bg-soft p-4">
                  <p className="text-sm leading-relaxed text-ink-mid">{t("consent_prompt")}</p>
                  <Link
                    href="/legal/rgpd"
                    target="_blank"
                    className="inline-block text-xs underline decoration-gold underline-offset-2 hover:text-gold"
                  >
                    {tRgpd("policy_link")}
                  </Link>
                  {needsTurnstile && (
                    <Turnstile
                      ref={turnstileRef}
                      onToken={setTurnstileToken}
                      onUnavailable={() => setTurnstileUnavailable(true)}
                    />
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={consentBusy || (needsTurnstile && !turnstileToken)}
                      onClick={() => submitConsent("accept")}
                      className="gold-shine-bg rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-50"
                    >
                      {t("consent_accept")}
                    </button>
                    <button
                      type="button"
                      disabled={consentBusy}
                      onClick={() => submitConsent("decline")}
                      className="rounded-full border border-line px-4 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-mid transition-colors hover:border-gold hover:text-gold-text disabled:opacity-50"
                    >
                      {t("consent_decline")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {consentAnswered && consentFeedback && (
            <div className="flex items-start justify-start gap-2">
              <span className="relative mt-0.5 block size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-gold/40">
                <Image src={AVATAR_SRC} alt={t("avatar_alt")} fill unoptimized sizes="32px" className="object-cover" />
              </span>
              <div className="max-w-[85%] rounded-2xl border border-line bg-bg-soft px-4 py-2.5 text-sm leading-relaxed text-ink-mid">
                {consentFeedback === "accepted"
                  ? t("consent_accepted")
                  : consentFeedback === "declined"
                    ? t("consent_declined")
                    : t("consent_error")}
              </div>
            </div>
          )}

          {pending && (
            <div className="flex items-start justify-start gap-2">
              <span className="relative mt-0.5 block size-8 shrink-0 overflow-hidden rounded-full ring-1 ring-gold/40">
                <Image src={AVATAR_SRC} alt={t("avatar_alt")} fill unoptimized sizes="32px" className="object-cover" />
              </span>
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

        {/* Input — coussin de securite iOS (home indicator) pour ne jamais
            masquer le bouton d'envoi. */}
        <form
          onSubmit={send}
          className="flex items-center gap-2 border-t border-line bg-bg-soft px-3 py-3"
          style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("input_placeholder")}
            disabled={pending}
            className="flex-1 rounded-full border border-line bg-bg px-4 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-gold focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            aria-label={t("send_label")}
            className="gold-shine-bg inline-flex size-9 shrink-0 items-center justify-center rounded-full text-ink shadow-md shadow-gold/20 transition-transform hover:scale-105 disabled:scale-100 disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12l18-9-9 18-2-7-7-2z" />
            </svg>
          </button>
        </form>

        {/* Point 3 — plus d'email/telephone en clair, revelation au clic
            (meme composant et meme protection anti-moissonnage que le
            reste du site). Point 2 : rappel responsabilite conserve. */}
        <div className="space-y-2 border-t border-line bg-bg-soft px-4 py-2">
          <p className="text-[10px] leading-snug text-ink-soft opacity-70">
            {t("legal_disclaimer")} {t("contact_prefix")}
          </p>
          <ContactReveal variant="compact" theme="light" />
        </div>
      </div>
    </div>
  );
}

export default ChatbotPanel;
