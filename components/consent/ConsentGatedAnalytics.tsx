"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { CONSENT_CHANGE_EVENT, hasStatsConsent } from "@/lib/consent/store";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

/**
 * Monte Vercel Analytics, Speed Insights, le beacon Cloudflare Insights et
 * le tag GA4 (gtag.js) UNIQUEMENT après consentement explicite de la
 * catégorie "Statistiques" (RGPD opt-in strict). Réagit en direct à
 * mapa-consent-change : accepter via "Gérer les cookies" monte les
 * scripts sans reload ; refuser les démonte immédiatement (plus aucun
 * hit GA4 envoyé après démontage, cf. GA4PageView ci-dessous).
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
      {GA4_MEASUREMENT_ID ? (
        <>
          <Script
            id="ga4-gtag-src"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){window.dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GA4_MEASUREMENT_ID}', { send_page_view: false });
            `}
          </Script>
          {/* send_page_view: false ci-dessus : le page_view initial ET les
              navigations SPA suivantes passent tous par GA4PageView, source
              unique — pas de double-comptage config-auto + manuel. */}
          <Suspense fallback={null}>
            <GA4PageView />
          </Suspense>
        </>
      ) : null}
    </>
  );
}

/**
 * Envoie un événement page_view GA4 à chaque changement de route côté
 * client (App Router = SPA après le 1er chargement, gtag.js ne voit pas
 * les navigations internes tout seul). Revérifie hasStatsConsent() à
 * chaque navigation par défense en profondeur — le démontage du parent
 * suffit déjà à arrêter les envois, mais un event tardif en vol ne doit
 * jamais passer si le consentement vient d'être retiré.
 */
function GA4PageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!hasStatsConsent()) return;
    if (typeof window.gtag !== "function") return;
    const qs = searchParams.toString();
    const page_path = qs ? `${pathname}?${qs}` : pathname;
    window.gtag("event", "page_view", {
      page_path,
      page_location: window.location.href,
      page_title: document.title,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams]);

  return null;
}
