/**
 * Client tracking helper.
 *
 * Usage :
 *   import { track } from "@/lib/tracking/track";
 *   track("cta_click", { label: "mandat_exclusif", location: "footer" });
 *
 * - Fire-and-forget : ne bloque jamais le rendu.
 * - Best-effort : si l'endpoint /api/track échoue, on log en console et on continue.
 * - Pas de tracking si user a refusé cookies (cf. `mp_cookie_consent` localStorage).
 */

"use client";

import { SESSION_COOKIE_NAME, type TrackEventPayload, type TrackingEventType } from "./types";

const CONSENT_KEY = "mp_cookie_consent";

function hasConsent(): boolean {
  if (typeof window === "undefined") return false;
  // Par défaut on autorise (opt-out) ; explicit "denied" stoppe.
  try {
    return localStorage.getItem(CONSENT_KEY) !== "denied";
  } catch {
    return true;
  }
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
  if (!hasConsent()) return;

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
