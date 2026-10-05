"use client";

// Capture de l'origine de la visite (oct. 2026), UNIQUEMENT apres
// consentement aux statistiques (meme regle que le suivi interne,
// lib/tracking/track.ts). Stockage de session du navigateur, efface a la
// fermeture de l'onglet ; envoye seulement avec un formulaire.
import { hasStatsConsent } from "@/lib/consent/store";
import type { Attribution } from "@/lib/pilotage/attribution";

const KEY = "mp_attribution";

export function captureAttribution(): void {
  try {
    if (!hasStatsConsent() || window.sessionStorage.getItem(KEY)) return;
    let referrerHost: string | null = null;
    if (document.referrer) {
      const host = new URL(document.referrer).hostname.toLowerCase();
      if (host && host !== window.location.hostname.toLowerCase()) referrerHost = host;
    }
    const q = new URLSearchParams(window.location.search);
    const a: Attribution = {
      referrerHost,
      utmSource: q.get("utm_source"),
      utmMedium: q.get("utm_medium"),
      utmCampaign: q.get("utm_campaign"),
    };
    window.sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    // stockage indisponible : origine inconnue
  }
}

/** Origine a joindre a un formulaire, ou null (pas de consentement). */
export function getAttribution(): Attribution | null {
  try {
    if (!hasStatsConsent()) return null;
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Attribution) : null;
  } catch {
    return null;
  }
}
