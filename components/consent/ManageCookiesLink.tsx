"use client";

import { reopenConsentBanner } from "@/lib/consent/store";

/**
 * Lien discret "Gérer les cookies" en pied de page — rouvre la bannière
 * de consentement (dépliée, choix actuels préremplis). Composant client
 * isolé : Footer.tsx reste un Server Component, seul ce bouton a besoin
 * d'interactivité.
 */
export function ManageCookiesLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={reopenConsentBanner}
      className="text-sm text-ink-mid transition-colors hover:text-gold"
    >
      {label}
    </button>
  );
}
