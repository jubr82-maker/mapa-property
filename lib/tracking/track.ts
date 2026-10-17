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
 *   apres un envoi reussi (reponse serveur OK), avec form_type (liste
 *   fermee LEAD_FORM_TYPES, une valeur par formulaire) et page_language.
 *   contact_click part de trackContactClick() au clic sur le telephone
 *   revele, avec method seulement. Jamais de donnee personnelle.
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
 * fermee, une valeur par formulaire du site, identique partout : aucune
 * donnee personnelle, aucun titre de bien, aucun montant.
 */
export const LEAD_FORM_TYPES = [
  "contact", // page Contact
  "property_request", // fiche d'un bien : demande d'information ou de visite
  "estimation", // estimation en ligne
  "search_mandate", // mandat de recherche
  "mandate_exclusive", // mandat exclusif
  "mandate_semi_exclusive", // mandat semi-exclusif
  "mandate_simple", // mandat simple
  "mandate_autonomous", // mandat autonome
  "search_owner", // proposer son bien pour une recherche en cours
  "waitlist", // liste d'attente
  "offmarket_access", // acces a un bien off-market (accord de confidentialite)
] as const;
export type LeadFormType = (typeof LEAD_FORM_TYPES)[number];

/** Type GA4 d'un formulaire ContactForm a partir de son type interne. */
export function leadFormTypeOf(type: string): LeadFormType {
  const map: Record<string, LeadFormType> = {
    general_contact: "contact",
    property_request: "property_request",
    owner_search: "search_owner",
    search_mandate: "search_mandate",
    mandate_exclusive: "mandate_exclusive",
    mandate_semi: "mandate_semi_exclusive",
    mandate_simple: "mandate_simple",
    mandate_autonomous: "mandate_autonomous",
  };
  return map[type] ?? "contact";
}

/** Langue de la page (fr, en ou de), lue dans l'adresse. */
function pageLanguage(locale?: string): string {
  if (locale === "fr" || locale === "en" || locale === "de") return locale;
  const seg = typeof window !== "undefined" ? window.location.pathname.split("/")[1] : "";
  return seg === "en" || seg === "de" ? seg : "fr";
}

/**
 * generate_lead GA4 (evenement recommande par Google pour une demande
 * envoyee) : a appeler UNIQUEMENT apres une reponse positive du serveur.
 * Parametres : form_type et page_language, rien d'autre. Consentement
 * "Statistiques" obligatoire ; sans GA4 monte, rien.
 */
export function trackLead(formType: LeadFormType, locale?: string): void {
  if (typeof window === "undefined") return;
  if (!hasStatsConsent()) return;
  sendToGA4("generate_lead", { form_type: formType, page_language: pageLanguage(locale) });
}

/**
 * contact_click GA4 : clic sur un numero de telephone revele (lien tel:).
 * Parametre method seulement ("phone"), jamais le numero. Le site n'a pas
 * de lien WhatsApp aujourd'hui ; "whatsapp" est prevu pour le jour ou il
 * existera. Meme garde de consentement.
 */
export function trackContactClick(method: "phone" | "whatsapp", locale?: string): void {
  if (typeof window === "undefined") return;
  if (!hasStatsConsent()) return;
  sendToGA4("contact_click", { method, page_language: pageLanguage(locale) });
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
  // GA4 ne recoit que le nom de l'evenement et la langue (oct. 2026) :
  // les montants saisis (revenus, charges...) restent dans notre base.
  if (ga4EventName) sendToGA4(ga4EventName, { page_language: pageLanguage() });

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
