"use client";

import { useEffect, useState } from "react";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { CONSENT_CHANGE_EVENT, hasStatsConsent } from "@/lib/consent/store";

/**
 * Monte Vercel Analytics, Speed Insights et le beacon Cloudflare Insights
 * UNIQUEMENT après consentement explicite de la catégorie "Statistiques"
 * (RGPD opt-in strict). Réagit en direct à mapa-consent-change : accepter
 * via "Gérer les cookies" monte les scripts sans reload ; refuser les
 * démonte immédiatement.
 */
export function ConsentGatedAnalytics({
  cfToken,
}: {
  /** NEXT_PUBLIC_CF_ANALYTICS_TOKEN, lu côté serveur et passé en prop. */
  cfToken?: string;
}) {
  const [statsAllowed, setStatsAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setStatsAllowed(hasStatsConsent());
    sync();
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!statsAllowed) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
      {cfToken ? (
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon={`{"token": "${cfToken}"}`}
          strategy="afterInteractive"
        />
      ) : null}
    </>
  );
}
