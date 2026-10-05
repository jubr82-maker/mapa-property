"use client";

// Enregistre l'origine de la visite des l'arrivee sur le site, si le
// visiteur a accepte les statistiques (cf. lib/pilotage/attribution-client).
import { useEffect } from "react";
import { captureAttribution } from "@/lib/pilotage/attribution-client";
import { CONSENT_CHANGE_EVENT } from "@/lib/consent/store";

export function AttributionCapture() {
  useEffect(() => {
    captureAttribution();
    const onConsent = () => captureAttribution();
    window.addEventListener(CONSENT_CHANGE_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, onConsent);
  }, []);
  return null;
}
