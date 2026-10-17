"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { track, trackContactClick } from "@/lib/tracking/track";
import { advisorContactLines, revealLines } from "@/lib/contact/reveal-lines";

type Variant = "compact" | "full" | "sidebar";
type Align = "left" | "center" | "right";
type Theme = "light" | "dark";

interface ContactRevealProps {
  variant?: Variant;
  align?: Align;
  theme?: Theme;
  className?: string;
  /** Bien concerné (fiche bien / off-market) — transmis au tracking pour
   *  identifier quels biens génèrent des leads. Absent hors contexte bien. */
  propertyId?: string;
  propertyTitle?: string;
}

// Coordonnees en pieces, assemblees uniquement APRES clic, jamais en SSR :
// lib/contact/reveal-lines.ts (source unique, ordre d'affichage, test).
// Le DOM rendu cote serveur ne contient que le bouton "Nous contacter".

// Delai minimum entre mount et premier clic (anti-bot naif).
// Sprint UI-MAI : baisse de 300ms a 150ms pour limiter les faux positifs
// sur clic rapide post-hydration.
const MIN_CLICK_DELAY_MS = 150;

// Revelation partagee (oct. 2026) : la carte conseiller de la version
// imprimee n'affiche telephone et e-mail que si le visiteur les a reveles
// d'un clic sur cette page. Rien n'est ecrit dans le HTML servi.
const REVEAL_EVENT = "mapa-contact-revealed";
let revealedOnPage = false;

function announceReveal() {
  if (revealedOnPage) return;
  revealedOnPage = true;
  window.dispatchEvent(new Event(REVEAL_EVENT));
}

function subscribeReveal(onChange: () => void) {
  window.addEventListener(REVEAL_EVENT, onChange);
  return () => window.removeEventListener(REVEAL_EVENT, onChange);
}

/** Vrai des que le visiteur a clique sur "Nous contacter" dans cette page. */
export function useContactRevealed(): boolean {
  return useSyncExternalStore(subscribeReveal, () => revealedOnPage, () => false);
}

/** Coordonnees de Julien, assemblees cote client uniquement. */
export function advisorContact(): { phone: string; email: string } {
  return advisorContactLines();
}

export function ContactReveal({
  variant = "compact",
  align = "left",
  theme = "light",
  className = "",
  propertyId,
  propertyTitle,
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
    // Honeypot — un bot naif qui remplit tous les inputs sera bloque.
    if (honeypotRef.current?.value && honeypotRef.current.value.trim() !== "") {
      return false;
    }
    // Delai minimum mount -> clic.
    const elapsed = Date.now() - mountAtRef.current;
    if (elapsed < MIN_CLICK_DELAY_MS) {
      setError(t("error"));
      return false;
    }
    return true;
  }

  function trackReveal(target: string) {
    track("contact_reveal", {
      variant,
      target,
      property_id: propertyId,
      property_title: propertyTitle,
    });
  }

  function handleReveal() {
    if (!guard()) return;
    setRevealed(true);
    announceReveal();
    trackReveal("reveal");
  }

  const isDark = theme === "dark";

  // Layout container par variant.
  const containerLayout = (() => {
    switch (variant) {
      case "full":
        return "flex-col items-stretch gap-3";
      case "sidebar":
        return "flex-col items-stretch gap-2";
      case "compact":
      default:
        // Compact garde un layout colonne aussi en mode revealed pour que
        // chaque coordonnee soit lisible (vs flex-row trop serre).
        return revealed
          ? "flex-col items-stretch gap-2"
          : "flex-row flex-wrap items-center gap-2";
    }
  })();

  const alignCls = (() => {
    switch (align) {
      case "center":
        return "justify-center items-center text-center";
      case "right":
        return "justify-end items-end text-right";
      case "left":
      default:
        return "justify-start";
    }
  })();

  // Style commun aux lignes de coordonnees revelees.
  const linkBase = isDark
    ? "text-white hover:text-[#e0af6e]"
    : "text-ink hover:text-gold-deep";
  const iconColor = isDark ? "text-white/70" : "text-ink-soft";

  // Bouton initial "Nous contacter".
  const btnBase = isDark
    ? "border-white/30 text-white hover:border-[#e0af6e] hover:text-[#e0af6e]"
    : "border-line text-ink hover:border-gold-deep hover:text-gold-deep";
  const btnSize =
    variant === "compact" ? "text-[10px] px-3 py-2" : "text-[11px] px-4 py-2.5";

  return (
    <div
      className={`relative inline-flex ${containerLayout} ${alignCls} ${className}`}
    >
      {/* Honeypot — invisible pour humain, visible pour bot naif */}
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
          <PhoneIcon />
          {t("contact_button")}
        </button>
      ) : (
        // Sprint UI-MAI / OPTIM-1B C9 : affichage TEXTE des coordonnees
        // apres revelation. Les valeurs sont reconstruites cote client a
        // partir des arrays de pieces (anti-scraping SSR preserve). Chaque
        // ligne est un <a> cliquable (tel: ou mailto:) avec le numero /
        // email visible en texte.
        <>
          {/* Telephone et e-mail de Julien, second telephone (sans nom ni
              libelle), e-mail du site sous ce numero : meme ligne, meme
              mise en forme pour chaque coordonnee. */}
          {revealLines().map((line) => (
            <ContactLine
              key={line.href}
              display={line.display}
              href={line.href}
              ariaLabel={t(line.ariaKey)}
              icon={line.kind === "phone" ? <PhoneIcon /> : <MailIcon />}
              onClick={() => {
                trackReveal(line.trackTarget);
                // GA4 (oct. 2026) : clic sur le telephone, sans le numero.
                if (line.kind === "phone") trackContactClick("phone");
              }}
              linkBase={linkBase}
              iconColor={iconColor}
              variant={variant}
            />
          ))}
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

function ContactLine({
  display,
  href,
  ariaLabel,
  icon,
  onClick,
  linkBase,
  iconColor,
  variant,
}: {
  display: string;
  href: string;
  ariaLabel: string;
  icon: React.ReactNode;
  onClick: () => void;
  linkBase: string;
  iconColor: string;
  variant: Variant;
}) {
  const textSize =
    variant === "compact" ? "text-xs" : "text-sm md:text-[15px]";
  return (
    <a
      href={href}
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-2 font-mono tracking-wide transition-colors duration-200 ${linkBase} ${textSize}`}
    >
      <span className={iconColor}>{icon}</span>
      <span className="select-all">{display}</span>
    </a>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.89.7 2.78a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.11-.45c.89.33 1.82.57 2.78.7A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-3.5 shrink-0"
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
  );
}
