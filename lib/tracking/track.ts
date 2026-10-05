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
 * - GA4 : generate_lead part de trackLead(), appele par chaque formulaire
 *   apres un envoi reussi (contact, demande sur un bien, estimation,
 *   mandat, off-market, liste d'attente), avec le seul type de formulaire.
 *   Meme garde hasStatsConsent(). Silencieux si GA4 n'est pas monte (pas de
 *   NEXT_PUBLIC_GA4_MEASUREMENT_ID, cf. ConsentGatedAnalytics.tsx).
 */

"use client";

import { hasStatsConsent } from "@/lib/consent/store";
import { SESSION_COOKIE_NAME, type TrackEventPayload, type TrackingEventType } from "./types";

// Evenements GA4 hors demandes : seul simulator_submit (capacite
// d'emprunt, aucune coordonnee collectee). Les evenements d'engagement pur
// (page_view, property_view, scroll_depth_75...) ne partent jamais vers GA4.
const GA4_EVENTS: Partial<Record<TrackingEventType, string>> = {
  emprunt_simulate: "simulator_submit",
};

/**
 * Type de formulaire envoye a GA4 avec generate_lead (oct. 2026). Liste
 * fermee : aucune donnee personnelle, aucun titre de bien, aucun montant.
 */
export type LeadFormType =
  | "contact"
  | "property_request"
  | "estimation"
  | "mandate"
  | "offmarket"
  | "waitlist";

/** Type GA4 d'un formulaire ContactForm a partir de son type interne. */
export function leadFormTypeOf(type: string): LeadFormType {
  if (type.startsWith("mandate_") || type === "search_mandate") return "mandate";
  if (type === "property_request") return "property_request";
  return "contact";
}

/**
 * generate_lead GA4 (evenement recommande par Google pour une demande
 * envoyee) : a appeler UNIQUEMENT apres une reponse positive du serveur.
 * Consentement "Statistiques" obligatoire ; sans GA4 monte, rien.
 */
export function trackLead(formType: LeadFormType): void {
  if (typeof window === "undefined") return;
  if (!hasStatsConsent()) return;
  sendToGA4("generate_lead", { form_type: formType });
}

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

  const ga4EventName = GA4_EVENTS[eventType];
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
