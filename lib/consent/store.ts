"use client";

import { CONSENT_STORAGE_KEY, CONSENT_VERSION } from "@/lib/consent/decided-script";

/**
 * Store de consentement cookies — opt-in strict (RGPD).
 * Pattern calqué sur lib/use-favorites.ts (localStorage + CustomEvent pour
 * synchroniser les composants sans prop-drilling).
 *
 * 3 catégories : necessary (toujours true, non stocké — implicite), stats
 * (tracking_events, Vercel Analytics, GA4 à venir), marketing (Meta Pixel,
 * Google Ads à venir — pas encore de script monté, mais le gate existe déjà).
 *
 * Tant qu'aucune décision n'est stockée, hasStatsConsent()/hasMarketingConsent()
 * renvoient false : rien ne se déclenche avant un choix explicite.
 */

export interface ConsentState {
  stats: boolean;
  marketing: boolean;
  timestamp: string;
  version: number;
}

const KEY = CONSENT_STORAGE_KEY;
const CHANGE_EVENT = "mapa-consent-change";
const REOPEN_EVENT = "mapa-consent-reopen";
const VERSION = CONSENT_VERSION;

function read(): ConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof parsed.stats === "boolean" &&
      typeof parsed.marketing === "boolean" &&
      parsed.version === VERSION
    ) {
      return parsed as ConsentState;
    }
    return null;
  } catch {
    return null;
  }
}

function write(choices: { stats: boolean; marketing: boolean }): void {
  if (typeof window === "undefined") return;
  const state: ConsentState = {
    stats: choices.stats,
    marketing: choices.marketing,
    timestamp: new Date().toISOString(),
    version: VERSION,
  };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // localStorage indisponible (navigation privée stricte, etc.) — le choix
    // ne sera pas mémorisé, mais on ne casse jamais l'UX.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getConsent(): ConsentState | null {
  return read();
}

export function hasConsentDecision(): boolean {
  return read() !== null;
}

export function hasStatsConsent(): boolean {
  return read()?.stats === true;
}

export function hasMarketingConsent(): boolean {
  return read()?.marketing === true;
}

export function acceptAll(): void {
  write({ stats: true, marketing: true });
}

export function rejectAll(): void {
  write({ stats: false, marketing: false });
}

export function saveChoices(choices: { stats: boolean; marketing: boolean }): void {
  write(choices);
}

/** Rouvre la bannière (déclenché par le lien "Gérer les cookies" en footer). */
export function reopenConsentBanner(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(REOPEN_EVENT));
}

export const CONSENT_CHANGE_EVENT = CHANGE_EVENT;
export const CONSENT_REOPEN_EVENT = REOPEN_EVENT;
