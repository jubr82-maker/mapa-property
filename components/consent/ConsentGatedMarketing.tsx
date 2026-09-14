"use client";

import { useEffect, useState } from "react";
import { CONSENT_CHANGE_EVENT, hasMarketingConsent } from "@/lib/consent/store";

/**
 * Emplacement prêt pour les futurs scripts marketing (Meta Pixel, Google
 * Ads) — ne rend rien tant qu'aucun script n'est branché ET tant que la
 * catégorie "Marketing" n'est pas explicitement acceptée. Le gate
 * consentement est en place dès maintenant pour ne pas avoir à retoucher
 * la bannière au moment de brancher ces outils : ajouter les balises dans
 * le return ci-dessous une fois les tags fournis.
 */
export function ConsentGatedMarketing() {
  const [marketingAllowed, setMarketingAllowed] = useState(false);

  useEffect(() => {
    const sync = () => setMarketingAllowed(hasMarketingConsent());
    sync();
    window.addEventListener(CONSENT_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CONSENT_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!marketingAllowed) return null;

  // TODO : Meta Pixel / Google Ads — brancher ici une fois les tags fournis.
  return null;
}
