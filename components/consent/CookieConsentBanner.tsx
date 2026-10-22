"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  acceptAll,
  CONSENT_REOPEN_EVENT,
  getConsent,
  hasConsentDecision,
  rejectAll,
  saveChoices,
} from "@/lib/consent/store";

/**
 * Bannière de consentement cookies (RGPD, opt-in strict).
 *
 * - 1ère visite (aucune décision stockée) : bandeau bloquant, non
 *   fermable sans choix (pas d'Échap/clic extérieur).
 * - Réouverture via "Gérer les cookies" (footer, événement
 *   mapa-consent-reopen) : préremplit les choix existants, fermable
 *   (Échap/clic extérieur) puisqu'une décision existe déjà.
 */
// Perf mobile (oct. 2026) : la banniere est rendue dans le HTML servi
// (visible par defaut, comme pour une premiere visite) au lieu d'apparaitre
// apres le chargement du JavaScript. Elle s'affiche donc des le premier
// rendu, au lieu de devenir l'element le plus tardif de la page sur
// telephone. Un visiteur ayant deja choisi ne la voit pas : un script
// avant l'affichage pose la classe "consent-decided" sur <html>
// (lib/consent/decided-script.ts, app/[locale]/layout.tsx), qui la masque en CSS,
// puis le composant la retire a l'hydratation.
export function CookieConsentBanner() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = useState(true);
  const [dismissable, setDismissable] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (hasConsentDecision()) setVisible(false);
    // La classe d'avant affichage n'est plus utile une fois hydrate ; la
    // retirer permet de rouvrir la banniere ("Gerer les cookies").
    document.documentElement.classList.remove("consent-decided");

    const reopen = () => {
      const current = getConsent();
      setStats(current?.stats ?? false);
      setMarketing(current?.marketing ?? false);
      setExpanded(true);
      setDismissable(hasConsentDecision());
      setVisible(true);
    };
    window.addEventListener(CONSENT_REOPEN_EVENT, reopen);
    return () => window.removeEventListener(CONSENT_REOPEN_EVENT, reopen);
  }, []);

  useEffect(() => {
    if (!visible || !dismissable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setVisible(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [visible, dismissable]);

  if (!visible) return null;

  const close = () => setVisible(false);
  const onAcceptAll = () => {
    acceptAll();
    close();
  };
  const onRejectAll = () => {
    rejectAll();
    close();
  };
  const onSave = () => {
    saveChoices({ stats, marketing });
    close();
  };

  return (
    <div data-consent-banner className="fixed inset-0 z-[9997] flex items-end justify-center">
      <div
        className="absolute inset-0 bg-bg-contrast/25"
        aria-hidden="true"
        onClick={dismissable ? close : undefined}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-consent-title"
        className="relative z-[9998] mb-4 w-full max-w-3xl px-4 sm:mb-6 sm:px-6"
      >
        <div className="rounded-2xl border border-line bg-bg shadow-2xl">
          <div className="p-6 sm:p-8">
            <p
              id="cookie-consent-title"
              className="font-mono text-[11px] uppercase tracking-[0.3em] text-gold"
            >
              {t("eyebrow")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-ink-mid">
              {t("description")}{" "}
              <Link
                href="/legal/rgpd"
                className="underline decoration-gold underline-offset-2 hover:text-gold"
              >
                {t("privacy_link")}
              </Link>
            </p>

            {expanded && (
              <div className="mt-6 space-y-4 border-t border-line pt-6">
                <CategoryRow
                  title={t("necessary_title")}
                  description={t("necessary_description")}
                  checked
                  disabled
                />
                <CategoryRow
                  title={t("stats_title")}
                  description={t("stats_description")}
                  checked={stats}
                  onChange={setStats}
                />
                <CategoryRow
                  title={t("marketing_title")}
                  description={t("marketing_description")}
                  checked={marketing}
                  onChange={setMarketing}
                />
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {expanded ? (
                <button
                  type="button"
                  onClick={onSave}
                  className="rounded-full bg-gold px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-bg-contrast transition-opacity hover:opacity-90"
                >
                  {t("save")}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onAcceptAll}
                    className="rounded-full bg-gold px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-bg-contrast transition-opacity hover:opacity-90"
                  >
                    {t("accept_all")}
                  </button>
                  <button
                    type="button"
                    onClick={onRejectAll}
                    className="rounded-full border border-line px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-ink transition-colors hover:border-gold hover:text-gold"
                  >
                    {t("reject_all")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="font-mono text-xs uppercase tracking-[0.2em] text-ink-mid underline decoration-line underline-offset-4 transition-colors hover:text-gold"
                  >
                    {t("customize")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryRow({
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-ink-mid">{description}</p>
      </div>
      <Toggle checked={checked} disabled={disabled} onChange={onChange} />
    </div>
  );
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-gold" : "bg-line"
      } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
    >
      <span
        aria-hidden
        className={`inline-block size-4 transform rounded-full bg-bg shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

