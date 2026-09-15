/**
 * Client tracking helper.
 *
 * Usage :
 *   import { track } from "@/lib/tracking/track";
 *   track("cta_click", { label: "mandat_exclusif", location: "footer" });
 *
 * - Fire-and-forget : ne bloque jamais le rendu.
 * - Best-effort : si l'endpoint /api/track échoue, on log en console et on continue.
 * - Opt-in strict (RGPD) : aucun événement n'est envoyé tant que le visiteur
 *   n'a pas explicitement accepté la catégorie "Statistiques" via la
 *   bannière cookies (cf. lib/consent/store.ts). Pas de décision ⇒ pas de
 *   tracking, jamais d'opt-out implicite.
 * - Les événements "lead" (cf. GA4_LEAD_EVENTS) sont AUSSI forwardés à GA4
 *   (gtag) en plus de /api/track — même garde hasStatsConsent(), pas de
 *   logique de consentement dupliquée. Silencieux si GA4 n'est pas monté
 *   (pas de NEXT_PUBLIC_GA4_MEASUREMENT_ID, cf. ConsentGatedAnalytics.tsx).
 */

"use client";

import { hasStatsConsent } from "@/lib/consent/store";
import { SESSION_COOKIE_NAME, type TrackEventPayload, type TrackingEventType } from "./types";

// Correspondance events internes -> conversions GA4. Seuls les types listés
// ici partent vers GA4 (les événements d'engagement pur — page_view,
// property_view, scroll_depth_75, sibling_carousel_*, etc. — n'y figurent
// pas volontairement, pour ne pas polluer les conversions). generate_lead
// = nom d'événement GA4 recommandé pour toute action avec collecte de
// coordonnées. simulator_submit = nom distinct pour la capacité d'emprunt,
// qui ne collecte aucune coordonnée (pas un vrai lead au sens GA4).
const GA4_LEAD_EVENTS: Partial<Record<TrackingEventType, string>> = {
  form_submit: "generate_lead",
  estimation_compute: "generate_lead",
  contact_reveal: "generate_lead",
  emprunt_simulate: "simulator_submit",
};

function sendToGA4(gaEventName: string, eventData?: Record<string, unknown>): void {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", gaEventName, eventData ?? {});
}

function getOrCreateSessionId(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(new RegExp(`(?:^|; )${SESSION_COOKIE_NAME}=([^;]+)`));
  if (match) return match[1];
  // Crée un nouveau session_id
  const sid = crypto.randomUUID();
  const days = 90;
  const expires = new Date(Date.now() + days * 86400 * 1000).toUTCString();
  document.cookie = `${SESSION_COOKIE_NAME}=${sid}; expires=${expires}; path=/; SameSite=Lax`;
  return sid;
}

/**
 * Track un événement utilisateur.
 * Non-bloquant : retourne immédiatement (le POST tourne en arrière-plan).
 */
export function track(
  eventType: TrackingEventType,
  eventData?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (!hasStatsConsent()) return;

  const ga4EventName = GA4_LEAD_EVENTS[eventType];
  if (ga4EventName) sendToGA4(ga4EventName, eventData);

  const sessionId = getOrCreateSessionId();
  const payload: TrackEventPayload & { session_id: string } = {
    session_id: sessionId,
    event_type: eventType,
    event_data: eventData,
    page: window.location.pathname + window.location.search,
    referrer: document.referrer || undefined,
    locale: document.documentElement.lang || undefined,
  };

  // Fire-and-forget avec keepalive : survit même si l'user navigue ailleurs.
  fetch("/api/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Best-effort : ne pas casser l'UX sur échec tracking.
  });
}

/** Hook pratique pour use dans composants. */
export function useTrack() {
  return { track };
}
