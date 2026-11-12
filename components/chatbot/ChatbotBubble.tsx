"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { derivePageContext } from "./chatbot-knowledge";

// Sprint ELENA-REFONTE point 1 — le panneau (messages, envoi, consentement)
// n'est importe qu'a partir du moment ou l'utilisateur a reellement ouvert
// la pastille : le composant dynamique n'est monte dans l'arbre que lorsque
// `hasOpenedOnce` passe a true (cf. rendu plus bas), donc son chunk JS n'est
// jamais demande a l'hydratation de la page. Seule cette bulle (petite) est
// chargee immediatement.
const ChatbotPanel = dynamic(
  () => import("./ChatbotPanel").then((m) => ({ default: m.ChatbotPanel })),
  { ssr: false, loading: () => null },
);

const AVATAR_SRC = "/elena-avatar.jpg";

const INVITE_SESSION_KEY = "elena_invite_shown";
const INVITE_DELAY_SECONDS = 30;

export function ChatbotBubble() {
  const locale = useLocale();
  const t = useTranslations("chatbot");
  const pathname = usePathname();
  const pageContext = derivePageContext(pathname);

  const [open, setOpen] = useState(false);
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const [inviteVisible, setInviteVisible] = useState(false);
  const visibleSecondsRef = useRef(0);

  const inviteKey: "invite_property" | "invite_offmarket" | null = pageContext.startsWith(
    "property:",
  )
    ? "invite_property"
    : pageContext.startsWith("offmarket:")
      ? "invite_offmarket"
      : null;

  // Point 1 — une seule invitation retardee, uniquement fiches biens et
  // off-market, jamais sur les pages legales (derivePageContext isole deja
  // "legal" — inviteKey reste null dans ce cas). 30s de PRESENCE REELLE :
  // le compteur ne progresse pas si l'onglet est en arriere-plan. Ignoree
  // ou fermee, elle ne revient plus de la visite (sessionStorage, efface a
  // la fermeture de l'onglet, plus adapte qu'un cookie multi-jours ici).
  useEffect(() => {
    if (!inviteKey) return;
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(INVITE_SESSION_KEY)) return;
    } catch {
      // Stockage indisponible (navigation privee stricte) : on retente
      // simplement sans persistance inter-navigation, sans casser l'UI.
    }

    visibleSecondsRef.current = 0;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      visibleSecondsRef.current += 1;
      if (visibleSecondsRef.current >= INVITE_DELAY_SECONDS) {
        setInviteVisible(true);
        clearInterval(interval);
        // Marque l'invitation comme montree DES son apparition, pas
        // seulement en cas de fermeture explicite : ignoree (navigation
        // sans interaction) ou fermee, elle ne doit plus jamais revenir
        // pendant cette visite (cf. commentaire ci-dessus).
        try {
          sessionStorage.setItem(INVITE_SESSION_KEY, "true");
        } catch {
          // Navigation privee stricte : sans persistance, on accepte le
          // risque residuel plutot que de casser l'UI.
        }
      }
    }, 1000);

    return () => clearInterval(interval);
    // pageContext dans les deps : le compteur repart si le visiteur navigue
    // d'une fiche bien a une autre pendant la fenetre des 30s.
  }, [inviteKey, pageContext]);

  const dismissInvite = () => {
    setInviteVisible(false);
    try {
      sessionStorage.setItem(INVITE_SESSION_KEY, "true");
    } catch {
      // Sans persistance disponible, l'invitation ne sera simplement pas
      // reproposee pendant ce cycle de composant.
    }
  };

  const openPanel = () => {
    setHasOpenedOnce(true);
    setOpen(true);
    if (inviteVisible) dismissInvite();
  };

  const acceptInvite = () => {
    dismissInvite();
    openPanel();
  };

  return (
    <>
      {inviteVisible && !open && (
        <div
          role="status"
          className="fixed bottom-24 right-5 z-50 max-w-[220px] rounded-2xl border border-gold/40 bg-bg px-4 py-3 text-sm text-ink shadow-xl shadow-ink/10 sm:bottom-28 print:hidden"
        >
          <button
            type="button"
            onClick={dismissInvite}
            aria-label={t("invite_dismiss")}
            className="absolute -right-2 -top-2 inline-flex size-6 items-center justify-center rounded-full border border-line bg-bg text-ink-mid shadow-sm hover:border-gold hover:text-gold-text"
          >
            <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <button type="button" onClick={acceptInvite} className="text-left leading-snug hover:text-gold">
            {inviteKey ? t(inviteKey) : ""}
          </button>
        </div>
      )}

      {/* Pastille discrete — jamais ouverte automatiquement (point 1). */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label="Eléna"
        aria-expanded={open}
        className={`fixed bottom-5 right-5 z-50 inline-flex size-14 items-center justify-center rounded-full shadow-xl shadow-gold/30 transition-all duration-300 hover:scale-105 sm:size-16 print:hidden ${
          open ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <span className="relative block size-14 overflow-hidden rounded-full ring-2 ring-gold/70 sm:size-16">
          <Image
            src={AVATAR_SRC}
            alt={t("avatar_alt")}
            fill
            sizes="(min-width: 640px) 64px, 56px"
            unoptimized
            className="object-cover"
            // Perf mobile (oct. 2026) : pastille du chatbot sans preload
            // (elle concurrencait l'image principale de chaque page).
            loading="eager"
            fetchPriority="low"
          />
        </span>
        <span aria-hidden className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-bg ring-2 ring-gold animate-pulse" />
      </button>

      {hasOpenedOnce && (
        <ChatbotPanel
          key={locale}
          open={open}
          onClose={() => setOpen(false)}
          pageContext={pageContext}
        />
      )}
    </>
  );
}

export default ChatbotBubble;
